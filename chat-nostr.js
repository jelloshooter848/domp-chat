// Nostr-only Chat Implementation
let isNostrEnabled = false;
let activeBackend = 'local'; // 'nostr' or 'local'
let backendsInitialized = false;

// Initialize Nostr
async function initializeBackends() {
    if (window.nostrClient) {
        try {
            console.log("Attempting to connect to Nostr...");
            const nostrSuccess = await window.nostrClient.initialize();
            if (nostrSuccess) {
                isNostrEnabled = true;
                activeBackend = 'nostr';
                console.log("Nostr connected successfully!");
                backendsInitialized = true;
                return;
            }
        } catch (error) {
            console.log("Nostr connection failed:", error);
        }
    }

    // Fallback to local mode only
    console.log("Running in local mode");
    activeBackend = 'local';
    backendsInitialized = true;
}

// Initialize backends when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎬 Page loaded, starting initialization...');
    console.log('🔍 Checking for NostrTools:', typeof window.NostrTools);
    console.log('🔍 Checking for nostrClient:', typeof window.nostrClient);
    
    const statusEl = document.getElementById('initStatus');
    if (statusEl) {
        statusEl.innerHTML = '🔄 Testing Nostr relays...';
    }
    
    await initializeBackends();
    
    if (statusEl) {
        let statusIcon = '';
        let statusText = '';
        let bgColor = '';
        
        switch(activeBackend) {
            case 'nostr':
                statusIcon = '✅';
                statusText = 'Nostr connected successfully!';
                bgColor = '#4caf50';
                break;
            case 'local':
                statusIcon = '⚠️';
                statusText = 'Nostr failed - using local mode';
                bgColor = '#ff9800';
                break;
        }
        
        statusEl.innerHTML = `${statusIcon} ${statusText}`;
        statusEl.style.background = bgColor;
        statusEl.style.color = 'white';
        
        // Hide after 3 seconds
        setTimeout(() => {
            if (statusEl) statusEl.style.display = 'none';
        }, 3000);
    }
});

let username = '';
let messages = {};
let currentRoom = 'general';
let isPrivateChat = false;
let privateChatFriend = '';
let currentUsernames = [];

let rooms = {
    general: '🏠 General',
    games: '🎮 Games',
    homework: '📚 Homework',
    sports: '⚽ Sports',
    music: '🎵 Music',
    movies: '🎬 Movies'
};

let isTemporarySession = false;
let isAdmin = false;
const ADMIN_USERNAME = 'admin';
const ADMIN_PIN = '1234';

// Nostr subscriptions
let nostrSubscriptions = {
    roomSubscriptions: {},
    privateSubscription: null,
    presenceSubscription: null
};

function updateBackendStatus() {
    const chatTitle = document.querySelector('.chat-title');
    if (chatTitle) {
        let statusIcon = '';
        let statusText = '';
        
        switch(activeBackend) {
            case 'nostr':
                statusIcon = '🟢';
                statusText = 'Nostr';
                break;
            case 'local':
                statusIcon = '🔴';
                statusText = 'Local';
                break;
        }
        
        chatTitle.innerHTML = `🗨️ Friend Chat App <span style="font-size: 0.8em; color: #666;">(${statusIcon} ${statusText})</span>`;
    }
}

async function startChat(isAutoLogin = false, isTemporary = false) {
    // Wait for backends to initialize if they haven't already
    if (!backendsInitialized) {
        if (!isAutoLogin) {
            showConnectionStatus("Connecting to Nostr network...");
        }
        console.log("Waiting for backend initialization...");
        await initializeBackends();
        if (!isAutoLogin) {
            showConnectionStatus(`Connected via ${activeBackend.toUpperCase()}`);
            setTimeout(() => hideConnectionStatus(), 2000);
        }
    }
    
    const usernameInput = document.getElementById('usernameInput');
    const pinInput = document.getElementById('pinInput');
    
    username = usernameInput.value.trim();
    const pin = pinInput.value.trim();
    isTemporarySession = isTemporary;
    
    if (username === '') {
        if (!isAutoLogin) {
            alert('Please enter your name! 😊');
        }
        return;
    }
    
    // Simple username validation
    if (username.toLowerCase() === ADMIN_USERNAME && pin === ADMIN_PIN) {
        isAdmin = true;
    }
    
    setupMessageListeners();
    updateBackendStatus();
    completeSetup();
}

function setupMessageListeners() {
    if (activeBackend === 'nostr' && isNostrEnabled) {
        setupNostrListeners();
    }
    // Local mode doesn't need listeners
}

function setupNostrListeners() {
    // Clean up existing subscriptions
    cleanupNostrListeners();
    
    // Subscribe to current room messages
    Object.keys(rooms).forEach(roomName => {
        const subId = window.nostrClient.subscribeToRoom(roomName, (messageData, event) => {
            if (currentRoom === roomName && !isPrivateChat) {
                // Don't display our own messages twice
                if (messageData.username !== username) {
                    displayMessage(messageData, false);
                }
            }
        });
        nostrSubscriptions.roomSubscriptions[roomName] = subId;
    });
    
    // Subscribe to private messages
    nostrSubscriptions.privateSubscription = window.nostrClient.subscribeToPrivateMessages((messageData, event) => {
        if (isPrivateChat && privateChatFriend === messageData.from) {
            displayMessage({
                text: messageData.text,
                username: messageData.from,
                timestamp: messageData.timestamp,
                id: messageData.id
            }, false);
        }
    });
}

function cleanupNostrListeners() {
    // Clean up room subscriptions
    Object.values(nostrSubscriptions.roomSubscriptions).forEach(subId => {
        if (subId) {
            window.nostrClient.unsubscribe(subId);
        }
    });
    nostrSubscriptions.roomSubscriptions = {};
    
    // Clean up private message subscription
    if (nostrSubscriptions.privateSubscription) {
        window.nostrClient.unsubscribe(nostrSubscriptions.privateSubscription);
        nostrSubscriptions.privateSubscription = null;
    }
}

function completeSetup() {
    localStorage.setItem('chatUsername', username);
    
    const setupDiv = document.getElementById('setup');
    const chatArea = document.getElementById('chatArea');
    
    setupDiv.classList.add('hidden');
    chatArea.classList.remove('hidden');
    
    document.getElementById('messageInput').focus();
    
    if (isAdmin) {
        document.getElementById('adminBtn').classList.remove('hidden');
    }
    
    // Show welcome message
    displayMessage({
        text: `Welcome ${username}! You're now connected via ${activeBackend.toUpperCase()}.`,
        username: 'System',
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        id: Date.now()
    }, false);
    
    selectRoom('general');
    loadRoomMessages('general');
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();
    
    if (messageText === '') {
        return;
    }
    
    const message = {
        text: messageText,
        username: username,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        id: Date.now()
    };
    
    if (activeBackend === 'nostr' && isNostrEnabled) {
        try {
            if (isPrivateChat) {
                // Private messages not fully implemented yet
                displayMessage(message, true);
                console.log('Nostr private messages need recipient pubkey implementation');
            } else {
                // Send public message via Nostr
                await window.nostrClient.sendMessage(currentRoom, messageText, username);
                // Don't display here, let the subscription handle it
            }
        } catch (error) {
            console.error('Failed to send via Nostr:', error);
            // Fallback to local display
            displayMessage(message, true);
        }
    } else {
        // Local mode
        const chatKey = isPrivateChat ? `private_${privateChatFriend}` : currentRoom;
        
        if (!messages[chatKey]) {
            messages[chatKey] = [];
        }
        messages[chatKey].push(message);
        saveMessages();
        displayMessage(message, true);
    }
    messageInput.value = '';
    messageInput.focus();
}

function displayMessage(message, isSent = false) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    
    const messageContent = document.createElement('div');
    messageContent.textContent = message.text;
    
    const messageInfo = document.createElement('div');
    messageInfo.className = 'message-info';
    messageInfo.textContent = `${message.username} • ${message.timestamp}`;
    
    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(messageInfo);
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function selectRoom(roomName) {
    if (isPrivateChat) {
        isPrivateChat = false;
        document.getElementById('backToRooms').classList.add('hidden');
        document.getElementById('roomSelector').classList.remove('hidden');
    }
    
    currentRoom = roomName;
    
    // Update room button states
    document.querySelectorAll('.room-button').forEach(button => {
        button.classList.remove('active');
        if (button.dataset.room === roomName) {
            button.classList.add('active');
        }
    });
    
    // Update current room display
    document.getElementById('currentRoomDisplay').textContent = rooms[roomName] || roomName;
    
    // Clear messages and load room messages
    document.getElementById('messages').innerHTML = '';
    loadRoomMessages(roomName);
}

function loadRoomMessages(roomName) {
    // In local mode, load from localStorage
    if (activeBackend === 'local') {
        const savedMessages = messages[roomName] || [];
        savedMessages.forEach(message => {
            displayMessage(message, message.username === username);
        });
    }
    // In Nostr mode, messages come through subscriptions
}

function saveMessages() {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
}

function loadMessages() {
    const saved = localStorage.getItem('chatMessages');
    if (saved) {
        messages = JSON.parse(saved);
    }
}

function showConnectionStatus(message) {
    // Create or update connection status element
    let statusEl = document.getElementById('connectionStatus');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'connectionStatus';
        statusEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(74, 144, 226, 0.95);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 1000;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        document.body.appendChild(statusEl);
    }
    
    statusEl.innerHTML = `
        <div style="
            width: 20px;
            height: 20px;
            border: 2px solid white;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        "></div>
        ${message}
    `;
    
    // Add spinner animation if not already added
    if (!document.getElementById('spinnerStyle')) {
        const style = document.createElement('style');
        style.id = 'spinnerStyle';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    statusEl.style.display = 'flex';
}

function hideConnectionStatus() {
    const statusEl = document.getElementById('connectionStatus');
    if (statusEl) {
        statusEl.style.display = 'none';
    }
}

async function startTempChat() {
    await startChat(false, true);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadMessages();
    
    document.getElementById('startChat').addEventListener('click', async () => await startChat());
    document.getElementById('tempChat').addEventListener('click', async () => await startTempChat());
    document.getElementById('sendButton').addEventListener('click', sendMessage);
    
    document.getElementById('usernameInput').addEventListener('keypress', async function(e) {
        if (e.key === 'Enter') {
            await startChat();
        }
    });
    
    document.getElementById('pinInput').addEventListener('keypress', async function(e) {
        if (e.key === 'Enter') {
            await startChat();
        }
    });
    
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Room selection
    document.querySelectorAll('.room-button').forEach(button => {
        button.addEventListener('click', () => {
            selectRoom(button.dataset.room);
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        cleanupNostrListeners();
        localStorage.removeItem('chatUsername');
        location.reload();
    });
});