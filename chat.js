// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcgpC6uXs6SzvPQ0-LQG3Ko75vfdgJRas",
  authDomain: "friend-chat-app-105d6.firebaseapp.com",
  databaseURL: "https://friend-chat-app-105d6-default-rtdb.firebaseio.com",
  projectId: "friend-chat-app-105d6",
  storageBucket: "friend-chat-app-105d6.firebasestorage.app",
  messagingSenderId: "749608456867",
  appId: "1:749608456867:web:5c84e879670118880f6516"
};

// Initialize Nostr and Firebase
let database = null;
let isFirebaseEnabled = false;
let isNostrEnabled = false;
let activeBackend = 'local'; // 'nostr', 'firebase', or 'local'

// Try to initialize Nostr first
async function initializeBackends() {
    // Try Nostr first
    if (window.nostrClient) {
        try {
            const nostrSuccess = await window.nostrClient.initialize();
            if (nostrSuccess) {
                isNostrEnabled = true;
                activeBackend = 'nostr';
                console.log("Nostr connected successfully!");
                return;
            }
        } catch (error) {
            console.log("Nostr connection failed:", error);
        }
    }

    // Fallback to Firebase
    try {
        if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            isFirebaseEnabled = true;
            activeBackend = 'firebase';
            console.log("Firebase connected successfully!");
        } else {
            console.log("Firebase not configured - running in local mode");
            activeBackend = 'local';
        }
    } catch (error) {
        console.log("Firebase connection failed - running in local mode:", error);
        activeBackend = 'local';
    }
}

// Initialize backends when page loads
document.addEventListener('DOMContentLoaded', initializeBackends);

let username = '';
let messages = {};
let currentRoom = 'general';
let isPrivateChat = false;
let privateChatFriend = '';
let currentUsernames = [];
let userPresenceRef = null;

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


// Session management
const SESSION_EXPIRY_DAYS = 7;
let currentSessionToken = null;

// Firebase listener management
let firebaseListeners = {
    messageListeners: {},
    privateMessageListener: null,
    requestListener: null,
    userListener: null
};

function startChat(isAutoLogin = false, isTemporary = false) {
    const usernameInput = document.getElementById('usernameInput');
    const pinInput = document.getElementById('pinInput');
    const setupDiv = document.getElementById('setup');
    const chatArea = document.getElementById('chatArea');
    
    username = usernameInput.value.trim();
    const pin = pinInput.value.trim();
    isTemporarySession = isTemporary;
    
    if (username === '') {
        if (!isAutoLogin) {
            alert('Please enter your name! 😊');
        }
        return;
    }
    
    // Handle different button behaviors
    if (isTemporary) {
        // Check if temporary sessions are allowed
        if (typeof areTemporarySessionsAllowed === 'function' && !areTemporarySessionsAllowed()) {
            alert('Temporary sessions are currently disabled. Please enter a PIN to login or register.');
            return;
        }
        
        // "Skip PIN - Temporary Session" button - ignore PIN field completely
        if (isFirebaseEnabled) {
            checkUsernameAndJoin(isAutoLogin, '', true); // Empty PIN, force temporary
        } else {
            localUsernameCheck(isAutoLogin, '', true); // Empty PIN, force temporary
        }
    } else {
        // "Start Chatting" button - require PIN
        if (!pin && !isAutoLogin) {
            alert('Please enter a PIN to login or register! 🔐');
            return;
        }
        
        // Validate PIN if provided
        if (pin && !validatePIN(pin)) {
            alert('PIN must be 4-6 digits (numbers only)! 🔢');
            return;
        }
        
        if (isFirebaseEnabled) {
            checkUsernameAndJoin(isAutoLogin, pin);
        } else {
            localUsernameCheck(isAutoLogin, pin);
        }
    }
}

function validatePIN(pin) {
    return /^\d{4,6}$/.test(pin);
}

function checkAdminCredentials(username, pin) {
    return username.toLowerCase() === ADMIN_USERNAME && pin === ADMIN_PIN;
}

// Session token management
function generateSessionToken() {
    return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function generateAndStoreSessionToken() {
    currentSessionToken = generateSessionToken();
    const sessionData = {
        token: currentSessionToken,
        username: username,
        created: Date.now(),
        isAdmin: isAdmin
    };
    
    try {
        localStorage.setItem('chatSession', JSON.stringify(sessionData));
        console.log('Session token generated and stored');
    } catch (e) {
        console.log('Cannot store session token');
    }
}

function getStoredSession() {
    try {
        const stored = localStorage.getItem('chatSession');
        if (stored) {
            const sessionData = JSON.parse(stored);
            const expiryTime = sessionData.created + (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
            
            if (Date.now() < expiryTime) {
                return sessionData;
            } else {
                // Session expired, remove it
                localStorage.removeItem('chatSession');
                console.log('Session expired and removed');
            }
        }
    } catch (e) {
        console.log('Cannot load session token');
        localStorage.removeItem('chatSession');
    }
    return null;
}

function clearSession() {
    currentSessionToken = null;
    localStorage.removeItem('chatSession');
    console.log('Session cleared');
}

function startTempChat() {
    startChat(false, true);
}

function localUsernameCheck(isAutoLogin = false, pin = '', forceTemporary = false) {
    loadCurrentUsernames();
    loadRegisteredUsers();
    
    const registeredUsers = getRegisteredUsers();
    const isRegistered = registeredUsers[username.toLowerCase()];
    
    if (forceTemporary) {
        // "Skip PIN" button - force temporary session regardless of PIN field
        if (isRegistered) {
            // Check if the registered user is banned
            if (isRegistered.banned) {
                alert(`❌ Username "${username}" belongs to a banned account. Please choose a different name.`);
                return;
            }
            alert(`❌ Username "${username}" is registered and cannot be used for temporary sessions.\nPlease choose a different name or login with your PIN.`);
            return;
        }
        
        // Check if temporary sessions are allowed
        if (typeof areTemporarySessionsAllowed === 'function' && !areTemporarySessionsAllowed()) {
            alert(`🚫 Temporary sessions are currently disabled.\nPlease register with a PIN to access the chat.`);
            return;
        }
        
        if (currentUsernames.includes(username.toLowerCase())) {
            if (isAutoLogin) {
                localStorage.removeItem('chatUsername');
                showNotification(`Username "${username}" is taken. Please choose a different name.`, 'error');
                return;
            } else {
                alert(`Sorry, "${username}" is currently in use. Please try a different name. 😔`);
                return;
            }
        }
        
        // Temporary session allowed
        currentUsernames.push(username.toLowerCase());
        saveCurrentUsernames();
        completeSetup();
    } else if (pin) {
        // User provided PIN - trying to login with registered account
        if (isRegistered) {
            // Check if user is banned
            if (isRegistered.banned) {
                const bannedDate = isRegistered.bannedDate ? new Date(isRegistered.bannedDate).toLocaleDateString() : 'unknown date';
                alert(`❌ Account "${username}" is banned.\nBanned on: ${bannedDate}\nBanned by: ${isRegistered.bannedBy || 'admin'}\n\nContact an administrator if you believe this is an error.`);
                return;
            }
            
            if (isRegistered.pin === pin) {
                // Correct PIN for registered user
                if (checkAdminCredentials(username, pin)) {
                    isAdmin = true;
                }
                generateAndStoreSessionToken();
                completeSetup();
                return;
            } else {
                alert(`Incorrect PIN for "${username}". Please try again. 🔐`);
                return;
            }
        } else {
            // New registration
            if (currentUsernames.includes(username.toLowerCase())) {
                alert(`Sorry, "${username}" is currently in use. Please try a different name. 😔`);
                return;
            }
            
            if (confirm(`Register "${username}" permanently with PIN ${pin}? You'll be able to use this name on any device! 🔐`)) {
                if (checkAdminCredentials(username, pin)) {
                    isAdmin = true;
                }
                registerUser(username, pin);
                generateAndStoreSessionToken();
                completeSetup();
                return;
            } else {
                return;
            }
        }
    }
}

function checkUsernameAndJoin(isAutoLogin = false, pin = '', forceTemporary = false) {
    // Check both online users and registered users
    Promise.all([
        database.ref('users').once('value'),
        database.ref('registeredUsers').once('value')
    ]).then(([usersSnapshot, registeredSnapshot]) => {
        const users = usersSnapshot.val() || {};
        const registeredUsers = registeredSnapshot.val() || {};
        const currentUsernames = Object.values(users).map(user => user.username.toLowerCase());
        const isRegistered = registeredUsers[username.toLowerCase()];
        
        if (forceTemporary) {
            // "Skip PIN" button - force temporary session regardless of PIN field
            if (isRegistered) {
                // Check if the registered user is banned
                if (isRegistered.banned) {
                    alert(`❌ Username "${username}" belongs to a banned account. Please choose a different name.`);
                    return;
                }
                alert(`❌ Username "${username}" is registered and cannot be used for temporary sessions.\nPlease choose a different name or login with your PIN.`);
                return;
            }
            
            // Check if temporary sessions are allowed
            if (typeof areTemporarySessionsAllowed === 'function' && !areTemporarySessionsAllowed()) {
                alert(`🚫 Temporary sessions are currently disabled.\nPlease register with a PIN to access the chat.`);
                return;
            }
            
            if (currentUsernames.includes(username.toLowerCase())) {
                if (isAutoLogin) {
                    localStorage.removeItem('chatUsername');
                    showNotification(`Username "${username}" is taken. Please choose a different name.`, 'error');
                    return;
                } else {
                    alert(`Sorry, "${username}" is currently in use. Please try a different name. 😔`);
                    return;
                }
            }
            
            // Temporary session allowed
            addUserToFirebase();
        } else if (pin) {
            // User provided PIN - trying to login with registered account
            if (isRegistered) {
                // Check if user is banned
                if (isRegistered.banned) {
                    const bannedDate = isRegistered.bannedDate ? new Date(isRegistered.bannedDate).toLocaleDateString() : 'unknown date';
                    alert(`❌ Account "${username}" is banned.\nBanned on: ${bannedDate}\nBanned by: ${isRegistered.bannedBy || 'admin'}\n\nContact an administrator if you believe this is an error.`);
                    return;
                }
                
                if (isRegistered.pin === pin) {
                    // Correct PIN for registered user
                    if (checkAdminCredentials(username, pin)) {
                        isAdmin = true;
                    }
                    generateAndStoreSessionToken();
                    addUserToFirebase();
                    return;
                } else {
                    alert(`Incorrect PIN for "${username}". Please try again. 🔐`);
                    return;
                }
            } else {
                // New registration
                if (currentUsernames.includes(username.toLowerCase())) {
                    alert(`Sorry, "${username}" is currently in use. Please try a different name. 😔`);
                    return;
                }
                
                if (confirm(`Register "${username}" permanently with PIN ${pin}? You'll be able to use this name on any device! 🔐`)) {
                    if (checkAdminCredentials(username, pin)) {
                        isAdmin = true;
                    }
                    registerFirebaseUser(username, pin);
                    generateAndStoreSessionToken();
                    addUserToFirebase();
                    return;
                } else {
                    return;
                }
            }
        }
    });
}

function addUserToFirebase() {
    const userId = Date.now().toString();
    userPresenceRef = database.ref(`users/${userId}`);
    userPresenceRef.set({
        username: username,
        online: true,
        isTemporary: isTemporarySession,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Remove user when they disconnect
    userPresenceRef.onDisconnect().remove();
    
    setupMessageListeners();
    updateBackendStatus();
    completeSetup();
}

function registerFirebaseUser(username, pin) {
    database.ref(`registeredUsers/${username.toLowerCase()}`).set({
        username: username,
        pin: pin,
        registeredDate: firebase.database.ServerValue.TIMESTAMP
    });
}

function ensureAdminRegistered() {
    if (!isFirebaseEnabled) return;
    
    // Check if admin is already registered
    database.ref(`registeredUsers/${ADMIN_USERNAME}`).once('value').then((snapshot) => {
        if (!snapshot.exists()) {
            // Register admin if not exists
            database.ref(`registeredUsers/${ADMIN_USERNAME}`).set({
                username: ADMIN_USERNAME,
                pin: ADMIN_PIN,
                registeredDate: firebase.database.ServerValue.TIMESTAMP,
                isAdmin: true
            });
            console.log('Admin account auto-registered in Firebase');
        }
    });
}

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
            case 'firebase':
                statusIcon = '🟡';
                statusText = 'Firebase';
                break;
            case 'local':
                statusIcon = '🔴';
                statusText = 'Local';
                break;
        }
        
        chatTitle.innerHTML = `🗨️ Friend Chat App <span style="font-size: 0.8em; color: #666;">(${statusIcon} ${statusText})</span>`;
    }
}

function completeSetup() {
    // Save username to localStorage on successful login
    localStorage.setItem('chatUsername', username);
    
    const setupDiv = document.getElementById('setup');
    const chatArea = document.getElementById('chatArea');
    
    setupDiv.classList.add('hidden');
    chatArea.classList.remove('hidden');
    
    setupRoomButtons();
    setupPrivateChat();
    // Setup admin panel if admin functions are loaded
    if (typeof setupAdminPanel === 'function') {
        setupAdminPanel();
    }
    // Update temp chat button visibility for non-admin users
    if (typeof updateTempChatButtonVisibility === 'function') {
        updateTempChatButtonVisibility();
    }
    switchRoom('general');
    
    document.getElementById('messageInput').focus();
    
    // Initialize online users list
    const savedUsername = localStorage.getItem('chatUsername');
    const isReturningUser = savedUsername === username;
    
    if (isFirebaseEnabled) {
        if (isReturningUser) {
            showNotification(`Welcome back, ${username}! 🌐`, 'success');
        } else {
            showNotification(`Connected to live chat! 🌐`, 'success');
        }
        // Firebase listener will update the list automatically
    } else {
        if (isReturningUser) {
            showNotification(`Welcome back, ${username}! 💻`, 'info');
        } else {
            showNotification(`Running in local mode 💻`, 'info');
        }
        updateOnlineUsersList({}); // Initialize local mode display
    }
}

// Unified message listeners for both Nostr and Firebase
let nostrSubscriptions = {
    roomSubscriptions: {},
    privateSubscription: null,
    presenceSubscription: null
};

function setupMessageListeners() {
    if (activeBackend === 'nostr' && isNostrEnabled) {
        setupNostrListeners();
    } else if (activeBackend === 'firebase' && isFirebaseEnabled) {
        setupFirebaseListeners();
    }
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
        // TODO: Show notification for new private messages
    });
    
    // Subscribe to presence updates
    nostrSubscriptions.presenceSubscription = window.nostrClient.subscribeToPresence((presenceData, event) => {
        // Update online users list
        updateOnlineUsersList();
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
    
    // Clean up presence subscription
    if (nostrSubscriptions.presenceSubscription) {
        window.nostrClient.unsubscribe(nostrSubscriptions.presenceSubscription);
        nostrSubscriptions.presenceSubscription = null;
    }
}

function setupFirebaseListeners() {
    if (!isFirebaseEnabled) return;
    
    // Clean up any existing listeners first
    cleanupFirebaseListeners();
    
    // Ensure admin is registered in Firebase
    ensureAdminRegistered();
    
    // Listen for new messages in all rooms
    Object.keys(rooms).forEach(roomName => {
        const messageRef = database.ref(`messages/${roomName}`);
        const listener = messageRef.on('child_added', (snapshot) => {
            const message = snapshot.val();
            if (message && currentRoom === roomName && !isPrivateChat) {
                displayMessage(message, message.username === username);
            }
        });
        // Store listener reference for cleanup
        firebaseListeners.messageListeners[roomName] = { ref: messageRef, listener: listener };
    });
    
    // Listen for private messages
    const privateRef = database.ref(`privateMessages/${username}`);
    firebaseListeners.privateMessageListener = privateRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        if (message && isPrivateChat && privateChatFriend === message.from) {
            displayMessage({
                text: message.text,
                username: message.from,
                timestamp: message.timestamp
            }, false);
        }
    });
    
    // Listen for private chat requests
    const requestRef = database.ref(`requests/${username}`);
    firebaseListeners.requestListener = requestRef.on('child_added', (snapshot) => {
        const request = snapshot.val();
        if (request && request.from !== username) {
            showFirebaseRequestNotification(request, snapshot.key);
        }
    });
    
    // Listen for online users changes
    const userRef = database.ref('users');
    firebaseListeners.userListener = userRef.on('value', (snapshot) => {
        updateOnlineUsersList(snapshot.val() || {});
    });
    
    // Monitor if current user gets banned (for non-temporary sessions)
    if (!isTemporarySession && username) {
        const currentUserRef = database.ref(`registeredUsers/${username.toLowerCase()}`);
        let userBanMonitoringStarted = false;
        
        firebaseListeners.userBanListener = currentUserRef.on('value', (snapshot) => {
            if (!userBanMonitoringStarted) {
                // First call - just mark that monitoring has started
                userBanMonitoringStarted = true;
                return;
            }
            
            // Only check for ban status changes (deletion of online users is now prevented)
            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (userData && userData.banned) {
                    const bannedDate = userData.bannedDate ? new Date(userData.bannedDate).toLocaleDateString() : 'unknown date';
                    console.log('Current user has been banned by admin - forcing logout');
                    alert(`⚠️ Your account has been banned by an administrator.\nBanned on: ${bannedDate}\nBanned by: ${userData.bannedBy || 'admin'}\n\nYou will be logged out.`);
                    logout();
                }
            }
        });
        firebaseListeners.currentUserRef = currentUserRef;
    }
    
    // Store references for cleanup
    firebaseListeners.privateMessageRef = privateRef;
    firebaseListeners.requestRef = requestRef;
    firebaseListeners.userRef = userRef;
}

function cleanupFirebaseListeners() {
    if (!isFirebaseEnabled) return;
    
    // Clean up message listeners for all rooms
    Object.keys(firebaseListeners.messageListeners).forEach(roomName => {
        const listener = firebaseListeners.messageListeners[roomName];
        if (listener && listener.ref) {
            listener.ref.off('child_added', listener.listener);
        }
    });
    firebaseListeners.messageListeners = {};
    
    // Clean up private message listener
    if (firebaseListeners.privateMessageRef && firebaseListeners.privateMessageListener) {
        firebaseListeners.privateMessageRef.off('child_added', firebaseListeners.privateMessageListener);
        firebaseListeners.privateMessageListener = null;
        firebaseListeners.privateMessageRef = null;
    }
    
    // Clean up request listener
    if (firebaseListeners.requestRef && firebaseListeners.requestListener) {
        firebaseListeners.requestRef.off('child_added', firebaseListeners.requestListener);
        firebaseListeners.requestListener = null;
        firebaseListeners.requestRef = null;
    }
    
    // Clean up user listener
    if (firebaseListeners.userRef && firebaseListeners.userListener) {
        firebaseListeners.userRef.off('value', firebaseListeners.userListener);
        firebaseListeners.userListener = null;
        firebaseListeners.userRef = null;
    }
    
    // Clean up user ban listener
    if (firebaseListeners.currentUserRef && firebaseListeners.userBanListener) {
        firebaseListeners.currentUserRef.off('value', firebaseListeners.userBanListener);
        firebaseListeners.userBanListener = null;
        firebaseListeners.currentUserRef = null;
    }
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
                // Send private message via Nostr
                // Note: We'd need the recipient's pubkey for private messages
                // For now, display locally
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
    } else if (activeBackend === 'firebase' && isFirebaseEnabled) {
        if (isPrivateChat) {
            // Send private message
            database.ref(`privateMessages/${privateChatFriend}`).push({
                from: username,
                text: messageText,
                timestamp: message.timestamp,
                id: message.id
            });
            // Only display for private messages since they don't come back through listeners
            displayMessage(message, true);
        } else {
            // Send public message - don't display here, let the listener handle it
            database.ref(`messages/${currentRoom}`).push(message);
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
    messageDiv.innerHTML = `
        <div>${message.text}</div>
        <div class="message-info">${message.username} • ${message.timestamp}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function saveMessages() {
    if (!isFirebaseEnabled) {
        try {
            localStorage.setItem('chatMessages', JSON.stringify(messages));
        } catch (e) {
            console.log('Cannot save messages');
        }
    }
}

function loadMessages() {
    if (!isFirebaseEnabled) {
        try {
            const savedMessages = localStorage.getItem('chatMessages');
            if (savedMessages) {
                messages = JSON.parse(savedMessages);
            }
        } catch (e) {
            console.log('Cannot load messages');
            messages = {};
        }
    }
}

function loadRoomMessages() {
    const messagesContainer = document.getElementById('messages');
    
    if (isPrivateChat) {
        messagesContainer.innerHTML = `
            <div class="message received">
                <div>Private chat with ${privateChatFriend} 💬</div>
                <div class="message-info">Chat Bot • just now</div>
            </div>
        `;
    } else {
        messagesContainer.innerHTML = `
            <div class="message received">
                <div>Welcome to ${rooms[currentRoom]}! 🎉</div>
                <div class="message-info">Chat Bot • just now</div>
            </div>
        `;
    }
    
    if (isFirebaseEnabled) {
        // Load recent messages from Firebase
        if (!isPrivateChat) {
            database.ref(`messages/${currentRoom}`).limitToLast(50).once('value', (snapshot) => {
                snapshot.forEach((childSnapshot) => {
                    const message = childSnapshot.val();
                    const isSent = message.username === username;
                    displayMessage(message, isSent);
                });
            });
        }
    } else {
        // Load from local storage
        const chatKey = isPrivateChat ? `private_${privateChatFriend}` : currentRoom;
        if (messages[chatKey]) {
            messages[chatKey].forEach(message => {
                const isSent = message.username === username;
                displayMessage(message, isSent);
            });
        }
    }
}

function switchRoom(roomName) {
    isPrivateChat = false;
    currentRoom = roomName;
    
    document.getElementById('roomSelector').classList.remove('hidden');
    document.getElementById('backToRooms').classList.add('hidden');
    
    document.querySelectorAll('.room-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelector(`[data-room="${roomName}"]`).classList.add('active');
    
    document.getElementById('currentRoomDisplay').textContent = rooms[roomName];
    
    loadRoomMessages();
}

function startPrivateChat(friendName) {
    // Check if private chat is enabled
    if (typeof isPrivateChatEnabled === 'function' && !isPrivateChatEnabled()) {
        alert('Private chat has been disabled by the administrator.');
        return;
    }
    
    isPrivateChat = true;
    privateChatFriend = friendName;
    
    document.getElementById('roomSelector').classList.add('hidden');
    document.getElementById('backToRooms').classList.remove('hidden');
    
    const displayText = `${friendName}`;
    document.getElementById('currentRoomDisplay').innerHTML = `${displayText} <span class="private-indicator">Private</span>`;
    
    loadRoomMessages();
}

function setupRoomButtons() {
    if (!isFirebaseEnabled) {
        loadMessages();
    }
    
    // Update room selector with current rooms and set up event listeners
    updateRoomSelector();
}

// Load rooms dynamically from Firebase or localStorage
function loadRooms() {
    if (isFirebaseEnabled) {
        // Load rooms from Firebase adminSettings
        database.ref('adminSettings/rooms').once('value')
            .then((snapshot) => {
                const firebaseRooms = snapshot.val();
                if (firebaseRooms) {
                    rooms = firebaseRooms;
                    updateRoomSelector();
                } else {
                    // Use hardcoded rooms - admin hasn't set custom rooms yet
                    console.log('No custom rooms in Firebase, using defaults');
                }
            })
            .catch((error) => {
                console.error('Error loading rooms from Firebase:', error);
                // Use hardcoded rooms as fallback
            });
    } else {
        // Load from localStorage
        try {
            const storedRooms = localStorage.getItem('adminRooms');
            if (storedRooms) {
                rooms = JSON.parse(storedRooms);
                updateRoomSelector();
            }
        } catch (e) {
            console.error('Error loading rooms from localStorage:', e);
            // Use hardcoded rooms as fallback
        }
    }
}

// Update the room selector UI with current rooms
function updateRoomSelector() {
    const roomSelector = document.getElementById('roomSelector');
    if (!roomSelector) return;
    
    // Clear existing room buttons
    roomSelector.innerHTML = '';
    
    // Create new room buttons based on current rooms
    // Ensure consistent ordering with "general" first
    const roomEntries = Object.entries(rooms);
    const sortedRoomEntries = roomEntries.sort(([roomIdA], [roomIdB]) => {
        // Always put "general" first
        if (roomIdA === 'general') return -1;
        if (roomIdB === 'general') return 1;
        // Then sort alphabetically
        return roomIdA.localeCompare(roomIdB);
    });
    
    sortedRoomEntries.forEach(([roomId, roomName]) => {
        const button = document.createElement('button');
        button.className = 'room-button';
        button.setAttribute('data-room', roomId);
        button.textContent = roomName;
        
        // Set first room as active if no current room is set
        if (roomId === currentRoom || (currentRoom === 'general' && roomId === sortedRoomEntries[0][0])) {
            button.classList.add('active');
            currentRoom = roomId; // Update current room if needed
        }
        
        // Add click event listener
        button.addEventListener('click', function() {
            const roomName = this.getAttribute('data-room');
            switchRoom(roomName);
        });
        
        roomSelector.appendChild(button);
    });
    
    // Update current room display
    const currentRoomDisplay = document.getElementById('currentRoomDisplay');
    if (currentRoomDisplay && rooms[currentRoom]) {
        currentRoomDisplay.textContent = rooms[currentRoom];
    }
    
    console.log('Room selector updated with rooms:', Object.keys(rooms));
}

function setupPrivateChat() {
    document.getElementById('privateChatBtn').addEventListener('click', (e) => {
        e.preventDefault();
        
        // Check if private chat is enabled
        if (typeof isPrivateChatEnabled === 'function' && !isPrivateChatEnabled()) {
            alert('Private chat has been disabled by the administrator.');
            return;
        }
        
        document.getElementById('privateRequestModal').classList.remove('hidden');
        document.getElementById('friendRequestInput').focus();
    });
    
    setupEmojiPicker();
    
    document.getElementById('sendRequest').addEventListener('click', () => {
        // Check if private chat is enabled
        if (typeof isPrivateChatEnabled === 'function' && !isPrivateChatEnabled()) {
            alert('Private chat has been disabled by the administrator.');
            document.getElementById('privateRequestModal').classList.add('hidden');
            return;
        }
        
        const friendName = document.getElementById('friendRequestInput').value.trim();
        if (friendName && friendName !== username) {
            sendPrivateRequest(friendName);
            document.getElementById('privateRequestModal').classList.add('hidden');
            document.getElementById('friendRequestInput').value = '';
        } else if (friendName === username) {
            alert("You can't chat with yourself! 😄");
        } else {
            alert('Please enter a friend\'s name! 😊');
        }
    });
    
    document.getElementById('cancelRequest').addEventListener('click', () => {
        document.getElementById('privateRequestModal').classList.add('hidden');
        document.getElementById('friendRequestInput').value = '';
    });
    
    document.getElementById('backToRooms').addEventListener('click', () => {
        switchRoom('general');
    });
    
    document.getElementById('friendRequestInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('sendRequest').click();
        }
    });
    
    // Setup online users toggle for all devices
    const onlineToggle = document.getElementById('onlineToggle');
    const onlineUsers = document.getElementById('onlineUsers');
    const closeOnline = document.getElementById('closeOnline');
    
    if (onlineToggle && onlineUsers && closeOnline) {
        // Initialize as hidden on all devices
        onlineUsers.classList.add('hidden');
        
        onlineToggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                // Mobile behavior - slide in/out
                if (onlineUsers.classList.contains('hidden')) {
                    onlineUsers.classList.remove('hidden');
                    onlineUsers.classList.add('show');
                } else {
                    onlineUsers.classList.remove('show');
                    setTimeout(() => {
                        onlineUsers.classList.add('hidden');
                    }, 300);
                }
            } else {
                // Desktop behavior - show/hide
                onlineUsers.classList.toggle('hidden');
            }
        });
        
        closeOnline.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                onlineUsers.classList.remove('show');
                setTimeout(() => {
                    onlineUsers.classList.add('hidden');
                }, 300);
            } else {
                onlineUsers.classList.add('hidden');
            }
        });
        
        // Close when clicking outside (on mobile)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                !onlineUsers.contains(e.target) && 
                !onlineToggle.contains(e.target) && 
                onlineUsers.classList.contains('show')) {
                onlineUsers.classList.remove('show');
                setTimeout(() => {
                    onlineUsers.classList.add('hidden');
                }, 300);
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                // Switch to desktop mode
                onlineUsers.classList.remove('show');
                if (!onlineUsers.classList.contains('hidden')) {
                    onlineUsers.style.display = 'flex';
                }
            } else {
                // Switch to mobile mode
                if (!onlineUsers.classList.contains('hidden')) {
                    onlineUsers.classList.remove('show');
                }
            }
        });
    }
    
    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

function logout() {
    if (confirm('Are you sure you want to logout? You\'ll need to enter your username again.')) {
        // Clear saved username and session
        localStorage.removeItem('chatUsername');
        clearSession();
        
        // Clean up Firebase listeners
        cleanupFirebaseListeners();
        
        // Release current session
        releaseUsername();
        
        // Reset to login screen
        document.getElementById('chatArea').classList.add('hidden');
        document.getElementById('setup').classList.remove('hidden');
        document.getElementById('usernameInput').value = '';
        document.getElementById('pinInput').value = '';
        document.getElementById('usernameInput').focus();
        
        // Reset variables
        username = '';
        currentRoom = 'general';
        isPrivateChat = false;
        privateChatFriend = '';
        isAdmin = false;
        isTemporarySession = false;
        currentSessionToken = null;
        
        showNotification('Logged out successfully', 'info');
    }
}

function sendPrivateRequest(friendName) {
    if (isFirebaseEnabled) {
        // Check if user exists and is online
        database.ref('users').once('value', (snapshot) => {
            const users = snapshot.val() || {};
            const userExists = Object.values(users).some(user => user.username === friendName);
            
            if (userExists) {
                database.ref(`requests/${friendName}`).push({
                    from: username,
                    timestamp: Date.now(),
                    message: `${username} wants to chat privately with you!`
                });
                showNotification(`Request sent to ${friendName}! Starting private chat... 📨`, 'success');
                
                // Automatically start private chat for the sender
                setTimeout(() => {
                    startPrivateChat(friendName);
                }, 1000);
            } else {
                showNotification(`User "${friendName}" is not online right now.`, 'error');
            }
        });
    } else {
        // Local simulation
        showNotification(`Request sent to ${friendName}! Starting private chat... 📨`, 'success');
        
        // Automatically start private chat for the sender in local mode
        setTimeout(() => {
            startPrivateChat(friendName);
        }, 1000);
        
        // Still simulate incoming request for testing
        setTimeout(() => {
            simulateIncomingRequest(friendName);
        }, 2000 + Math.random() * 3000);
    }
}

function simulateIncomingRequest(fromUser) {
    const request = {
        from: fromUser,
        to: username,
        timestamp: Date.now(),
        id: `incoming_${Date.now()}`
    };
    
    showRequestNotification(request);
}

function showRequestNotification(request) {
    const notification = document.createElement('div');
    notification.className = 'notification request';
    notification.innerHTML = `
        <div><strong>${request.from}</strong> wants to chat privately with you! 💬</div>
        <div class="notification-buttons">
            <button class="notification-btn accept" onclick="acceptRequest('${request.from}', '${request.id}')">Accept ✅</button>
            <button class="notification-btn decline" onclick="declineRequest('${request.from}', '${request.id}')">Decline ❌</button>
        </div>
    `;
    
    document.getElementById('notifications').appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 30000);
}

function showFirebaseRequestNotification(request, requestKey) {
    const notification = document.createElement('div');
    notification.className = 'notification request';
    notification.innerHTML = `
        <div><strong>${request.from}</strong> wants to chat privately with you! 💬</div>
        <div class="notification-buttons">
            <button class="notification-btn accept" onclick="acceptFirebaseRequest('${request.from}', '${requestKey}')">Accept ✅</button>
            <button class="notification-btn decline" onclick="declineFirebaseRequest('${request.from}', '${requestKey}')">Decline ❌</button>
        </div>
    `;
    
    document.getElementById('notifications').appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 30000);
}

function acceptRequest(friendName, requestId) {
    // Check if private chat is enabled
    if (typeof isPrivateChatEnabled === 'function' && !isPrivateChatEnabled()) {
        alert('Private chat has been disabled by the administrator.');
        return;
    }
    
    const notification = document.querySelector(`[onclick*="${requestId}"]`).closest('.notification');
    if (notification) {
        notification.remove();
    }
    
    showNotification(`You accepted ${friendName}'s request! Starting private chat... 🎉`, 'success');
    
    setTimeout(() => {
        startPrivateChat(friendName);
    }, 1000);
}

function acceptFirebaseRequest(friendName, requestKey) {
    // Check if private chat is enabled
    if (typeof isPrivateChatEnabled === 'function' && !isPrivateChatEnabled()) {
        alert('Private chat has been disabled by the administrator.');
        return;
    }
    
    const notification = document.querySelector(`[onclick*="${requestKey}"]`).closest('.notification');
    if (notification) {
        notification.remove();
    }
    
    // Remove the request
    database.ref(`requests/${username}/${requestKey}`).remove();
    
    showNotification(`You accepted ${friendName}'s request! Starting private chat... 🎉`, 'success');
    
    setTimeout(() => {
        startPrivateChat(friendName);
    }, 1000);
}

function declineRequest(friendName, requestId) {
    const notification = document.querySelector(`[onclick*="${requestId}"]`).closest('.notification');
    if (notification) {
        notification.remove();
    }
    
    showNotification(`You declined ${friendName}'s request.`, 'info');
}

function declineFirebaseRequest(friendName, requestKey) {
    const notification = document.querySelector(`[onclick*="${requestKey}"]`).closest('.notification');
    if (notification) {
        notification.remove();
    }
    
    // Remove the request
    database.ref(`requests/${username}/${requestKey}`).remove();
    
    showNotification(`You declined ${friendName}'s request.`, 'info');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.getElementById('notifications').appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

function updateOnlineUsersList(users) {
    const onlineUsersList = document.getElementById('onlineUsersList');
    const onlineCount = document.getElementById('onlineCount');
    const mobileOnlineCount = document.getElementById('mobileOnlineCount');
    
    if (!onlineUsersList || !onlineCount) return;
    
    const userArray = Object.values(users);
    const sortedUsers = userArray.sort((a, b) => a.username.localeCompare(b.username));
    
    onlineCount.textContent = `(${userArray.length})`;
    if (mobileOnlineCount) {
        mobileOnlineCount.textContent = userArray.length;
    }
    
    if (isFirebaseEnabled) {
        onlineUsersList.innerHTML = '';
        
        if (userArray.length === 0) {
            onlineUsersList.innerHTML = `
                <div class="online-user">
                    <div class="online-indicator" style="background: #6c757d;"></div>
                    <div class="online-username">No one online</div>
                </div>
            `;
        } else {
            sortedUsers.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.className = 'online-user';
                
                const isCurrentUser = user.username === username;
                const usernameDisplay = isCurrentUser ? `${user.username} (you)` : user.username;
                
                userDiv.innerHTML = `
                    <div class="online-indicator"></div>
                    <div class="online-username" title="${user.username}">${usernameDisplay}</div>
                `;
                
                if (isCurrentUser) {
                    userDiv.style.fontWeight = 'bold';
                    userDiv.style.color = '#4a90e2';
                }
                
                onlineUsersList.appendChild(userDiv);
            });
        }
    } else {
        // Local mode - just show current user
        onlineUsersList.innerHTML = `
            <div class="online-user">
                <div class="online-indicator"></div>
                <div class="online-username">${username || 'You'} (local)</div>
            </div>
        `;
        onlineCount.textContent = '(1)';
        if (mobileOnlineCount) {
            mobileOnlineCount.textContent = '1';
        }
    }
}

function loadCurrentUsernames() {
    if (!isFirebaseEnabled) {
        try {
            const savedUsernames = localStorage.getItem('currentUsernames');
            if (savedUsernames) {
                currentUsernames = JSON.parse(savedUsernames);
            }
        } catch (e) {
            console.log('Cannot load current usernames');
            currentUsernames = [];
        }
    }
}

function saveCurrentUsernames() {
    if (!isFirebaseEnabled) {
        try {
            localStorage.setItem('currentUsernames', JSON.stringify(currentUsernames));
        } catch (e) {
            console.log('Cannot save current usernames');
        }
    }
}

function releaseUsername() {
    // Update last seen for registered users before releasing
    updateLastSeen();
    
    if (isFirebaseEnabled && userPresenceRef) {
        userPresenceRef.remove();
        userPresenceRef = null;
    } else if (username) {
        const index = currentUsernames.indexOf(username.toLowerCase());
        if (index > -1) {
            currentUsernames.splice(index, 1);
            saveCurrentUsernames();
            console.log(`Released username: ${username}`);
        }
    }
}

function updateLastSeen() {
    if (!username || isTemporarySession) return; // Skip for temporary users
    
    if (isFirebaseEnabled) {
        // Update last seen in Firebase for registered users
        database.ref(`registeredUsers/${username.toLowerCase()}/lastSeen`).set(firebase.database.ServerValue.TIMESTAMP)
            .then(() => {
                console.log(`Updated last seen for ${username}`);
            })
            .catch((error) => {
                console.log('Failed to update last seen:', error);
            });
    } else {
        // Update last seen in local storage for registered users
        const registeredUsers = getRegisteredUsers();
        if (registeredUsers[username.toLowerCase()]) {
            registeredUsers[username.toLowerCase()].lastSeen = Date.now();
            try {
                localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
                console.log(`Updated last seen locally for ${username}`);
            } catch (e) {
                console.log('Failed to update last seen locally');
            }
        }
    }
}

document.getElementById('startChat').addEventListener('click', () => startChat());
document.getElementById('tempChat').addEventListener('click', startTempChat);
document.getElementById('sendButton').addEventListener('click', sendMessage);

document.getElementById('usernameInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        startChat();
    }
});

document.getElementById('pinInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        startChat();
    }
});

document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

window.addEventListener('load', function() {
    document.getElementById('privateRequestModal').classList.add('hidden');
    
    // Load rooms on app startup
    loadRooms();
    
    // Load and apply welcome message settings
    if (typeof loadAndApplyWelcomeSettings === 'function') {
        loadAndApplyWelcomeSettings();
    }
    
    // Load and apply private chat settings
    if (typeof loadAndApplyPrivateChatSettings === 'function') {
        loadAndApplyPrivateChatSettings();
    }
    
    // Detect if running as installed PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone || 
                        document.referrer.includes('android-app://');
    
    if (isStandalone) {
        // App is running as installed PWA
        document.body.classList.add('pwa-mode');
        console.log('Running as installed PWA');
        
        // Hide address bar on mobile browsers
        setTimeout(() => {
            window.scrollTo(0, 1);
        }, 100);
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Prevent text selection only on non-input elements
        document.addEventListener('selectstart', (e) => {
            if (!e.target.matches('input, textarea, [contenteditable]')) {
                e.preventDefault();
            }
        });
        
        document.addEventListener('mousedown', (e) => {
            if (!e.target.matches('input, textarea, button, [contenteditable]')) {
                e.preventDefault();
            }
        });
        
        // Handle back button on Android
        if ('serviceWorker' in navigator) {
            window.addEventListener('beforeunload', () => {
                // Prevent accidental app closure
            });
        }
    }
    
    // Load temporary sessions setting on page load to control UI visibility
    if (typeof loadTempSessionsSetting === 'function') {
        loadTempSessionsSetting();
    }
    
    // Try to auto-login with saved username
    tryAutoLogin();
    
    // Register service worker for offline functionality
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('Service Worker registered successfully:', registration.scope);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    }
    
    // Add PWA install prompt handling
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button after a delay if not already installed
        setTimeout(() => {
            if (deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
                showInstallPrompt();
            }
        }, 30000); // Show after 30 seconds
    });
    
    // Handle successful installation
    window.addEventListener('appinstalled', () => {
        showNotification('Friend Chat installed! 📱', 'success');
        deferredPrompt = null;
    });
    
    function showInstallPrompt() {
        if (deferredPrompt) {
            const notification = document.createElement('div');
            notification.className = 'notification install-prompt';
            notification.innerHTML = `
                <div><strong>Install Friend Chat</strong></div>
                <div style="font-size: 0.9em; margin: 5px 0;">Add to your home screen for a better experience!</div>
                <div class="notification-buttons">
                    <button class="notification-btn accept" onclick="installApp()">Install 📱</button>
                    <button class="notification-btn decline" onclick="dismissInstall()">Not Now</button>
                </div>
            `;
            document.getElementById('notifications').appendChild(notification);
            
            window.installApp = () => {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((result) => {
                    deferredPrompt = null;
                    notification.remove();
                });
            };
            
            window.dismissInstall = () => {
                notification.remove();
                deferredPrompt = null;
            };
            
            // Auto-dismiss after 20 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 20000);
        }
    }
});

function tryAutoLogin() {
    const storedSession = getStoredSession();
    const savedUsername = localStorage.getItem('chatUsername');
    
    if (storedSession) {
        // Valid session token exists - auto-login with session
        username = storedSession.username;
        isAdmin = storedSession.isAdmin || false;
        currentSessionToken = storedSession.token;
        
        document.getElementById('usernameInput').value = username;
        showNotification('Welcome back, ' + username + '! 🔐', 'success');
        
        setTimeout(() => {
            // Skip PIN verification, use session token
            if (isFirebaseEnabled) {
                addUserToFirebase();
            } else {
                loadCurrentUsernames();
                if (!currentUsernames.includes(username.toLowerCase())) {
                    currentUsernames.push(username.toLowerCase());
                    saveCurrentUsernames();
                }
                completeSetup();
            }
        }, 500);
        
    } else if (savedUsername) {
        // No valid session, but username is saved
        const registeredUsers = getRegisteredUsers();
        const isRegistered = registeredUsers[savedUsername.toLowerCase()];
        
        document.getElementById('usernameInput').value = savedUsername;
        
        if (isRegistered) {
            // Registered user - show PIN prompt
            showNotification('Welcome back! Please enter your PIN to continue. 🔐', 'info');
            document.getElementById('pinInput').focus();
        } else {
            // Temporary user - attempt auto-login
            showNotification('Reconnecting as ' + savedUsername + '...', 'info');
            setTimeout(() => {
                startChat(true); // true indicates auto-login attempt
            }, 500);
        }
    }
}

// Release username when user leaves (using modern approach)
window.addEventListener('beforeunload', function() {
    cleanupFirebaseListeners();
    releaseUsername();
});

// Also release on page visibility change (when tab is closed)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        setTimeout(function() {
            if (document.hidden) {
                cleanupFirebaseListeners();
                releaseUsername();
            }
        }, 30000);
    }
});

// Emoji picker functionality
const emojiCategories = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕'],
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑'],
    food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🫑', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥖', '🍞', '🥨', '🥯', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭'],
    activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸', '🥌', '🎿', '⛷', '🏂', '🪂', '🏋', '🤸', '🤼', '🤽', '🤾', '🧗', '🚴', '🚵', '🧘', '🏇', '🏊'],
    objects: ['💡', '🔦', '🕯', '🪔', '🧯', '🛢', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖', '🧰', '🔧', '🔨', '⚒', '🛠', '⛏', '🪓', '🪚', '🔩', '⚙', '🪤', '🧱', '⛓', '🧲', '🔫', '💣', '🧨', '🪓', '🗡', '⚔', '🛡', '🚬', '⚰', '🪦', '⚱', '🏺', '🔮', '📿', '🧿', '💈']
};

function setupEmojiPicker() {
    const emojiButton = document.getElementById('emojiButton');
    const emojiPicker = document.getElementById('emojiPicker');
    const emojiGrid = document.getElementById('emojiGrid');
    const messageInput = document.getElementById('messageInput');
    
    if (!emojiButton || !emojiPicker || !emojiGrid || !messageInput) return;
    
    // Toggle emoji picker
    emojiButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        emojiPicker.classList.toggle('hidden');
        if (!emojiPicker.classList.contains('hidden')) {
            populateEmojis('smileys');
        }
    });
    
    // Close emoji picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!emojiPicker.contains(e.target) && !emojiButton.contains(e.target)) {
            emojiPicker.classList.add('hidden');
        }
    });
    
    // Category switching
    document.querySelectorAll('.emoji-category').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const category = button.getAttribute('data-category');
            
            // Update active category
            document.querySelectorAll('.emoji-category').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Populate emojis for selected category
            populateEmojis(category);
        });
    });
    
    function populateEmojis(category) {
        const emojis = emojiCategories[category] || emojiCategories.smileys;
        emojiGrid.innerHTML = '';
        
        emojis.forEach(emoji => {
            const emojiButton = document.createElement('button');
            emojiButton.className = 'emoji-item';
            emojiButton.textContent = emoji;
            emojiButton.addEventListener('click', (e) => {
                e.preventDefault();
                insertEmoji(emoji);
            });
            emojiGrid.appendChild(emojiButton);
        });
    }
    
    function insertEmoji(emoji) {
        const currentValue = messageInput.value;
        const cursorPosition = messageInput.selectionStart;
        
        const newValue = currentValue.slice(0, cursorPosition) + emoji + currentValue.slice(cursorPosition);
        messageInput.value = newValue;
        
        // Move cursor after inserted emoji
        const newPosition = cursorPosition + emoji.length;
        messageInput.setSelectionRange(newPosition, newPosition);
        messageInput.focus();
        
        // Hide emoji picker after selection
        emojiPicker.classList.add('hidden');
    }
}

// Local storage functions for registered users
function getRegisteredUsers() {
    try {
        const saved = localStorage.getItem('registeredUsers');
        const users = saved ? JSON.parse(saved) : {};
        
        // Ensure admin is always registered
        if (!users[ADMIN_USERNAME]) {
            users[ADMIN_USERNAME] = {
                username: ADMIN_USERNAME,
                pin: ADMIN_PIN,
                registeredDate: Date.now(),
                isAdmin: true
            };
            // Save the updated users back to localStorage
            localStorage.setItem('registeredUsers', JSON.stringify(users));
        }
        
        return users;
    } catch (e) {
        console.log('Cannot load registered users');
        return {};
    }
}

function loadRegisteredUsers() {
    // Already loaded in getRegisteredUsers()
}

function registerUser(username, pin) {
    const registeredUsers = getRegisteredUsers();
    registeredUsers[username.toLowerCase()] = {
        username: username,
        pin: pin,
        registeredDate: Date.now()
    };
    
    try {
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
        console.log(`Registered user: ${username}`);
    } catch (e) {
        console.log('Cannot save registered users');
    }
}




