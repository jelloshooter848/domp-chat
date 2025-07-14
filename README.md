# 🗨️ DOMP Chat

**🌐 Live Demo:** [https://jelloshooter848.github.io/domp-chat](https://jelloshooter848.github.io/domp-chat)

> A decentralized real-time chat application built on Nostr protocol, forked from the original Friend Chat App to embrace decentralized communication.

![Chat App Preview](https://img.shields.io/badge/Status-Live-brightgreen) ![Nostr](https://img.shields.io/badge/Protocol-Nostr-purple) ![Decentralized](https://img.shields.io/badge/Architecture-Decentralized-green) ![PWA](https://img.shields.io/badge/PWA-Ready-blue)

## ✨ Features

### 💬 Core Chat Features
- **Real-time messaging** across multiple chat rooms
- **Private chat system** with request/accept workflow
- **Room management** with dynamic room creation and deletion
- **User presence indicators** showing who's online
- **Emoji picker** with categorized emojis
- **Mobile-responsive design** with PWA support

### 🛠️ Admin Panel
- **Comprehensive user management** with ban/unban functionality
- **Usage statistics** and storage monitoring
- **Room management** - create, delete, and reset chat rooms
- **Auto-purge inactive users** with configurable time periods
- **Storage management** - auto-delete old messages when storage fills up
- **Welcome message customization** for the login screen
- **Private chat controls** - enable/disable private messaging

### 🔧 System Features
- **Nostr protocol** for decentralized messaging with localStorage fallback
- **Session management** with cryptographic key pair generation
- **Decentralized identity** using Nostr public/private keys
- **PWA installation** support for mobile devices
- **Responsive design** optimized for all screen sizes

## 🚀 Quick Start

1. **Visit the live app:** [https://jelloshooter848.github.io/domp-chat](https://jelloshooter848.github.io/domp-chat)
2. **Enter your name** to start chatting
3. **Automatic key generation:** Your Nostr keypair is generated and stored locally
4. **Connection status:** Green indicator shows Nostr connectivity, red shows local-only mode
5. **Admin access:** Username: `admin`, PIN: `1234`

## 🏗️ Local Development

### Prerequisites
- Modern web browser with JavaScript enabled
- No external dependencies required (fully decentralized)

### Installation
```bash
# Clone the repository
git clone https://github.com/jelloshooter848/domp-chat.git

# Navigate to project directory
cd domp-chat

# Open index.html in your browser
# Or serve with a local server:
python -m http.server 8000
# Then visit: http://localhost:8000
```

### Architecture
This application uses the **Nostr protocol** for decentralized messaging:
- **No central servers** - connects directly to Nostr relays
- **Local fallback** - works offline with localStorage
- **Cryptographic identity** - uses Nostr keypairs for user identity
- **Censorship resistant** - no single point of failure

## 📱 Admin Features

### Admin Capabilities
- **📊 Usage Stats** - Monitor storage, users, and messages
- **👥 User Management** - View, ban, unban, and delete users
- **🏠 Room Management** - Create, delete, and reset chat rooms
- **💬 Message Moderation** - Coming soon
- **⚙️ Settings** - Configure app behavior and appearance

### Settings Configuration
- **Access Control** - Enable/disable temporary sessions
- **User Management** - Auto-purge inactive users
- **Storage Management** - Auto-delete old messages
- **Welcome Screen** - Customize welcome messages
- **Chat Features** - Enable/disable private chats

## 🔒 Security Features

- **Admin-only controls** with secure authentication
- **User session management** with PIN verification
- **Input validation** and XSS protection
- **Configurable access controls** for different user types
- **Safe user management** with online status checking

## 📱 Mobile Support

- **Progressive Web App (PWA)** - Install on mobile devices
- **Responsive design** - Optimized for all screen sizes
- **Touch-friendly interface** - Mobile-first design approach
- **Offline capability** - localStorage fallback when offline

## 🛠️ Technology Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Protocol:** Nostr (decentralized messaging protocol)
- **Storage:** localStorage with Nostr relay persistence
- **Deployment:** GitHub Pages
- **PWA:** Service Worker ready
- **Libraries:** nostr-tools v2.7.2

## 📋 Project Structure

```
domp-chat/
├── index.html          # Main application file
├── chat-nostr.js       # Nostr-based chat functionality
├── nostr-client.js     # Nostr protocol client
├── admin-panel.js      # Admin panel features
├── styles.css          # Application styling
├── manifest.json       # PWA manifest
├── progress.md         # Development progress tracking
└── README.md          # Project documentation
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- **Live Demo:** [GitHub Pages](https://jelloshooter848.github.io/domp-chat)
- **Repository:** [GitHub](https://github.com/jelloshooter848/domp-chat)
- **Issues:** [Report a Bug](https://github.com/jelloshooter848/domp-chat/issues)
- **Original Project:** [dad-hen-project2](https://github.com/jelloshooter848/dad-hen-project2)
- **Related Project:** [fromperdomp-poc](https://github.com/jelloshooter848/fromperdomp-poc) - Decentralized marketplace protocol

## 🎯 Project Goals

This project serves as a stepping stone toward building decentralized communication infrastructure for the **fromperdomp-poc** project - a trustless peer-to-peer marketplace protocol built on Bitcoin Lightning Network and Nostr.

### Current Focus
- **Decentralization**: Moving away from centralized Firebase to Nostr protocol
- **Privacy**: Cryptographic identity without central registration
- **Resilience**: No single point of failure or censorship

### Future Integration
- **Marketplace Communication**: Provide secure messaging for marketplace transactions
- **Reputation System**: Leverage chat history for decentralized reputation scoring
- **Lightning Integration**: Foundation for payment-integrated communication

---

**Made with ❤️ using Nostr protocol and vanilla JavaScript**