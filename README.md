# Friend Chat App 🗨️

A real-time chat application that allows friends to communicate across different devices and platforms.

## Features

✨ **Real-time messaging** - Messages appear instantly for all users
🏠 **Multiple chat rooms** - General, Games, Homework, Sports, Music, Movies
💬 **Private messaging** - Send private chat requests and have one-on-one conversations
👥 **Live username validation** - Prevents duplicate usernames across all connected users
📱 **Cross-device communication** - Works on phones, tablets, and computers
🔄 **Automatic reconnection** - Handles connection issues gracefully

## How to Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Open the chat app:**
   - Open your browser and go to `http://localhost:3000`
   - To test with multiple users, open the same URL in different browser tabs or on different devices

## How to Use

1. **Join the chat:**
   - Enter a unique username
   - Click "Start Chatting!"

2. **Chat in rooms:**
   - Click any room button to switch between different topics
   - All users in the same room will see your messages

3. **Private messaging:**
   - Click the "💬 Private" button
   - Enter a friend's username to send a private chat request
   - They can accept or decline your request

## Testing with Friends

To chat with friends on different devices:

1. **Local network:** If everyone is on the same WiFi, they can access `http://YOUR_COMPUTER_IP:3000`
2. **Online deployment:** Deploy to a service like Heroku, Railway, or Vercel for internet access

## Files

- `server.js` - Node.js server with Socket.IO for real-time communication
- `index.html` - Chat interface and styling
- `chat.js` - Client-side JavaScript for real-time features
- `package.json` - Dependencies and scripts

## Technology

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express, Socket.IO
- **Real-time:** WebSocket connections via Socket.IO