class TikTokAPI {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.webhookSecret = process.env.TIKTOK_WEBHOOK_SECRET;
    }

    // Handle TikTok webhook events
    handleWebhook(webhookData) {
        console.log('🎁 TikTok Webhook Received:', webhookData);
        
        try {
            const { event, data } = webhookData;
            
            switch(event) {
                case 'gift':
                    this.handleGiftEvent(data);
                    break;
                case 'follow':
                    this.handleFollowEvent(data);
                    break;
                case 'like':
                    this.handleLikeEvent(data);
                    break;
                case 'share':
                    this.handleShareEvent(data);
                    break;
                default:
                    console.log('Unknown webhook event:', event);
            }
        } catch (error) {
            console.error('Error processing TikTok webhook:', error);
        }
    }

    // Handle gift events
    handleGiftEvent(giftData) {
        const { giftId, giftName, repeatCount, userId, secUid, uniqueId } = giftData;
        
        console.log(`🎁 Gift: ${giftName} x${repeatCount} from ${uniqueId}`);
        
        // Map TikTok gifts to game effects
        const giftEffects = {
            'rose': { type: 'draw_card', value: 1 },
            'rocket': { type: 'extra_mana', value: 2 },
            'lion': { type: 'special_card', value: 1 },
            'tiktok': { type: 'draw_card', value: 2 },
            'coin': { type: 'extra_mana', value: 1 },
            'ice_cream': { type: 'heal', value: 3 }
        };

        const effect = giftEffects[giftId] || giftEffects[giftName?.toLowerCase()];
        
        if (effect) {
            this.applyGiftEffect(effect, uniqueId, repeatCount);
        }
    }

    // Apply gift effects to active games
    applyGiftEffect(effect, viewerName, repeatCount = 1) {
        const { type, value } = effect;
        const multiplier = Math.min(repeatCount, 5); // Cap at 5x
        
        // Get all active games (for now, apply to first game)
        // In future, can implement room-based system
        const activeGames = Array.from(this.gameManager.activeGames.values());
        const activeGame = activeGames[0];
        
        if (!activeGame) {
            console.log('No active game found for gift effect');
            return;
        }

        const gameId = activeGame.gameId;
        
        switch(type) {
            case 'draw_card':
                for (let i = 0; i < value * multiplier; i++) {
                    this.gameManager.drawCard(gameId, 'viewers');
                }
                console.log(`🃏 ${viewerName} gifted ${value * multiplier} card draws`);
                break;
                
            case 'extra_mana':
                activeGame.players.viewers.mana += value * multiplier;
                activeGame.players.viewers.mana = Math.min(activeGame.players.viewers.mana, 10);
                console.log(`⚡ ${viewerName} gifted +${value * multiplier} mana`);
                break;
                
            case 'special_card':
                // Add rare card to hand
                const rareCards = ['mana_crystal', 'protective_ward'];
                const randomCard = rareCards[Math.floor(Math.random() * rareCards.length)];
                for (let i = 0; i < value * multiplier; i++) {
                    activeGame.hands.viewers.push(randomCard);
                }
                console.log(`💎 ${viewerName} gifted ${value * multiplier} special cards`);
                break;
                
            case 'heal':
                activeGame.players.viewers.health += value * multiplier;
                activeGame.players.viewers.health = Math.min(activeGame.players.viewers.health, 30);
                console.log(`❤️ ${viewerName} gifted +${value * multiplier} health`);
                break;
        }

        // Update last activity
        activeGame.lastActivity = new Date();
    }

    // Handle follow events
    handleFollowEvent(followData) {
        const { userId, uniqueId } = followData;
        console.log(`👤 New follower: ${uniqueId}`);
        
        // Give small reward for new followers
        this.applyGiftEffect({ type: 'draw_card', value: 1 }, uniqueId);
    }

    // Handle like events
    handleLikeEvent(likeData) {
        const { likeCount, userId, uniqueId } = likeData;
        console.log(`❤️ Like from ${uniqueId}: ${likeCount} likes`);
        
        // Accumulate likes for rewards (implement later)
    }

    // Handle share events
    handleShareEvent(shareData) {
        const { userId, uniqueId } = shareData;
        console.log(`🔄 Share from ${uniqueId}`);
        
        // Give reward for shares
        this.applyGiftEffect({ type: 'extra_mana', value: 1 }, uniqueId);
    }

    // Validate webhook signature (for security)
    validateWebhookSignature(payload, signature) {
        // Implement signature validation when TikTok provides webhook secret
        return true; // For now, accept all webhooks
    }

    // Setup TikTok webhook (to be called during initialization)
    async setupWebhook(webhookUrl) {
        console.log(`🌐 TikTok webhook URL: ${webhookUrl}`);
        // Implementation for TikTok webhook registration goes here
        // This requires TikTok Developer Account setup
    }
}

module.exports = TikTokAPI;
