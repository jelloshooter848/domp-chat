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

// Initialize Firebase
let database = null;
let isFirebaseEnabled = false;

try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        isFirebaseEnabled = true;
        console.log("Firebase connected successfully!");
    } else {
        console.log("Firebase not configured - running in local mode");
    }
} catch (error) {
    console.log("Firebase connection failed - running in local mode:", error);
}

let username = '';
let messages = {};
let currentRoom = 'general';
let isPrivateChat = false;
let privateChatFriend = '';
let currentUsernames = [];
let userPresenceRef = null;

const rooms = {
    general: '🏠 General',
    games: '🎮 Games',
    homework: '📚 Homework',
    sports: '⚽ Sports',
    music: '🎵 Music',
    movies: '🎬 Movies'
};

function startChat() {
    const usernameInput = document.getElementById('usernameInput');
    const setupDiv = document.getElementById('setup');
    const chatArea = document.getElementById('chatArea');
    
    username = usernameInput.value.trim();
    
    if (username === '') {
        alert('Please enter your name! 😊');
        return;
    }
    
    if (isFirebaseEnabled) {
        checkUsernameAndJoin();
    } else {
        localUsernameCheck();
    }
    
    function localUsernameCheck() {
        loadCurrentUsernames();
        
        if (currentUsernames.includes(username.toLowerCase())) {
            alert(`Sorry, the name "${username}" is already taken! Please choose a different name. 😔`);
            return;
        }
        
        currentUsernames.push(username.toLowerCase());
        saveCurrentUsernames();
        completeSetup();
    }
    
    function checkUsernameAndJoin() {
        database.ref('users').once('value', (snapshot) => {
            const users = snapshot.val() || {};
            const usernames = Object.values(users).map(user => user.username.toLowerCase());
            
            if (usernames.includes(username.toLowerCase())) {
                alert(`Sorry, the name "${username}" is already taken! Please choose a different name. 😔`);
                return;
            }
            
            // Add user to Firebase
            const userId = Date.now().toString();
            userPresenceRef = database.ref(`users/${userId}`);
            userPresenceRef.set({
                username: username,
                online: true,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Remove user when they disconnect
            userPresenceRef.onDisconnect().remove();
            
            setupFirebaseListeners();
            completeSetup();
        });
    }
    
    function completeSetup() {
        setupDiv.classList.add('hidden');
        chatArea.classList.remove('hidden');
        
        setupRoomButtons();
        setupPrivateChat();
        switchRoom('general');
        
        document.getElementById('messageInput').focus();
        
        if (isFirebaseEnabled) {
            showNotification(`Connected to live chat! 🌐`, 'success');
        } else {
            showNotification(`Running in local mode 💻`, 'info');
        }
    }
}

function setupFirebaseListeners() {
    if (!isFirebaseEnabled) return;
    
    // Listen for new messages in all rooms
    Object.keys(rooms).forEach(roomName => {
        database.ref(`messages/${roomName}`).on('child_added', (snapshot) => {
            const message = snapshot.val();
            if (message && currentRoom === roomName && !isPrivateChat) {
                displayMessage(message, message.username === username);
            }
        });
    });
    
    // Listen for private messages
    database.ref(`privateMessages/${username}`).on('child_added', (snapshot) => {
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
    database.ref(`requests/${username}`).on('child_added', (snapshot) => {
        const request = snapshot.val();
        if (request && request.from !== username) {
            showFirebaseRequestNotification(request, snapshot.key);
        }
    });
}

function sendMessage() {
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
    
    if (isFirebaseEnabled) {
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
    
    document.querySelectorAll('.room-button').forEach(button => {
        button.addEventListener('click', function() {
            const roomName = this.getAttribute('data-room');
            switchRoom(roomName);
        });
    });
}

function setupPrivateChat() {
    document.getElementById('privateChatBtn').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('privateRequestModal').classList.remove('hidden');
        document.getElementById('friendRequestInput').focus();
    });
    
    document.getElementById('sendRequest').addEventListener('click', () => {
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
                showNotification(`Request sent to ${friendName}! 📨`, 'info');
            } else {
                showNotification(`User "${friendName}" is not online right now.`, 'error');
            }
        });
    } else {
        // Local simulation
        showNotification(`Request sent to ${friendName}! 📨`, 'info');
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
    if (isFirebaseEnabled && userPresenceRef) {
        userPresenceRef.remove();
    } else if (username) {
        const index = currentUsernames.indexOf(username.toLowerCase());
        if (index > -1) {
            currentUsernames.splice(index, 1);
            saveCurrentUsernames();
            console.log(`Released username: ${username}`);
        }
    }
}

document.getElementById('startChat').addEventListener('click', startChat);
document.getElementById('sendButton').addEventListener('click', sendMessage);

document.getElementById('usernameInput').addEventListener('keypress', function(e) {
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
});

// Release username when user leaves
window.addEventListener('beforeunload', function() {
    releaseUsername();
});

window.addEventListener('unload', function() {
    releaseUsername();
});

// Also release on page visibility change (when tab is closed)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        setTimeout(function() {
            if (document.hidden) {
                releaseUsername();
            }
        }, 30000);
    }
});