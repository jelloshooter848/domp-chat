/**
 * Admin Panel Module for Friend Chat App
 * Handles all admin panel functionality including usage statistics and user management
 */

// Admin panel sorting mode
let userSortMode = 'activity'; // 'activity' or 'alphabetical'

// Temporary sessions control
let allowTemporarySessions = true;

// Admin panel setup and management
function setupAdminPanel() {
    const adminBtn = document.getElementById('adminBtn');
    const adminModal = document.getElementById('adminModal');
    const closeAdmin = document.getElementById('closeAdmin');
    
    // Show admin button only for admin users
    if (isAdmin) {
        adminBtn.classList.remove('hidden');
    } else {
        adminBtn.classList.add('hidden');
    }
    
    // Admin button click
    adminBtn.addEventListener('click', () => {
        adminModal.classList.remove('hidden');
    });
    
    // Close admin panel
    closeAdmin.addEventListener('click', () => {
        adminModal.classList.add('hidden');
    });
    
    // Admin tab switching
    const adminTabs = document.querySelectorAll('.admin-tab');
    const adminTabContents = document.querySelectorAll('.admin-tab-content');
    
    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Update active tab
            adminTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            adminTabContents.forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById(targetTab + 'Tab').classList.remove('hidden');
        });
    });
    
    // Close modal when clicking outside
    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            adminModal.classList.add('hidden');
        }
    });
    
    // Setup refresh stats button
    const refreshStatsBtn = document.getElementById('refreshStats');
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', loadUsageStatistics);
    }
    
    // Setup refresh users button
    const refreshUsersBtn = document.getElementById('refreshUsers');
    if (refreshUsersBtn) {
        refreshUsersBtn.addEventListener('click', loadUserManagement);
    }
    
    // Setup sort dropdown
    const sortDropdown = document.getElementById('userSortSelect');
    if (sortDropdown) {
        sortDropdown.addEventListener('change', (e) => {
            userSortMode = e.target.value;
            loadUserManagement(); // Reload with new sorting
        });
    }
    
    // Setup temporary sessions toggle
    const tempSessionsToggle = document.getElementById('tempSessionsToggle');
    if (tempSessionsToggle) {
        // Load current setting
        loadTempSessionsSetting();
        
        tempSessionsToggle.addEventListener('change', (e) => {
            allowTemporarySessions = e.target.checked;
            saveTempSessionsSetting();
            console.log(`Temporary sessions ${allowTemporarySessions ? 'enabled' : 'disabled'}`);
        });
    }
    
    // Load initial statistics when admin panel opens
    if (isAdmin) {
        loadUsageStatistics();
        loadUserManagement();
    }
}

// Admin usage statistics functions
function loadUsageStatistics() {
    if (!isFirebaseEnabled || !isAdmin) return;
    
    console.log('Loading usage statistics...');
    
    Promise.all([
        // Get registered users count
        database.ref('registeredUsers').once('value'),
        // Get online users count  
        database.ref('users').once('value'),
        // Get messages from all rooms
        database.ref('messages').once('value')
    ]).then(([registeredSnapshot, usersSnapshot, messagesSnapshot]) => {
        
        const registeredUsers = registeredSnapshot.val() || {};
        const onlineUsers = usersSnapshot.val() || {};
        const allMessages = messagesSnapshot.val() || {};
        
        // Calculate user type breakdown for online users
        const onlineUsersList = Object.values(onlineUsers);
        let registeredOnline = 0;
        let temporaryOnline = 0;
        
        onlineUsersList.forEach(user => {
            if (registeredUsers[user.username.toLowerCase()]) {
                registeredOnline++;
            } else {
                temporaryOnline++;
            }
        });
        
        // Calculate statistics
        const stats = {
            registeredCount: Object.keys(registeredUsers).length,
            registeredOnline: registeredOnline,
            temporaryOnline: temporaryOnline,
            totalOnline: registeredOnline + temporaryOnline,
            messageCount: 0,
            roomStats: {}
        };
        
        // Count messages by room
        Object.keys(rooms).forEach(roomName => {
            const roomMessages = allMessages[roomName] || {};
            const count = Object.keys(roomMessages).length;
            stats.messageCount += count;
            stats.roomStats[roomName] = count;
        });
        
        // Estimate storage usage (rough calculation)
        const dataString = JSON.stringify({
            registeredUsers,
            messages: allMessages
        });
        const storageBytes = new Blob([dataString]).size;
        const storageKB = (storageBytes / 1024).toFixed(2);
        
        // Update UI
        updateUsageStatisticsUI(stats, storageKB);
        
    }).catch(error => {
        console.error('Error loading usage statistics:', error);
        showUsageStatisticsError();
    });
}

function updateUsageStatisticsUI(stats, storageKB) {
    // Update main statistics
    document.getElementById('storageUsed').textContent = `${storageKB} KB`;
    document.getElementById('registeredCount').textContent = stats.registeredCount;
    
    // Update user types breakdown
    document.getElementById('userTypes').textContent = `${stats.totalOnline} Online`;
    document.getElementById('userBreakdown').innerHTML = `
        Registered: ${stats.registeredOnline}<br>
        Temporary: ${stats.temporaryOnline}
    `;
    
    document.getElementById('messageCount').textContent = stats.messageCount;
    
    // Update room statistics
    const roomStatsContainer = document.getElementById('roomStats');
    roomStatsContainer.innerHTML = '';
    
    Object.keys(rooms).forEach(roomName => {
        const count = stats.roomStats[roomName] || 0;
        const roomItem = document.createElement('div');
        roomItem.className = 'room-stat-item';
        roomItem.innerHTML = `
            <span class="room-name">${rooms[roomName]}</span>
            <span class="room-count">${count} messages</span>
        `;
        roomStatsContainer.appendChild(roomItem);
    });
    
    // Update last refresh time
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    document.getElementById('lastUpdate').textContent = timeString;
}

function showUsageStatisticsError() {
    document.getElementById('storageUsed').textContent = 'Error';
    document.getElementById('registeredCount').textContent = 'Error';
    document.getElementById('userTypes').textContent = 'Error';
    document.getElementById('userBreakdown').textContent = '';
    document.getElementById('messageCount').textContent = 'Error';
    
    const roomStatsContainer = document.getElementById('roomStats');
    roomStatsContainer.innerHTML = '<div style="color: #dc3545; text-align: center;">Failed to load statistics</div>';
}

// User management functions
function loadUserManagement() {
    if (!isFirebaseEnabled || !isAdmin) return;
    
    console.log('Loading user management data...');
    
    Promise.all([
        database.ref('registeredUsers').once('value'),
        database.ref('users').once('value')
    ]).then(([registeredSnapshot, onlineSnapshot]) => {
        
        const registeredUsers = registeredSnapshot.val() || {};
        const onlineUsers = onlineSnapshot.val() || {};
        
        // Process user data
        const userData = processUserData(registeredUsers, onlineUsers);
        
        // Update UI
        updateUserManagementUI(userData);
        
    }).catch(error => {
        console.error('Error loading user management data:', error);
        showUserManagementError();
    });
}

function processUserData(registeredUsers, onlineUsers) {
    const onlineUsernames = Object.values(onlineUsers).map(user => user.username.toLowerCase());
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    let registeredOnlineCount = 0;
    let recentRegistrations = 0;
    const userList = [];
    
    // Process registered users (excluding admin)
    Object.entries(registeredUsers).forEach(([username, userData]) => {
        if (username === ADMIN_USERNAME.toLowerCase()) return; // Skip admin
        
        const isOnline = onlineUsernames.includes(username);
        if (isOnline) registeredOnlineCount++;
        
        const registrationDate = userData.registeredDate || 0;
        if (registrationDate > sevenDaysAgo) recentRegistrations++;
        
        // Determine last seen display text and timestamp for sorting
        let lastSeenText;
        let lastSeenTimestamp;
        
        if (isOnline) {
            lastSeenText = 'Online now';
            lastSeenTimestamp = Date.now(); // Current time for online users (highest priority)
        } else {
            // Use lastSeen data if available, otherwise fall back to registration date
            lastSeenTimestamp = userData.lastSeen || registrationDate;
            lastSeenText = formatLastSeen(lastSeenTimestamp);
        }
        
        userList.push({
            username: userData.username,
            registrationDate: registrationDate,
            isOnline: isOnline,
            lastSeen: lastSeenText,
            lastSeenTimestamp: lastSeenTimestamp,
            banned: userData.banned || false,
            bannedDate: userData.bannedDate || null,
            bannedBy: userData.bannedBy || null
        });
    });
    
    // Sort based on current mode with banned users at bottom
    userList.sort((a, b) => {
        // First priority: banned status (non-banned users first)
        if (a.banned !== b.banned) {
            return a.banned ? 1 : -1;
        }
        
        // Second priority: sorting mode
        if (userSortMode === 'activity') {
            // Sort by most recently online first, then alphabetically
            const timeDiff = b.lastSeenTimestamp - a.lastSeenTimestamp;
            if (timeDiff !== 0) return timeDiff;
            
            // Fallback: alphabetical by username
            return a.username.localeCompare(b.username);
        } else {
            // Sort alphabetically
            return a.username.localeCompare(b.username);
        }
    });
    
    return {
        totalRegistered: userList.length,
        registeredOnline: registeredOnlineCount,
        recentRegistrations: recentRegistrations,
        userList: userList
    };
}

function updateUserManagementUI(userData) {
    // Update summary statistics
    document.getElementById('totalRegistered').textContent = userData.totalRegistered;
    document.getElementById('registeredOnline').textContent = userData.registeredOnline;
    document.getElementById('recentRegistrations').textContent = userData.recentRegistrations;
    
    // Update users table
    const usersTable = document.getElementById('usersTable');
    usersTable.innerHTML = '';
    
    if (userData.userList.length === 0) {
        usersTable.innerHTML = '<div class="users-table-loading">No registered users found</div>';
        return;
    }
    
    userData.userList.forEach(user => {
        const userRow = document.createElement('div');
        userRow.className = 'user-row';
        
        const registrationDate = new Date(user.registrationDate);
        const formattedDate = registrationDate.toLocaleDateString();
        const formattedTime = registrationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Create ban status and action elements
        const banStatus = user.banned ? '<span class="ban-status banned">BANNED</span>' : '';
        const banAction = user.banned 
            ? `<button class="unban-btn" onclick="unbanUser('${user.username}')">Unban</button>`
            : `<button class="ban-btn" onclick="banUser('${user.username}')">Ban</button>`;
        
        userRow.className = `user-row ${user.banned ? 'banned-user' : ''}`;
        
        userRow.innerHTML = `
            <div class="user-info">
                <div class="user-status ${user.isOnline ? 'online' : 'offline'}"></div>
                <div class="user-name">${user.username} ${banStatus}</div>
            </div>
            <div class="user-details">
                <div class="user-registered">Registered: ${formattedDate} at ${formattedTime}</div>
                <div class="user-last-seen">${user.lastSeen}</div>
            </div>
            <div class="user-actions">
                ${banAction}
            </div>
        `;
        
        usersTable.appendChild(userRow);
    });
}

function showUserManagementError() {
    document.getElementById('totalRegistered').textContent = 'Error';
    document.getElementById('registeredOnline').textContent = 'Error';
    document.getElementById('recentRegistrations').textContent = 'Error';
    
    const usersTable = document.getElementById('usersTable');
    usersTable.innerHTML = '<div style="color: #dc3545; text-align: center; padding: 20px;">Failed to load user data</div>';
}

// Ban/Unban functions
function banUser(username) {
    if (!isAdmin || !username) return;
    
    // Prevent admin from banning themselves
    if (username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
        alert('Cannot ban the admin user!');
        return;
    }
    
    if (!confirm(`Are you sure you want to ban "${username}"? They will not be able to access the chat.`)) {
        return;
    }
    
    const banData = {
        banned: true,
        bannedDate: firebase?.database?.ServerValue?.TIMESTAMP || Date.now(),
        bannedBy: ADMIN_USERNAME
    };
    
    if (isFirebaseEnabled) {
        // Update in Firebase
        database.ref(`registeredUsers/${username.toLowerCase()}`).update(banData)
            .then(() => {
                console.log(`User ${username} has been banned`);
                loadUserManagement(); // Refresh the list
            })
            .catch((error) => {
                console.error('Error banning user:', error);
                alert('Failed to ban user. Please try again.');
            });
    } else {
        // Update in localStorage
        const registeredUsers = getRegisteredUsers();
        if (registeredUsers[username.toLowerCase()]) {
            registeredUsers[username.toLowerCase()] = {
                ...registeredUsers[username.toLowerCase()],
                banned: true,
                bannedDate: Date.now(),
                bannedBy: ADMIN_USERNAME
            };
            
            try {
                localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
                console.log(`User ${username} has been banned`);
                loadUserManagement(); // Refresh the list
            } catch (e) {
                console.error('Error banning user:', e);
                alert('Failed to ban user. Please try again.');
            }
        }
    }
}

function unbanUser(username) {
    if (!isAdmin || !username) return;
    
    if (!confirm(`Are you sure you want to unban "${username}"? They will be able to access the chat again.`)) {
        return;
    }
    
    const unbanData = {
        banned: null,
        bannedDate: null,
        bannedBy: null
    };
    
    if (isFirebaseEnabled) {
        // Update in Firebase
        database.ref(`registeredUsers/${username.toLowerCase()}`).update(unbanData)
            .then(() => {
                console.log(`User ${username} has been unbanned`);
                loadUserManagement(); // Refresh the list
            })
            .catch((error) => {
                console.error('Error unbanning user:', error);
                alert('Failed to unban user. Please try again.');
            });
    } else {
        // Update in localStorage
        const registeredUsers = getRegisteredUsers();
        if (registeredUsers[username.toLowerCase()]) {
            delete registeredUsers[username.toLowerCase()].banned;
            delete registeredUsers[username.toLowerCase()].bannedDate;
            delete registeredUsers[username.toLowerCase()].bannedBy;
            
            try {
                localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
                console.log(`User ${username} has been unbanned`);
                loadUserManagement(); // Refresh the list
            } catch (e) {
                console.error('Error unbanning user:', e);
                alert('Failed to unban user. Please try again.');
            }
        }
    }
}

// Helper function for localStorage (needed for ban/unban in local mode)
function getRegisteredUsers() {
    try {
        return JSON.parse(localStorage.getItem('registeredUsers') || '{}');
    } catch (e) {
        return {};
    }
}

// Temporary sessions setting management
function loadTempSessionsSetting() {
    if (isFirebaseEnabled) {
        // Load from Firebase
        database.ref('adminSettings/allowTemporarySessions').once('value')
            .then((snapshot) => {
                const setting = snapshot.val();
                allowTemporarySessions = setting !== null ? setting : true; // Default to true
                updateTempSessionsToggle();
            })
            .catch((error) => {
                console.log('Could not load temp sessions setting from Firebase:', error);
                allowTemporarySessions = true; // Default to enabled
                updateTempSessionsToggle();
            });
    } else {
        // Load from localStorage
        try {
            const setting = localStorage.getItem('allowTemporarySessions');
            allowTemporarySessions = setting !== null ? JSON.parse(setting) : true; // Default to true
            updateTempSessionsToggle();
        } catch (e) {
            console.log('Could not load temp sessions setting from localStorage:', e);
            allowTemporarySessions = true; // Default to enabled
            updateTempSessionsToggle();
        }
    }
}

function saveTempSessionsSetting() {
    if (isFirebaseEnabled) {
        // Save to Firebase
        database.ref('adminSettings/allowTemporarySessions').set(allowTemporarySessions)
            .then(() => {
                console.log('Temp sessions setting saved to Firebase');
            })
            .catch((error) => {
                console.error('Failed to save temp sessions setting to Firebase:', error);
            });
    } else {
        // Save to localStorage
        try {
            localStorage.setItem('allowTemporarySessions', JSON.stringify(allowTemporarySessions));
            console.log('Temp sessions setting saved to localStorage');
        } catch (e) {
            console.error('Failed to save temp sessions setting to localStorage:', e);
        }
    }
}

function updateTempSessionsToggle() {
    const toggle = document.getElementById('tempSessionsToggle');
    if (toggle) {
        toggle.checked = allowTemporarySessions;
    }
}

// Function for chat.js to check if temporary sessions are allowed
function areTemporarySessionsAllowed() {
    return allowTemporarySessions;
}

// Utility functions for formatting
function formatLastSeen(timestamp) {
    if (!timestamp) return 'Last seen: Unknown';
    
    // Use calendar days instead of 24-hour periods
    const now = new Date();
    const lastSeenDate = new Date(timestamp);
    
    // Set both dates to midnight for proper day comparison
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastSeenMidnight = new Date(lastSeenDate.getFullYear(), lastSeenDate.getMonth(), lastSeenDate.getDate());
    
    const timeDiff = todayMidnight - lastSeenMidnight;
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Last seen online today';
    if (days === 1) return 'Last seen online yesterday';
    if (days < 7) return `Last seen online ${days} days ago`;
    if (days < 30) return `Last seen online ${Math.floor(days / 7)} weeks ago`;
    return `Last seen online ${Math.floor(days / 30)} months ago`;
}

function formatRegistrationAge(timestamp) {
    if (!timestamp) return 'at unknown time';
    
    const now = Date.now();
    const timeDiff = now - timestamp;
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
}