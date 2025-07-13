# 🗨️ Friend Chat App

**🌐 Live Demo:** [https://yourusername.github.io/dad-hen-project2](https://yourusername.github.io/dad-hen-project2)

> A modern, real-time chat application with comprehensive admin controls and Firebase integration.

![Chat App Preview](https://img.shields.io/badge/Status-Live-brightgreen) ![Firebase](https://img.shields.io/badge/Database-Firebase-orange) ![PWA](https://img.shields.io/badge/PWA-Ready-blue)

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
- **Firebase real-time database** with localStorage fallback
- **Session management** with PIN-based user registration
- **Temporary sessions** for guest users (admin configurable)
- **PWA installation** support for mobile devices
- **Responsive design** optimized for all screen sizes

## 🚀 Quick Start

1. **Visit the live app:** [GitHub Pages Link](https://yourusername.github.io/dad-hen-project2)
2. **Enter your name** to start chatting
3. **Optional:** Set a 4-6 digit PIN to save your username permanently
4. **Admin access:** Username: `admin`, PIN: `1234`

## 🏗️ Local Development

### Prerequisites
- Modern web browser with JavaScript enabled
- Firebase project (optional - app works with localStorage)

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/dad-hen-project2.git

# Navigate to project directory
cd dad-hen-project2

# Open index.html in your browser
# Or serve with a local server:
python -m http.server 8000
# Then visit: http://localhost:8000
```

### Firebase Setup (Optional)
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Realtime Database
3. Update `firebaseConfig` in `chat.js` with your credentials
4. Set database rules for your security requirements

## 📱 Admin Features

### Access Admin Panel
- **Username:** `admin`
- **PIN:** `1234`
- Click the "⚙️ Admin" button after logging in

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
- **Backend:** Firebase Realtime Database
- **Storage:** Firebase + localStorage fallback
- **Deployment:** GitHub Pages
- **PWA:** Service Worker ready

## 📋 Project Structure

```
dad-hen-project2/
├── index.html          # Main application file
├── chat.js             # Core chat functionality
├── admin-panel.js      # Admin panel features
├── styles.css          # Application styling
├── manifest.json       # PWA manifest
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

- **Live Demo:** [GitHub Pages](https://yourusername.github.io/dad-hen-project2)
- **Repository:** [GitHub](https://github.com/yourusername/dad-hen-project2)
- **Issues:** [Report a Bug](https://github.com/yourusername/dad-hen-project2/issues)

---

**Made with ❤️ using Firebase and vanilla JavaScript**