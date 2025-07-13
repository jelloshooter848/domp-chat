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
            updateTempChatButtonVisibility();
            console.log(`Temporary sessions ${allowTemporarySessions ? 'enabled' : 'disabled'}`);
        });
    }
    
    // Setup room management
    const addRoomBtn = document.getElementById('addRoomBtn');
    if (addRoomBtn) {
        addRoomBtn.addEventListener('click', addRoom);
    }
    
    // Setup auto-purge functionality
    const autoPurgeToggle = document.getElementById('autoPurgeToggle');
    if (autoPurgeToggle) {
        loadAutoPurgeSettings();
        
        autoPurgeToggle.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            togglePurgeSettings(isEnabled);
            saveAutoPurgeSettings();
            console.log(`Auto-purge ${isEnabled ? 'enabled' : 'disabled'}`);
        });
    }
    
    const previewPurgeBtn = document.getElementById('previewPurgeBtn');
    if (previewPurgeBtn) {
        previewPurgeBtn.addEventListener('click', previewPurge);
    }
    
    const executePurgeBtn = document.getElementById('executePurgeBtn');
    if (executePurgeBtn) {
        executePurgeBtn.addEventListener('click', executePurge);
    }
    
    const purgeInterval = document.getElementById('purgeInterval');
    if (purgeInterval) {
        purgeInterval.addEventListener('change', saveAutoPurgeSettings);
    }
    
    // Setup storage management functionality
    const autoDeleteToggle = document.getElementById('autoDeleteToggle');
    if (autoDeleteToggle) {
        loadStorageSettings();
        
        autoDeleteToggle.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            toggleStorageSettings(isEnabled);
            saveStorageSettings();
            console.log(`Auto-delete messages ${isEnabled ? 'enabled' : 'disabled'}`);
        });
    }
    
    const checkStorageBtn = document.getElementById('checkStorageBtn');
    if (checkStorageBtn) {
        checkStorageBtn.addEventListener('click', updateStorageDisplay);
    }
    
    const cleanupNowBtn = document.getElementById('cleanupNowBtn');
    if (cleanupNowBtn) {
        cleanupNowBtn.addEventListener('click', manualStorageCleanup);
    }
    
    const storageThreshold = document.getElementById('storageThreshold');
    if (storageThreshold) {
        storageThreshold.addEventListener('change', saveStorageSettings);
    }
    
    // Setup welcome message customization
    const welcomeMessage = document.getElementById('welcomeMessage');
    const appDescription = document.getElementById('appDescription');
    
    if (welcomeMessage && appDescription) {
        loadWelcomeSettings();
        
        // Real-time preview as user types
        welcomeMessage.addEventListener('input', updateWelcomePreview);
        appDescription.addEventListener('input', updateWelcomePreview);
    }
    
    const previewWelcomeBtn = document.getElementById('previewWelcomeBtn');
    if (previewWelcomeBtn) {
        previewWelcomeBtn.addEventListener('click', showWelcomePreview);
    }
    
    const saveWelcomeBtn = document.getElementById('saveWelcomeBtn');
    if (saveWelcomeBtn) {
        saveWelcomeBtn.addEventListener('click', saveWelcomeSettings);
    }
    
    const resetWelcomeBtn = document.getElementById('resetWelcomeBtn');
    if (resetWelcomeBtn) {
        resetWelcomeBtn.addEventListener('click', resetWelcomeSettings);
    }
    
    // Setup private chat control
    const privateChatToggle = document.getElementById('privateChatToggle');
    if (privateChatToggle) {
        loadPrivateChatSettings();
        
        privateChatToggle.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            savePrivateChatSettings(isEnabled);
            updatePrivateChatVisibility(isEnabled);
            console.log(`Private chat ${isEnabled ? 'enabled' : 'disabled'}`);
        });
    }
    
    // Load initial statistics when admin panel opens
    if (isAdmin) {
        loadUsageStatistics();
        loadUserManagement();
        loadRoomManagement();
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
        
        // Also update storage display in settings if the function exists
        if (typeof updateStorageDisplay === 'function') {
            updateStorageDisplay();
        }
        
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
        
        // Skip if userData is missing or corrupted
        if (!userData || typeof userData !== 'object') {
            console.warn(`Skipping user ${username} - missing or corrupted data`);
            return;
        }
        
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
        
        // Ensure we have a valid username
        const displayUsername = userData.username || username;
        
        userList.push({
            username: displayUsername,
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
        const deleteAction = `<button class="delete-btn" onclick="deleteUser('${user.username}')" title="Delete user permanently">🗑️</button>`;
        
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
                ${deleteAction}
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
    
    // Check if user is currently online - cannot ban online users
    if (isFirebaseEnabled) {
        database.ref('users').once('value')
            .then((snapshot) => {
                const onlineUsers = snapshot.val() || {};
                const onlineUsernames = Object.values(onlineUsers).map(user => user.username && user.username.toLowerCase()).filter(Boolean);
                
                if (onlineUsernames.includes(username.toLowerCase())) {
                    alert(`❌ Cannot ban "${username}" while they are currently online.\n\nPlease wait for the user to log off, then try again.`);
                    return;
                }
                
                // User is offline, proceed with banning
                proceedWithUserBanning(username);
            })
            .catch((error) => {
                console.error('Error checking online users:', error);
                alert('Failed to check if user is online. Please try again.');
            });
    } else {
        // For localStorage mode, we can't easily check online status, so proceed
        proceedWithUserBanning(username);
    }
}

function proceedWithUserBanning(username) {
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

// Delete user function
function deleteUser(username) {
    if (!isAdmin || !username) return;
    
    // Prevent admin from deleting themselves
    if (username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
        alert('Cannot delete the admin user!');
        return;
    }
    
    // Check if user is currently online - cannot delete online users
    if (isFirebaseEnabled) {
        database.ref('users').once('value')
            .then((snapshot) => {
                const onlineUsers = snapshot.val() || {};
                const onlineUsernames = Object.values(onlineUsers).map(user => user.username && user.username.toLowerCase()).filter(Boolean);
                
                if (onlineUsernames.includes(username.toLowerCase())) {
                    alert(`❌ Cannot delete "${username}" while they are currently online.\n\nPlease wait for the user to log off, then try again.`);
                    return;
                }
                
                // User is offline, proceed with deletion
                proceedWithUserDeletion(username);
            })
            .catch((error) => {
                console.error('Error checking online users:', error);
                alert('Failed to check if user is online. Please try again.');
            });
    } else {
        // For localStorage mode, we can't easily check online status, so proceed
        proceedWithUserDeletion(username);
    }
}

function proceedWithUserDeletion(username) {
    if (!confirm(`⚠️ WARNING: This will permanently delete "${username}" and all their data.\n\nThis action cannot be undone. Are you sure you want to delete this user?`)) {
        return;
    }
    
    // Double confirmation for extra safety
    const confirmText = prompt(`Final confirmation: Type "DELETE" (all caps) to confirm you want to permanently remove "${username}"`);
    if (confirmText !== 'DELETE') {
        alert('Deletion cancelled. You must type "DELETE" exactly to confirm.');
        return;
    }
    
    if (isFirebaseEnabled) {
        // Remove from registered users (user is confirmed offline)
        database.ref(`registeredUsers/${username.toLowerCase()}`).remove()
            .then(() => {
                console.log(`User ${username} has been deleted`);
                
                // Refresh the list
                loadUserManagement();
                
                // Show success message
                alert(`✅ User "${username}" has been permanently deleted.`);
            })
            .catch((error) => {
                console.error('Error deleting user:', error);
                alert('Failed to delete user. Please try again.');
            });
    } else {
        // Delete from localStorage
        const registeredUsers = getRegisteredUsers();
        if (registeredUsers[username.toLowerCase()]) {
            delete registeredUsers[username.toLowerCase()];
            
            try {
                localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
                console.log(`User ${username} has been deleted`);
                loadUserManagement(); // Refresh the list
                
                // Show success message
                alert(`✅ User "${username}" has been permanently deleted.`);
            } catch (e) {
                console.error('Error deleting user:', e);
                alert('Failed to delete user. Please try again.');
            }
        } else {
            alert('User not found.');
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
    updateTempChatButtonVisibility();
}

// Function for chat.js to check if temporary sessions are allowed
function areTemporarySessionsAllowed() {
    return allowTemporarySessions;
}

// Function to update the temp chat button visibility and PIN description
function updateTempChatButtonVisibility() {
    const tempChatBtn = document.getElementById('tempChat');
    const pinDescription = document.getElementById('pinDescription');
    const buttonSpacer = document.getElementById('buttonSpacer');
    
    if (tempChatBtn) {
        if (allowTemporarySessions) {
            tempChatBtn.style.display = '';
        } else {
            tempChatBtn.style.display = 'none';
        }
    }
    
    if (pinDescription) {
        if (allowTemporarySessions) {
            pinDescription.style.display = '';
        } else {
            pinDescription.style.display = 'none';
        }
    }
    
    if (buttonSpacer) {
        if (allowTemporarySessions) {
            buttonSpacer.style.display = 'none';
        } else {
            buttonSpacer.style.display = '';
        }
    }
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

// Room Management Functions
function loadRoomManagement() {
    if (!isAdmin) return;
    
    console.log('Loading room management...');
    
    if (isFirebaseEnabled) {
        // Load rooms from Firebase adminSettings
        database.ref('adminSettings/rooms').once('value')
            .then((snapshot) => {
                const firebaseRooms = snapshot.val();
                if (firebaseRooms) {
                    // Use Firebase rooms
                    updateRoomManagementUI(firebaseRooms);
                } else {
                    // Migrate hardcoded rooms to Firebase
                    console.log('No rooms in Firebase, migrating hardcoded rooms...');
                    migrateRoomsToFirebase();
                }
            })
            .catch((error) => {
                console.error('Error loading rooms:', error);
                // Fallback to hardcoded rooms
                updateRoomManagementUI(rooms);
            });
    } else {
        // Load from localStorage or use hardcoded rooms
        try {
            const storedRooms = localStorage.getItem('adminRooms');
            if (storedRooms) {
                updateRoomManagementUI(JSON.parse(storedRooms));
            } else {
                updateRoomManagementUI(rooms);
            }
        } catch (e) {
            console.error('Error loading rooms from localStorage:', e);
            updateRoomManagementUI(rooms);
        }
    }
}

function migrateRoomsToFirebase() {
    if (!isFirebaseEnabled) return;
    
    database.ref('adminSettings/rooms').set(rooms)
        .then(() => {
            console.log('Rooms migrated to Firebase successfully');
            updateRoomManagementUI(rooms);
        })
        .catch((error) => {
            console.error('Error migrating rooms to Firebase:', error);
            updateRoomManagementUI(rooms);
        });
}

function updateRoomManagementUI(roomsData) {
    const roomListContainer = document.getElementById('roomListContainer');
    if (!roomListContainer) return;
    
    roomListContainer.innerHTML = '';
    
    // Sort rooms with "general" first, then alphabetically
    const roomEntries = Object.entries(roomsData);
    const sortedRoomEntries = roomEntries.sort(([roomIdA], [roomIdB]) => {
        // Always put "general" first
        if (roomIdA === 'general') return -1;
        if (roomIdB === 'general') return 1;
        // Then sort alphabetically
        return roomIdA.localeCompare(roomIdB);
    });
    
    sortedRoomEntries.forEach(([roomId, roomName]) => {
        const roomItem = document.createElement('div');
        roomItem.className = 'room-item';
        
        roomItem.innerHTML = `
            <div class="room-info">
                <span class="room-name">${roomName}</span>
                <span class="room-id">${roomId}</span>
            </div>
            <div class="room-actions">
                <button class="reset-room-btn" onclick="resetRoom('${roomId}')">🔄 Reset</button>
                <button class="delete-room-btn" onclick="deleteRoom('${roomId}')">🗑️ Delete</button>
            </div>
        `;
        
        roomListContainer.appendChild(roomItem);
    });
}

function addRoom() {
    if (!isAdmin) return;
    
    const roomName = prompt('Enter room name (with emoji):');
    if (!roomName || roomName.trim() === '') return;
    
    const roomId = prompt('Enter room ID (lowercase, no spaces):');
    if (!roomId || roomId.trim() === '') return;
    
    // Validate room ID
    if (!/^[a-z0-9-_]+$/.test(roomId.trim())) {
        alert('Room ID can only contain lowercase letters, numbers, hyphens, and underscores.');
        return;
    }
    
    const trimmedRoomId = roomId.trim().toLowerCase();
    const trimmedRoomName = roomName.trim();
    
    if (isFirebaseEnabled) {
        // Check if room already exists
        database.ref('adminSettings/rooms').once('value')
            .then((snapshot) => {
                const currentRooms = snapshot.val() || {};
                
                if (currentRooms[trimmedRoomId]) {
                    alert('A room with this ID already exists!');
                    return;
                }
                
                // Add new room
                database.ref(`adminSettings/rooms/${trimmedRoomId}`).set(trimmedRoomName)
                    .then(() => {
                        console.log(`Room "${trimmedRoomName}" (${trimmedRoomId}) added successfully`);
                        loadRoomManagement(); // Refresh the list
                        alert(`✅ Room "${trimmedRoomName}" added successfully!`);
                        
                        // Trigger room list update in chat interface
                        if (typeof updateRoomSelector === 'function') {
                            updateRoomSelector();
                        }
                    })
                    .catch((error) => {
                        console.error('Error adding room:', error);
                        alert('Failed to add room. Please try again.');
                    });
            })
            .catch((error) => {
                console.error('Error checking existing rooms:', error);
                alert('Failed to check existing rooms. Please try again.');
            });
    } else {
        // Local storage mode
        try {
            const storedRooms = localStorage.getItem('adminRooms');
            const currentRooms = storedRooms ? JSON.parse(storedRooms) : { ...rooms };
            
            if (currentRooms[trimmedRoomId]) {
                alert('A room with this ID already exists!');
                return;
            }
            
            currentRooms[trimmedRoomId] = trimmedRoomName;
            localStorage.setItem('adminRooms', JSON.stringify(currentRooms));
            
            console.log(`Room "${trimmedRoomName}" (${trimmedRoomId}) added successfully`);
            loadRoomManagement(); // Refresh the list
            alert(`✅ Room "${trimmedRoomName}" added successfully!`);
        } catch (e) {
            console.error('Error adding room to localStorage:', e);
            alert('Failed to add room. Please try again.');
        }
    }
}

function deleteRoom(roomId) {
    if (!isAdmin) return;
    
    if (!confirm(`⚠️ Are you sure you want to delete the room "${roomId}"?\n\nThis will permanently delete all messages in this room and cannot be undone!`)) {
        return;
    }
    
    // Double confirmation
    const confirmText = prompt(`Final confirmation: Type "DELETE" (all caps) to confirm deletion of room "${roomId}"`);
    if (confirmText !== 'DELETE') {
        alert('Deletion cancelled. You must type "DELETE" exactly to confirm.');
        return;
    }
    
    if (isFirebaseEnabled) {
        // Delete room and all its messages
        const deletePromises = [
            database.ref(`adminSettings/rooms/${roomId}`).remove(),
            database.ref(`messages/${roomId}`).remove()
        ];
        
        Promise.all(deletePromises)
            .then(() => {
                console.log(`Room "${roomId}" deleted successfully`);
                loadRoomManagement(); // Refresh the list
                alert(`✅ Room "${roomId}" has been permanently deleted.`);
                
                // Trigger room list update in chat interface
                if (typeof updateRoomSelector === 'function') {
                    updateRoomSelector();
                }
            })
            .catch((error) => {
                console.error('Error deleting room:', error);
                alert('Failed to delete room. Please try again.');
            });
    } else {
        // Local storage mode
        try {
            const storedRooms = localStorage.getItem('adminRooms');
            const currentRooms = storedRooms ? JSON.parse(storedRooms) : { ...rooms };
            
            delete currentRooms[roomId];
            localStorage.setItem('adminRooms', JSON.stringify(currentRooms));
            
            // Also remove messages for this room
            const storedMessages = localStorage.getItem('chatMessages');
            if (storedMessages) {
                const allMessages = JSON.parse(storedMessages);
                delete allMessages[roomId];
                localStorage.setItem('chatMessages', JSON.stringify(allMessages));
            }
            
            console.log(`Room "${roomId}" deleted successfully`);
            loadRoomManagement(); // Refresh the list
            alert(`✅ Room "${roomId}" has been permanently deleted.`);
        } catch (e) {
            console.error('Error deleting room from localStorage:', e);
            alert('Failed to delete room. Please try again.');
        }
    }
}

function resetRoom(roomId) {
    if (!isAdmin) return;
    
    if (!confirm(`⚠️ Are you sure you want to reset all messages in room "${roomId}"?\n\nThis will permanently delete all chat history for this room and cannot be undone!`)) {
        return;
    }
    
    if (isFirebaseEnabled) {
        // Delete all messages in the room
        database.ref(`messages/${roomId}`).remove()
            .then(() => {
                console.log(`Room "${roomId}" reset successfully`);
                alert(`✅ Room "${roomId}" chat history has been cleared.`);
                
                // Refresh messages if user is currently in this room
                if (typeof currentRoom !== 'undefined' && currentRoom === roomId) {
                    if (typeof loadMessages === 'function') {
                        loadMessages(roomId);
                    }
                }
            })
            .catch((error) => {
                console.error('Error resetting room:', error);
                alert('Failed to reset room. Please try again.');
            });
    } else {
        // Local storage mode
        try {
            const storedMessages = localStorage.getItem('chatMessages');
            if (storedMessages) {
                const allMessages = JSON.parse(storedMessages);
                delete allMessages[roomId];
                localStorage.setItem('chatMessages', JSON.stringify(allMessages));
            }
            
            console.log(`Room "${roomId}" reset successfully`);
            alert(`✅ Room "${roomId}" chat history has been cleared.`);
        } catch (e) {
            console.error('Error resetting room in localStorage:', e);
            alert('Failed to reset room. Please try again.');
        }
    }
}

// Auto-Purge Functionality
let autoPurgeEnabled = false;
let purgeIntervalDays = 90;

function loadAutoPurgeSettings() {
    if (isFirebaseEnabled) {
        // Load from Firebase
        database.ref('adminSettings/autoPurge').once('value')
            .then((snapshot) => {
                const settings = snapshot.val() || {};
                autoPurgeEnabled = settings.enabled || false;
                purgeIntervalDays = settings.intervalDays || 90;
                updateAutoPurgeUI();
            })
            .catch((error) => {
                console.log('Could not load auto-purge settings from Firebase:', error);
                updateAutoPurgeUI();
            });
    } else {
        // Load from localStorage
        try {
            const settings = localStorage.getItem('autoPurgeSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                autoPurgeEnabled = parsed.enabled || false;
                purgeIntervalDays = parsed.intervalDays || 90;
            }
            updateAutoPurgeUI();
        } catch (e) {
            console.log('Could not load auto-purge settings from localStorage:', e);
            updateAutoPurgeUI();
        }
    }
}

function saveAutoPurgeSettings() {
    // Get current values from UI
    const toggle = document.getElementById('autoPurgeToggle');
    const interval = document.getElementById('purgeInterval');
    
    if (toggle) autoPurgeEnabled = toggle.checked;
    if (interval) purgeIntervalDays = parseInt(interval.value);
    
    const settings = {
        enabled: autoPurgeEnabled,
        intervalDays: purgeIntervalDays,
        lastUpdated: Date.now()
    };
    
    if (isFirebaseEnabled) {
        // Save to Firebase
        database.ref('adminSettings/autoPurge').set(settings)
            .then(() => {
                console.log('Auto-purge settings saved to Firebase');
            })
            .catch((error) => {
                console.error('Failed to save auto-purge settings to Firebase:', error);
            });
    } else {
        // Save to localStorage
        try {
            localStorage.setItem('autoPurgeSettings', JSON.stringify(settings));
            console.log('Auto-purge settings saved to localStorage');
        } catch (e) {
            console.error('Failed to save auto-purge settings to localStorage:', e);
        }
    }
}

function updateAutoPurgeUI() {
    const toggle = document.getElementById('autoPurgeToggle');
    const interval = document.getElementById('purgeInterval');
    
    if (toggle) {
        toggle.checked = autoPurgeEnabled;
    }
    
    if (interval) {
        interval.value = purgeIntervalDays.toString();
    }
    
    togglePurgeSettings(autoPurgeEnabled);
}

function togglePurgeSettings(show) {
    const purgeSettings = document.getElementById('purgeSettings');
    if (purgeSettings) {
        if (show) {
            purgeSettings.classList.remove('hidden');
        } else {
            purgeSettings.classList.add('hidden');
            // Also hide preview if settings are hidden
            const purgePreview = document.getElementById('purgePreview');
            if (purgePreview) {
                purgePreview.classList.add('hidden');
            }
        }
    }
}

function previewPurge() {
    if (!isAdmin) return;
    
    console.log('Generating purge preview...');
    
    const interval = document.getElementById('purgeInterval');
    const days = interval ? parseInt(interval.value) : purgeIntervalDays;
    
    if (isFirebaseEnabled) {
        // Preview from Firebase
        database.ref('registeredUsers').once('value')
            .then((snapshot) => {
                const users = snapshot.val() || {};
                const toDelete = getInactiveUsers(users, days);
                displayPurgePreview(toDelete);
            })
            .catch((error) => {
                console.error('Error loading users for preview:', error);
                alert('Failed to load user data for preview.');
            });
    } else {
        // Preview from localStorage
        try {
            const users = getRegisteredUsers();
            const toDelete = getInactiveUsers(users, days);
            displayPurgePreview(toDelete);
        } catch (e) {
            console.error('Error loading users for preview:', e);
            alert('Failed to load user data for preview.');
        }
    }
}

function getInactiveUsers(users, days) {
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    const inactiveUsers = [];
    
    Object.entries(users).forEach(([username, userData]) => {
        // Skip admin user
        if (username === ADMIN_USERNAME.toLowerCase()) return;
        
        // Skip if userData is missing or corrupted
        if (!userData || typeof userData !== 'object') return;
        
        // Determine last activity date
        const lastSeen = userData.lastSeen || userData.registeredDate || 0;
        
        if (lastSeen < cutoffDate) {
            const daysSinceActivity = Math.floor((Date.now() - lastSeen) / (24 * 60 * 60 * 1000));
            inactiveUsers.push({
                username: userData.username || username,
                lastSeen: lastSeen,
                daysSinceActivity: daysSinceActivity,
                registeredDate: userData.registeredDate || 0
            });
        }
    });
    
    // Sort by days since activity (most inactive first)
    inactiveUsers.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
    
    return inactiveUsers;
}

function displayPurgePreview(inactiveUsers) {
    const purgePreview = document.getElementById('purgePreview');
    const previewCount = document.getElementById('previewCount');
    const previewList = document.getElementById('previewList');
    
    if (!purgePreview || !previewCount || !previewList) return;
    
    purgePreview.classList.remove('hidden');
    previewCount.textContent = `${inactiveUsers.length} users`;
    
    if (inactiveUsers.length === 0) {
        previewList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No inactive users found for the selected time period.</div>';
        return;
    }
    
    previewList.innerHTML = '';
    
    inactiveUsers.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'preview-user';
        
        const lastSeenText = user.lastSeen ? new Date(user.lastSeen).toLocaleDateString() : 'Unknown';
        
        userDiv.innerHTML = `
            <div class="preview-user-name">${user.username}</div>
            <div class="preview-user-info">Inactive for ${user.daysSinceActivity} days (last seen: ${lastSeenText})</div>
        `;
        
        previewList.appendChild(userDiv);
    });
}

function executePurge() {
    if (!isAdmin) return;
    
    const interval = document.getElementById('purgeInterval');
    const days = interval ? parseInt(interval.value) : purgeIntervalDays;
    
    if (!confirm(`⚠️ WARNING: This will permanently delete all users who have been inactive for more than ${days} days.\n\nAdmin accounts are preserved. This action cannot be undone.\n\nAre you sure you want to proceed?`)) {
        return;
    }
    
    // Double confirmation
    const confirmText = prompt(`Final confirmation: Type "PURGE" (all caps) to confirm deletion of inactive users:`);
    if (confirmText !== 'PURGE') {
        alert('Purge cancelled. You must type "PURGE" exactly to confirm.');
        return;
    }
    
    console.log(`Executing purge for users inactive longer than ${days} days...`);
    
    if (isFirebaseEnabled) {
        // Purge from Firebase
        database.ref('registeredUsers').once('value')
            .then((snapshot) => {
                const users = snapshot.val() || {};
                const toDelete = getInactiveUsers(users, days);
                
                if (toDelete.length === 0) {
                    alert('No inactive users found to purge.');
                    return;
                }
                
                // Delete users from Firebase
                const deletePromises = toDelete.map(user => 
                    database.ref(`registeredUsers/${user.username.toLowerCase()}`).remove()
                );
                
                Promise.all(deletePromises)
                    .then(() => {
                        console.log(`Successfully purged ${toDelete.length} inactive users`);
                        alert(`✅ Successfully purged ${toDelete.length} inactive users.`);
                        
                        // Refresh user management list
                        loadUserManagement();
                        
                        // Refresh preview
                        previewPurge();
                    })
                    .catch((error) => {
                        console.error('Error during purge:', error);
                        alert('Some users could not be deleted. Please check the console for details.');
                    });
            })
            .catch((error) => {
                console.error('Error loading users for purge:', error);
                alert('Failed to load user data for purge.');
            });
    } else {
        // Purge from localStorage
        try {
            const users = getRegisteredUsers();
            const toDelete = getInactiveUsers(users, days);
            
            if (toDelete.length === 0) {
                alert('No inactive users found to purge.');
                return;
            }
            
            // Delete users from localStorage
            toDelete.forEach(user => {
                delete users[user.username.toLowerCase()];
            });
            
            localStorage.setItem('registeredUsers', JSON.stringify(users));
            
            console.log(`Successfully purged ${toDelete.length} inactive users`);
            alert(`✅ Successfully purged ${toDelete.length} inactive users.`);
            
            // Refresh user management list
            loadUserManagement();
            
            // Refresh preview
            previewPurge();
        } catch (e) {
            console.error('Error during purge:', e);
            alert('Failed to purge users. Please try again.');
        }
    }
}

// Storage Management Functionality
let autoDeleteEnabled = true;
let storageThresholdPercent = 80;
const STORAGE_LIMIT_GB = 1;
const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_GB * 1024 * 1024 * 1024;

function loadStorageSettings() {
    if (isFirebaseEnabled) {
        // Load from Firebase
        database.ref('adminSettings/storageManagement').once('value')
            .then((snapshot) => {
                const settings = snapshot.val() || {};
                autoDeleteEnabled = settings.enabled !== false; // Default to true
                storageThresholdPercent = settings.threshold || 80;
                updateStorageUI();
                updateStorageDisplay();
            })
            .catch((error) => {
                console.log('Could not load storage settings from Firebase:', error);
                updateStorageUI();
                updateStorageDisplay();
            });
    } else {
        // Load from localStorage
        try {
            const settings = localStorage.getItem('storageSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                autoDeleteEnabled = parsed.enabled !== false;
                storageThresholdPercent = parsed.threshold || 80;
            }
            updateStorageUI();
            updateStorageDisplay();
        } catch (e) {
            console.log('Could not load storage settings from localStorage:', e);
            updateStorageUI();
            updateStorageDisplay();
        }
    }
}

function saveStorageSettings() {
    // Get current values from UI
    const toggle = document.getElementById('autoDeleteToggle');
    const threshold = document.getElementById('storageThreshold');
    
    if (toggle) autoDeleteEnabled = toggle.checked;
    if (threshold) storageThresholdPercent = parseInt(threshold.value);
    
    const settings = {
        enabled: autoDeleteEnabled,
        threshold: storageThresholdPercent,
        lastUpdated: Date.now()
    };
    
    if (isFirebaseEnabled) {
        // Save to Firebase
        database.ref('adminSettings/storageManagement').set(settings)
            .then(() => {
                console.log('Storage settings saved to Firebase');
            })
            .catch((error) => {
                console.error('Failed to save storage settings to Firebase:', error);
            });
    } else {
        // Save to localStorage
        try {
            localStorage.setItem('storageSettings', JSON.stringify(settings));
            console.log('Storage settings saved to localStorage');
        } catch (e) {
            console.error('Failed to save storage settings to localStorage:', e);
        }
    }
}

function updateStorageUI() {
    const toggle = document.getElementById('autoDeleteToggle');
    const threshold = document.getElementById('storageThreshold');
    
    if (toggle) {
        toggle.checked = autoDeleteEnabled;
    }
    
    if (threshold) {
        threshold.value = storageThresholdPercent.toString();
    }
    
    toggleStorageSettings(autoDeleteEnabled);
}

function toggleStorageSettings(show) {
    const autoDeleteSettings = document.getElementById('autoDeleteSettings');
    if (autoDeleteSettings) {
        if (show) {
            autoDeleteSettings.classList.remove('hidden');
        } else {
            autoDeleteSettings.classList.add('hidden');
        }
    }
}

function updateStorageDisplay() {
    if (!isFirebaseEnabled) {
        // For localStorage mode, calculate approximate storage
        calculateLocalStorageUsage();
        return;
    }
    
    // Calculate Firebase storage usage
    Promise.all([
        database.ref('registeredUsers').once('value'),
        database.ref('messages').once('value')
    ]).then(([registeredSnapshot, messagesSnapshot]) => {
        
        const registeredUsers = registeredSnapshot.val() || {};
        const allMessages = messagesSnapshot.val() || {};
        
        // Calculate storage usage (same as in loadUsageStatistics)
        const dataString = JSON.stringify({
            registeredUsers,
            messages: allMessages
        });
        const storageBytes = new Blob([dataString]).size;
        const storageKB = (storageBytes / 1024).toFixed(2);
        const storageMB = (storageBytes / (1024 * 1024)).toFixed(2);
        const storagePercentage = ((storageBytes / STORAGE_LIMIT_BYTES) * 100).toFixed(1);
        
        // Update storage display
        const currentStorageUsage = document.getElementById('currentStorageUsage');
        if (currentStorageUsage) {
            if (storageBytes < 1024 * 1024) {
                currentStorageUsage.textContent = `${storageKB} KB (${storagePercentage}%)`;
            } else {
                currentStorageUsage.textContent = `${storageMB} MB (${storagePercentage}%)`;
            }
            
            // Color code based on usage
            if (parseFloat(storagePercentage) >= 90) {
                currentStorageUsage.style.color = '#dc3545'; // Red
            } else if (parseFloat(storagePercentage) >= 70) {
                currentStorageUsage.style.color = '#ffc107'; // Yellow
            } else {
                currentStorageUsage.style.color = '#4a90e2'; // Blue
            }
        }
        
        // Check if cleanup is needed
        if (autoDeleteEnabled && parseFloat(storagePercentage) >= storageThresholdPercent) {
            console.log(`Storage threshold reached (${storagePercentage}% >= ${storageThresholdPercent}%), triggering automatic cleanup...`);
            performStorageCleanup(false); // Automatic cleanup
        }
        
    }).catch(error => {
        console.error('Error calculating storage usage:', error);
        const currentStorageUsage = document.getElementById('currentStorageUsage');
        if (currentStorageUsage) {
            currentStorageUsage.textContent = 'Error calculating';
            currentStorageUsage.style.color = '#dc3545';
        }
    });
}

function calculateLocalStorageUsage() {
    try {
        // Estimate localStorage usage
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
            }
        }
        
        const storageKB = (totalSize / 1024).toFixed(2);
        const storageMB = (totalSize / (1024 * 1024)).toFixed(2);
        const storagePercentage = ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(1); // Assume 5MB localStorage limit
        
        const currentStorageUsage = document.getElementById('currentStorageUsage');
        if (currentStorageUsage) {
            if (totalSize < 1024 * 1024) {
                currentStorageUsage.textContent = `${storageKB} KB (${storagePercentage}%)`;
            } else {
                currentStorageUsage.textContent = `${storageMB} MB (${storagePercentage}%)`;
            }
            currentStorageUsage.style.color = '#4a90e2';
        }
    } catch (e) {
        console.error('Error calculating localStorage usage:', e);
        const currentStorageUsage = document.getElementById('currentStorageUsage');
        if (currentStorageUsage) {
            currentStorageUsage.textContent = 'Error calculating';
            currentStorageUsage.style.color = '#dc3545';
        }
    }
}

function manualStorageCleanup() {
    if (!isAdmin) return;
    
    if (!confirm(`⚠️ This will delete the oldest messages to free up storage space.\n\nAre you sure you want to proceed with manual cleanup?`)) {
        return;
    }
    
    performStorageCleanup(true); // Manual cleanup
}

function performStorageCleanup(isManual = false) {
    if (!isFirebaseEnabled) {
        if (isManual) {
            alert('Storage cleanup is not available in localStorage mode.');
        }
        return;
    }
    
    console.log(`Performing ${isManual ? 'manual' : 'automatic'} storage cleanup...`);
    
    // Get all messages with timestamps
    database.ref('messages').once('value')
        .then((snapshot) => {
            const allMessages = snapshot.val() || {};
            const messagesList = [];
            
            // Collect all messages with room and timestamp info
            Object.keys(allMessages).forEach(roomName => {
                const roomMessages = allMessages[roomName] || {};
                Object.keys(roomMessages).forEach(messageId => {
                    const message = roomMessages[messageId];
                    if (message && message.id) {
                        messagesList.push({
                            roomName: roomName,
                            messageId: messageId,
                            timestamp: message.id, // Using message.id as timestamp
                            message: message
                        });
                    }
                });
            });
            
            if (messagesList.length === 0) {
                if (isManual) {
                    alert('No messages found to clean up.');
                }
                return;
            }
            
            // Sort messages by timestamp (oldest first)
            messagesList.sort((a, b) => a.timestamp - b.timestamp);
            
            // Delete oldest 20% of messages
            const deleteCount = Math.max(1, Math.floor(messagesList.length * 0.2));
            const toDelete = messagesList.slice(0, deleteCount);
            
            console.log(`Deleting ${deleteCount} oldest messages out of ${messagesList.length} total`);
            
            // Delete messages from Firebase
            const deletePromises = toDelete.map(item => 
                database.ref(`messages/${item.roomName}/${item.messageId}`).remove()
            );
            
            Promise.all(deletePromises)
                .then(() => {
                    console.log(`Successfully deleted ${deleteCount} old messages`);
                    
                    if (isManual) {
                        alert(`✅ Successfully deleted ${deleteCount} old messages to free up space.`);
                    }
                    
                    // Update storage display
                    setTimeout(updateStorageDisplay, 1000); // Give Firebase time to update
                    
                    // Refresh usage statistics if visible
                    if (typeof loadUsageStatistics === 'function') {
                        setTimeout(loadUsageStatistics, 1000);
                    }
                })
                .catch((error) => {
                    console.error('Error during storage cleanup:', error);
                    if (isManual) {
                        alert('Some messages could not be deleted. Please check the console for details.');
                    }
                });
        })
        .catch((error) => {
            console.error('Error loading messages for cleanup:', error);
            if (isManual) {
                alert('Failed to load messages for cleanup.');
            }
        });
}

// Welcome Message Customization
let currentWelcomeMessage = 'Welcome to Friend Chat! 👋';
let currentAppDescription = 'Enter your name to start chatting:';

function loadWelcomeSettings() {
    if (isFirebaseEnabled) {
        // Load from Firebase
        database.ref('adminSettings/welcomeMessages').once('value')
            .then((snapshot) => {
                const settings = snapshot.val() || {};
                currentWelcomeMessage = settings.welcomeMessage || 'Welcome to Friend Chat! 👋';
                currentAppDescription = settings.appDescription || 'Enter your name to start chatting:';
                updateWelcomeUI();
            })
            .catch((error) => {
                console.log('Could not load welcome settings from Firebase:', error);
                updateWelcomeUI();
            });
    } else {
        // Load from localStorage
        try {
            const settings = localStorage.getItem('welcomeSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                currentWelcomeMessage = parsed.welcomeMessage || 'Welcome to Friend Chat! 👋';
                currentAppDescription = parsed.appDescription || 'Enter your name to start chatting:';
            }
            updateWelcomeUI();
        } catch (e) {
            console.log('Could not load welcome settings from localStorage:', e);
            updateWelcomeUI();
        }
    }
}

function updateWelcomeUI() {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const appDescription = document.getElementById('appDescription');
    
    if (welcomeMessage) {
        welcomeMessage.value = currentWelcomeMessage;
    }
    
    if (appDescription) {
        appDescription.value = currentAppDescription;
    }
    
    updateWelcomePreview();
}

function updateWelcomePreview() {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const appDescription = document.getElementById('appDescription');
    const previewWelcomeMessage = document.getElementById('previewWelcomeMessage');
    const previewAppDescription = document.getElementById('previewAppDescription');
    
    if (welcomeMessage && previewWelcomeMessage) {
        const text = welcomeMessage.value.trim() || 'Welcome to Friend Chat! 👋';
        previewWelcomeMessage.textContent = text;
    }
    
    if (appDescription && previewAppDescription) {
        const text = appDescription.value.trim() || 'Enter your name to start chatting:';
        previewAppDescription.textContent = text;
    }
}

function showWelcomePreview() {
    const welcomePreview = document.getElementById('welcomePreview');
    if (welcomePreview) {
        welcomePreview.classList.remove('hidden');
        updateWelcomePreview();
    }
}

function saveWelcomeSettings() {
    if (!isAdmin) return;
    
    const welcomeMessage = document.getElementById('welcomeMessage');
    const appDescription = document.getElementById('appDescription');
    
    if (!welcomeMessage || !appDescription) return;
    
    const newWelcomeMessage = welcomeMessage.value.trim() || 'Welcome to Friend Chat! 👋';
    const newAppDescription = appDescription.value.trim() || 'Enter your name to start chatting:';
    
    const settings = {
        welcomeMessage: newWelcomeMessage,
        appDescription: newAppDescription,
        lastUpdated: Date.now()
    };
    
    if (isFirebaseEnabled) {
        // Save to Firebase
        database.ref('adminSettings/welcomeMessages').set(settings)
            .then(() => {
                console.log('Welcome settings saved to Firebase');
                currentWelcomeMessage = newWelcomeMessage;
                currentAppDescription = newAppDescription;
                
                // Apply changes to the actual login screen
                applyWelcomeChanges();
                
                alert('✅ Welcome message settings saved successfully!');
            })
            .catch((error) => {
                console.error('Failed to save welcome settings to Firebase:', error);
                alert('Failed to save welcome settings. Please try again.');
            });
    } else {
        // Save to localStorage
        try {
            localStorage.setItem('welcomeSettings', JSON.stringify(settings));
            console.log('Welcome settings saved to localStorage');
            currentWelcomeMessage = newWelcomeMessage;
            currentAppDescription = newAppDescription;
            
            // Apply changes to the actual login screen
            applyWelcomeChanges();
            
            alert('✅ Welcome message settings saved successfully!');
        } catch (e) {
            console.error('Failed to save welcome settings to localStorage:', e);
            alert('Failed to save welcome settings. Please try again.');
        }
    }
}

function resetWelcomeSettings() {
    if (!isAdmin) return;
    
    if (!confirm('Are you sure you want to reset the welcome messages to their default values?')) {
        return;
    }
    
    // Reset to defaults
    currentWelcomeMessage = 'Welcome to Friend Chat! 👋';
    currentAppDescription = 'Enter your name to start chatting:';
    
    // Update UI
    updateWelcomeUI();
    
    // Save the reset values
    saveWelcomeSettings();
}

function applyWelcomeChanges() {
    // Update the actual login screen elements
    const loginWelcomeMessage = document.querySelector('#setup h2');
    const loginAppDescription = document.querySelector('#setup p:first-of-type');
    
    if (loginWelcomeMessage) {
        loginWelcomeMessage.textContent = currentWelcomeMessage;
    }
    
    if (loginAppDescription) {
        loginAppDescription.textContent = currentAppDescription;
    }
    
    console.log('Welcome message changes applied to login screen');
}

// Function to load and apply welcome settings on app startup
function loadAndApplyWelcomeSettings() {
    if (isFirebaseEnabled) {
        database.ref('adminSettings/welcomeMessages').once('value')
            .then((snapshot) => {
                const settings = snapshot.val() || {};
                currentWelcomeMessage = settings.welcomeMessage || 'Welcome to Friend Chat! 👋';
                currentAppDescription = settings.appDescription || 'Enter your name to start chatting:';
                applyWelcomeChanges();
            })
            .catch((error) => {
                console.log('Could not load welcome settings from Firebase:', error);
            });
    } else {
        try {
            const settings = localStorage.getItem('welcomeSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                currentWelcomeMessage = parsed.welcomeMessage || 'Welcome to Friend Chat! 👋';
                currentAppDescription = parsed.appDescription || 'Enter your name to start chatting:';
                applyWelcomeChanges();
            }
        } catch (e) {
            console.log('Could not load welcome settings from localStorage:', e);
        }
    }
}

// Private Chat Control
let privateChatEnabled = true;

function loadPrivateChatSettings() {
    if (isFirebaseEnabled) {
        // Load from Firebase
        database.ref('adminSettings/privateChatEnabled').once('value')
            .then((snapshot) => {
                const setting = snapshot.val();
                privateChatEnabled = setting !== null ? setting : true; // Default to true
                updatePrivateChatToggle();
                updatePrivateChatVisibility(privateChatEnabled);
            })
            .catch((error) => {
                console.log('Could not load private chat setting from Firebase:', error);
                privateChatEnabled = true; // Default to enabled
                updatePrivateChatToggle();
                updatePrivateChatVisibility(privateChatEnabled);
            });
    } else {
        // Load from localStorage
        try {
            const setting = localStorage.getItem('privateChatEnabled');
            privateChatEnabled = setting !== null ? JSON.parse(setting) : true; // Default to true
            updatePrivateChatToggle();
            updatePrivateChatVisibility(privateChatEnabled);
        } catch (e) {
            console.log('Could not load private chat setting from localStorage:', e);
            privateChatEnabled = true; // Default to enabled
            updatePrivateChatToggle();
            updatePrivateChatVisibility(privateChatEnabled);
        }
    }
}

function savePrivateChatSettings(isEnabled) {
    privateChatEnabled = isEnabled;
    
    if (isFirebaseEnabled) {
        // Save to Firebase
        database.ref('adminSettings/privateChatEnabled').set(isEnabled)
            .then(() => {
                console.log('Private chat setting saved to Firebase');
            })
            .catch((error) => {
                console.error('Failed to save private chat setting to Firebase:', error);
            });
    } else {
        // Save to localStorage
        try {
            localStorage.setItem('privateChatEnabled', JSON.stringify(isEnabled));
            console.log('Private chat setting saved to localStorage');
        } catch (e) {
            console.error('Failed to save private chat setting to localStorage:', e);
        }
    }
}

function updatePrivateChatToggle() {
    const toggle = document.getElementById('privateChatToggle');
    if (toggle) {
        toggle.checked = privateChatEnabled;
    }
}

function updatePrivateChatVisibility(isEnabled) {
    const privateChatBtn = document.getElementById('privateChatBtn');
    if (privateChatBtn) {
        if (isEnabled) {
            privateChatBtn.style.display = '';
        } else {
            privateChatBtn.style.display = 'none';
        }
    }
}

// Function for chat.js to check if private chat is enabled
function isPrivateChatEnabled() {
    return privateChatEnabled;
}

// Function to load and apply private chat settings on app startup
function loadAndApplyPrivateChatSettings() {
    if (isFirebaseEnabled) {
        database.ref('adminSettings/privateChatEnabled').once('value')
            .then((snapshot) => {
                const setting = snapshot.val();
                privateChatEnabled = setting !== null ? setting : true; // Default to true
                updatePrivateChatVisibility(privateChatEnabled);
            })
            .catch((error) => {
                console.log('Could not load private chat setting from Firebase:', error);
            });
    } else {
        try {
            const setting = localStorage.getItem('privateChatEnabled');
            privateChatEnabled = setting !== null ? JSON.parse(setting) : true; // Default to true
            updatePrivateChatVisibility(privateChatEnabled);
        } catch (e) {
            console.log('Could not load private chat setting from localStorage:', e);
        }
    }
}