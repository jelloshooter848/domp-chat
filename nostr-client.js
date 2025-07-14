/**
 * Nostr Client for Friend Chat App
 * Handles connection to Nostr relays and event management
 */

class NostrClient {
    constructor() {
        this.relays = [
            'wss://relay.damus.io',
            'wss://nostr-pub.wellorder.net',
            'wss://relay.nostr.info',
            'wss://nos.lol'
        ];
        this.pool = null;
        this.privateKey = null;
        this.publicKey = null;
        this.connected = false;
        this.subscriptions = new Map();
        this.messageCallbacks = new Map();
        this.userPresenceCallbacks = new Map();
        this.privateMessageCallbacks = new Map();
        
        // Initialize nostr-tools
        this.NostrTools = window.NostrTools;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Nostr client...');
            
            // Generate or load key pair
            await this.setupKeyPair();
            console.log('🔑 Key pair ready');
            
            // Initialize relay pool
            this.pool = new this.NostrTools.SimplePool();
            console.log('🏊 Pool initialized');
            
            // Connect to relays with timeout
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), 8000)
            );
            
            await Promise.race([
                this.connectToRelays(),
                timeoutPromise
            ]);
            
            this.connected = true;
            console.log('✅ Nostr client initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Nostr client:', error);
            return false;
        }
    }

    async setupKeyPair() {
        // Try to load existing keys from localStorage
        const storedPrivateKey = localStorage.getItem('nostr_private_key');
        
        if (storedPrivateKey) {
            this.privateKey = storedPrivateKey;
        } else {
            // Generate new key pair
            this.privateKey = this.NostrTools.generateSecretKey();
            localStorage.setItem('nostr_private_key', this.privateKey);
        }
        
        this.publicKey = this.NostrTools.getPublicKey(this.privateKey);
        console.log('Nostr public key:', this.publicKey);
    }

    async connectToRelays() {
        console.log('🔗 Testing relay connections...');
        
        // Test connectivity to relays
        const connectPromises = this.relays.map(relay => {
            return new Promise((resolve) => {
                console.log(`   Testing ${relay}...`);
                const ws = new WebSocket(relay);
                ws.onopen = () => {
                    console.log(`   ✅ ${relay} connected`);
                    ws.close();
                    resolve(relay);
                };
                ws.onerror = () => {
                    console.log(`   ❌ ${relay} failed`);
                    resolve(null);
                };
                setTimeout(() => {
                    console.log(`   ⏰ ${relay} timeout`);
                    resolve(null);
                }, 3000); // 3s timeout per relay
            });
        });

        const results = await Promise.all(connectPromises);
        const workingRelays = results.filter(relay => relay !== null);
        
        if (workingRelays.length === 0) {
            throw new Error('No working relays found');
        }
        
        this.relays = workingRelays;
        console.log(`🎯 Connected to ${workingRelays.length}/${results.length} relays:`, workingRelays);
    }

    // Send a message to a room
    async sendMessage(roomName, messageText, username) {
        if (!this.connected) {
            throw new Error('Nostr client not connected');
        }

        const event = {
            kind: 1, // Text note
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', `friendchat_${roomName}`], // Room tag
                ['client', 'friendchat']
            ],
            content: JSON.stringify({
                type: 'message',
                room: roomName,
                username: username,
                text: messageText,
                timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                id: Date.now()
            }),
            pubkey: this.publicKey
        };

        const signedEvent = this.NostrTools.finalizeEvent(event, this.privateKey);
        
        try {
            await this.pool.publish(this.relays, signedEvent);
            return signedEvent;
        } catch (error) {
            console.error('Failed to send message:', error);
            throw error;
        }
    }

    // Send a private message
    async sendPrivateMessage(recipientPubkey, messageText, username) {
        if (!this.connected) {
            throw new Error('Nostr client not connected');
        }

        const messageContent = JSON.stringify({
            type: 'private_message',
            from: username,
            text: messageText,
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            id: Date.now()
        });

        // Encrypt the message
        const encryptedContent = await this.NostrTools.nip04.encrypt(
            this.privateKey,
            recipientPubkey,
            messageContent
        );

        const event = {
            kind: 4, // Encrypted direct message
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['p', recipientPubkey],
                ['client', 'friendchat']
            ],
            content: encryptedContent,
            pubkey: this.publicKey
        };

        const signedEvent = this.NostrTools.finalizeEvent(event, this.privateKey);
        
        try {
            await this.pool.publish(this.relays, signedEvent);
            return signedEvent;
        } catch (error) {
            console.error('Failed to send private message:', error);
            throw error;
        }
    }

    // Subscribe to room messages
    subscribeToRoom(roomName, callback) {
        if (!this.connected) {
            console.warn('Cannot subscribe: Nostr client not connected');
            return null;
        }

        const filter = {
            kinds: [1],
            '#t': [`friendchat_${roomName}`],
            since: Math.floor(Date.now() / 1000) - 3600, // Last hour
            limit: 50
        };

        const subId = `room_${roomName}_${Date.now()}`;
        
        const sub = this.pool.subscribeMany(this.relays, [filter], {
            onevent: (event) => {
                try {
                    const messageData = JSON.parse(event.content);
                    if (messageData.type === 'message' && messageData.room === roomName) {
                        callback(messageData, event);
                    }
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            },
            oneose: () => {
                console.log(`Subscription to room ${roomName} established`);
            }
        });

        this.subscriptions.set(subId, sub);
        this.messageCallbacks.set(subId, callback);
        
        return subId;
    }

    // Subscribe to private messages
    subscribeToPrivateMessages(callback) {
        if (!this.connected) {
            console.warn('Cannot subscribe: Nostr client not connected');
            return null;
        }

        const filter = {
            kinds: [4],
            '#p': [this.publicKey],
            since: Math.floor(Date.now() / 1000) - 86400, // Last 24 hours
            limit: 50
        };

        const subId = `private_${this.publicKey}_${Date.now()}`;
        
        const sub = this.pool.subscribeMany(this.relays, [filter], {
            onevent: async (event) => {
                try {
                    // Decrypt the message
                    const decryptedContent = await this.NostrTools.nip04.decrypt(
                        this.privateKey,
                        event.pubkey,
                        event.content
                    );
                    
                    const messageData = JSON.parse(decryptedContent);
                    if (messageData.type === 'private_message') {
                        callback(messageData, event);
                    }
                } catch (error) {
                    console.error('Error decrypting private message:', error);
                }
            },
            oneose: () => {
                console.log('Private message subscription established');
            }
        });

        this.subscriptions.set(subId, sub);
        this.privateMessageCallbacks.set(subId, callback);
        
        return subId;
    }

    // Update user presence
    async updatePresence(username, isOnline) {
        if (!this.connected) {
            return;
        }

        const event = {
            kind: 1, // Text note for presence
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['t', 'friendchat_presence'],
                ['client', 'friendchat']
            ],
            content: JSON.stringify({
                type: 'presence',
                username: username,
                online: isOnline,
                timestamp: Date.now()
            }),
            pubkey: this.publicKey
        };

        const signedEvent = this.NostrTools.finalizeEvent(event, this.privateKey);
        
        try {
            await this.pool.publish(this.relays, signedEvent);
        } catch (error) {
            console.error('Failed to update presence:', error);
        }
    }

    // Subscribe to user presence updates
    subscribeToPresence(callback) {
        if (!this.connected) {
            return null;
        }

        const filter = {
            kinds: [1],
            '#t': ['friendchat_presence'],
            since: Math.floor(Date.now() / 1000) - 300, // Last 5 minutes
            limit: 100
        };

        const subId = `presence_${Date.now()}`;
        
        const sub = this.pool.subscribeMany(this.relays, [filter], {
            onevent: (event) => {
                try {
                    const presenceData = JSON.parse(event.content);
                    if (presenceData.type === 'presence') {
                        callback(presenceData, event);
                    }
                } catch (error) {
                    console.error('Error parsing presence:', error);
                }
            }
        });

        this.subscriptions.set(subId, sub);
        this.userPresenceCallbacks.set(subId, callback);
        
        return subId;
    }

    // Unsubscribe from a subscription
    unsubscribe(subId) {
        const sub = this.subscriptions.get(subId);
        if (sub) {
            sub.close();
            this.subscriptions.delete(subId);
            this.messageCallbacks.delete(subId);
            this.userPresenceCallbacks.delete(subId);
            this.privateMessageCallbacks.delete(subId);
        }
    }

    // Clean up all subscriptions
    cleanup() {
        for (const [subId, sub] of this.subscriptions) {
            sub.close();
        }
        this.subscriptions.clear();
        this.messageCallbacks.clear();
        this.userPresenceCallbacks.clear();
        this.privateMessageCallbacks.clear();
    }

    // Get user's public key for private messaging
    getPublicKey() {
        return this.publicKey;
    }

    // Check if connected
    isConnected() {
        return this.connected;
    }

    // Disconnect
    disconnect() {
        this.cleanup();
        if (this.pool) {
            this.pool.close(this.relays);
        }
        this.connected = false;
    }
}

// Global instance
window.nostrClient = new NostrClient();