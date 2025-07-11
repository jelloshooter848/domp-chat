let username = '';
let currentRoom = 'general';
let isPrivateChat = false;
let privateChatFriend = '';
let socket = null;

const rooms = {
    general: '🏠 General',
    games: '🎮 Games',
    homework: '📚 Homework',
    sports: '⚽ Sports',
    music: '🎵 Music',
    movies: '🎬 Movies'
};

function connectToServer() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showNotification('Disconnected from server. Trying to reconnect...', 'error');
    });
    
    socket.on('username-taken', (data) => {
        alert(data.message + ' Please choose a different name. 😔');
        document.getElementById('setup').classList.remove('hidden');
        document.getElementById('chatArea').classList.add('hidden');
    });
    
    socket.on('join-success', (data) => {
        showNotification(`Welcome ${data.username}! You joined ${rooms[data.room]} 🎉`, 'success');
    });
    
    socket.on('new-message', (message) => {
        if (!isPrivateChat) {
            displayMessage(message, message.username === username);
        }
    });
    
    socket.on('private-message', (message) => {
        if (isPrivateChat && privateChatFriend === (message.username === username ? message.targetUser : message.username)) {
            displayMessage(message, message.username === username);
        }
    });
    
    socket.on('user-joined', (data) => {
        if (!isPrivateChat) {
            displaySystemMessage(data.message);
        }
    });
    
    socket.on('user-left', (data) => {
        if (!isPrivateChat) {
            displaySystemMessage(data.message);
        }
    });
    
    socket.on('private-request', (data) => {
        showPrivateRequestNotification(data);
    });
    
    socket.on('request-sent', (data) => {
        showNotification(`Request sent to ${data.targetUser}! 📨`, 'info');
    });
    
    socket.on('user-not-found', (data) => {
        showNotification(`User "${data.targetUser}" not found. They might not be online.`, 'error');
    });
    
    socket.on('private-response', (data) => {
        if (data.accepted) {
            showNotification(data.message, 'success');
            setTimeout(() => {
                startPrivateChat(data.from);
            }, 1000);
        } else {
            showNotification(data.message, 'info');
        }
    });
}

function startChat() {
    const usernameInput = document.getElementById('usernameInput');
    const setupDiv = document.getElementById('setup');
    const chatArea = document.getElementById('chatArea');
    
    username = usernameInput.value.trim();
    
    if (username === '') {
        alert('Please enter your name! 😊');
        return;
    }
    
    if (!socket) {
        connectToServer();
    }
    
    socket.emit('join', { username, room: currentRoom });
    
    setupDiv.classList.add('hidden');
    chatArea.classList.remove('hidden');
    
    setupRoomButtons();
    setupPrivateChat();
    switchRoom('general');
    
    document.getElementById('messageInput').focus();
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();
    
    if (messageText === '' || !socket) {
        return;
    }
    
    socket.emit('send-message', {
        text: messageText,
        room: currentRoom,
        isPrivate: isPrivateChat,
        targetUser: privateChatFriend
    });
    
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

function displaySystemMessage(text) {
    const messagesContainer = document.getElementById('messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message received';
    messageDiv.innerHTML = `
        <div>${text}</div>
        <div class="message-info">System • just now</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
}

function switchRoom(roomName) {
    if (!socket) return;
    
    isPrivateChat = false;
    currentRoom = roomName;
    
    socket.emit('switch-room', { room: roomName });
    
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
    if (!socket) return;
    
    socket.emit('send-private-request', { targetUser: friendName });
}

function showPrivateRequestNotification(request) {
    const notification = document.createElement('div');
    notification.className = 'notification request';
    notification.innerHTML = `
        <div><strong>${request.from}</strong> wants to chat privately with you! 💬</div>
        <div class="notification-buttons">
            <button class="notification-btn accept" onclick="acceptRequest('${request.from}', this)">Accept ✅</button>
            <button class="notification-btn decline" onclick="declineRequest('${request.from}', this)">Decline ❌</button>
        </div>
    `;
    
    document.getElementById('notifications').appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 30000);
}

function acceptRequest(friendName, buttonElement) {
    const notification = buttonElement.closest('.notification');
    if (notification) {
        notification.remove();
    }
    
    if (socket) {
        socket.emit('respond-private-request', { from: friendName, accepted: true });
    }
    
    showNotification(`You accepted ${friendName}'s request! Starting private chat... 🎉`, 'success');
    
    setTimeout(() => {
        startPrivateChat(friendName);
    }, 1000);
}

function declineRequest(friendName, buttonElement) {
    const notification = buttonElement.closest('.notification');
    if (notification) {
        notification.remove();
    }
    
    if (socket) {
        socket.emit('respond-private-request', { from: friendName, accepted: false });
    }
    
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