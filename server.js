const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname)));

const activeUsers = new Map();
const rooms = ['general', 'games', 'homework', 'sports', 'music', 'movies'];

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (data) => {
        const { username, room } = data;
        
        if (Array.from(activeUsers.values()).some(user => user.username.toLowerCase() === username.toLowerCase())) {
            socket.emit('username-taken', { message: `Username "${username}" is already taken!` });
            return;
        }

        activeUsers.set(socket.id, { username, room, socketId: socket.id });
        socket.join(room);
        
        socket.emit('join-success', { username, room });
        socket.to(room).emit('user-joined', { username, message: `${username} joined the chat` });
        
        io.emit('active-users', Array.from(activeUsers.values()).map(user => user.username));
        
        console.log(`${username} joined room: ${room}`);
    });

    socket.on('send-message', (data) => {
        const user = activeUsers.get(socket.id);
        if (!user) return;

        const messageData = {
            username: user.username,
            text: data.text,
            room: data.room,
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            id: Date.now()
        };

        if (data.isPrivate && data.targetUser) {
            const targetSocket = Array.from(activeUsers.entries())
                .find(([id, userData]) => userData.username === data.targetUser);
            
            if (targetSocket) {
                io.to(targetSocket[0]).emit('private-message', messageData);
                socket.emit('private-message', messageData);
            }
        } else {
            io.to(data.room).emit('new-message', messageData);
        }
    });

    socket.on('switch-room', (data) => {
        const user = activeUsers.get(socket.id);
        if (!user) return;

        socket.leave(user.room);
        socket.join(data.room);
        user.room = data.room;
        
        socket.emit('room-switched', { room: data.room });
        console.log(`${user.username} switched to room: ${data.room}`);
    });

    socket.on('send-private-request', (data) => {
        const sender = activeUsers.get(socket.id);
        if (!sender) return;

        const targetSocket = Array.from(activeUsers.entries())
            .find(([id, userData]) => userData.username === data.targetUser);
        
        if (targetSocket) {
            io.to(targetSocket[0]).emit('private-request', {
                from: sender.username,
                message: `${sender.username} wants to chat privately with you!`
            });
            
            socket.emit('request-sent', { targetUser: data.targetUser });
        } else {
            socket.emit('user-not-found', { targetUser: data.targetUser });
        }
    });

    socket.on('respond-private-request', (data) => {
        const responder = activeUsers.get(socket.id);
        if (!responder) return;

        const senderSocket = Array.from(activeUsers.entries())
            .find(([id, userData]) => userData.username === data.from);
        
        if (senderSocket) {
            io.to(senderSocket[0]).emit('private-response', {
                from: responder.username,
                accepted: data.accepted,
                message: data.accepted ? 
                    `${responder.username} accepted your private chat request!` :
                    `${responder.username} declined your private chat request.`
            });
        }
    });

    socket.on('disconnect', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
            socket.to(user.room).emit('user-left', { 
                username: user.username, 
                message: `${user.username} left the chat` 
            });
            
            activeUsers.delete(socket.id);
            io.emit('active-users', Array.from(activeUsers.values()).map(user => user.username));
            
            console.log(`${user.username} disconnected`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Open this URL in multiple browser tabs to test chat!');
});