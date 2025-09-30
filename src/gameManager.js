class GameManager {
    constructor() {
        this.activeGames = new Map();
        this.roomCount = 0;
    }

    // Create new game room
    createGame(roomId = null) {
        const gameId = roomId || `game_${Date.now()}_${++this.roomCount}`;
        
        const gameState = {
            gameId,
            players: {
                streamer: {
                    id: 'streamer',
                    name: 'Streamer',
                    health: 30,
                    maxHealth: 30,
                    mana: 1,
                    maxMana: 1,
                    socketId: null
                },
                viewers: {
                    id: 'viewers', 
                    name: 'Viewers',
                    health: 30,
                    maxHealth: 30,
                    mana: 1,
                    maxMana: 1,
                    socketId: null
                }
            },
            turn: 1,
            currentPlayer: 'viewers',
            phase: 'main',
            board: {
                streamer: [],
                viewers: []
            },
            hands: {
                streamer: [],
                viewers: []
            },
            decks: {
                streamer: this.initializeDeck(),
                viewers: this.initializeDeck()
            },
            status: 'waiting',
            createdAt: new Date(),
            lastActivity: new Date()
        };

        this.activeGames.set(gameId, gameState);
        console.log(`🎮 Created new game: ${gameId}`);
        return gameState;
    }

    // Initialize card deck
    initializeDeck() {
        const cardPool = [
            'young_dragon', 'young_dragon', 'young_dragon',
            'fire_imp', 'fire_imp', 'fire_imp', 
            'forest_guardian', 'forest_guardian',
            'fireball', 'fireball', 'fireball',
            'healing_light', 'healing_light',
            'lightning_bolt', 'lightning_bolt', 'lightning_bolt',
            'mana_crystal',
            'protective_ward', 'protective_ward'
        ];
        
        // Shuffle deck
        for (let i = cardPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cardPool[i], cardPool[j]] = [cardPool[j], cardPool[i]];
        }
        
        return cardPool;
    }

    // Get card database
    getCardDatabase() {
        return {
            'young_dragon': {
                id: 'young_dragon',
                name: 'Young Dragon',
                type: 'creature',
                cost: 3,
                attack: 2,
                health: 3,
                effect: 'Flying: Can attack over creatures',
                rarity: 'common',
                emoji: '🐲'
            },
            'fire_imp': {
                id: 'fire_imp',
                name: 'Fire Imp', 
                type: 'creature',
                cost: 2,
                attack: 3,
                health: 1,
                effect: 'Quick: Can attack immediately',
                rarity: 'common',
                emoji: '👺'
            },
            'forest_guardian': {
                id: 'forest_guardian',
                name: 'Forest Guardian',
                type: 'creature', 
                cost: 4,
                attack: 1,
                health: 5,
                effect: 'Taunt: Enemy must attack this first',
                rarity: 'common',
                emoji: '🌳'
            },
            'fireball': {
                id: 'fireball',
                name: 'Fireball',
                type: 'spell',
                cost: 2, 
                effect: 'Deal 3 damage to any target',
                rarity: 'common',
                emoji: '🔥'
            },
            'healing_light': {
                id: 'healing_light',
                name: 'Healing Light',
                type: 'spell',
                cost: 1,
                effect: 'Restore 4 health to a creature or player',
                rarity: 'common',
                emoji: '✨'
            },
            'lightning_bolt': {
                id: 'lightning_bolt', 
                name: 'Lightning Bolt',
                type: 'spell',
                cost: 1,
                effect: 'Deal 2 damage to any target',
                rarity: 'common',
                emoji: '⚡'
            },
            'mana_crystal': {
                id: 'mana_crystal',
                name: 'Mana Crystal',
                type: 'support',
                cost: 0,
                effect: 'Gain +1 max mana permanently',
                rarity: 'rare',
                emoji: '💎'
            },
            'protective_ward': {
                id: 'protective_ward',
                name: 'Protective Ward',
                type: 'support', 
                cost: 1,
                effect: 'Prevent next 3 damage to your hero',
                rarity: 'uncommon',
                emoji: '🛡️'
            }
        };
    }

    // Get game state
    getGameState(gameId) {
        return this.activeGames.get(gameId);
    }

    // Update game state
    updateGameState(gameId, updates) {
        const gameState = this.activeGames.get(gameId);
        if (gameState) {
            Object.assign(gameState, updates);
            gameState.lastActivity = new Date();
            return true;
        }
        return false;
    }

    // Player plays a card
    playCard(gameId, playerId, cardId) {
        const gameState = this.getGameState(gameId);
        if (!gameState) return { success: false, error: 'Game not found' };

        const player = gameState.players[playerId];
        const cardData = this.getCardDatabase()[cardId];
        
        if (!cardData) return { success: false, error: 'Invalid card' };
        if (player.mana < cardData.cost) return { success: false, error: 'Not enough mana' };
        if (!gameState.hands[playerId].includes(cardId)) return { success: false, error: 'Card not in hand' };

        // Deduct mana
        player.mana -= cardData.cost;

        // Remove from hand
        const handIndex = gameState.hands[playerId].indexOf(cardId);
        gameState.hands[playerId].splice(handIndex, 1);

        // Add to board or process effect
        if (cardData.type === 'creature') {
            gameState.board[playerId].push({
                ...cardData,
                currentHealth: cardData.health,
                canAttack: false
            });
        }

        // Handle other card types (spells, supports) here

        gameState.lastActivity = new Date();
        
        return { 
            success: true, 
            message: `${player.name} played ${cardData.name}`,
            gameState 
        };
    }

    // Draw card for player
    drawCard(gameId, playerId) {
        const gameState = this.getGameState(gameId);
        if (!gameState) return { success: false, error: 'Game not found' };

        const deck = gameState.decks[playerId];
        const hand = gameState.hands[playerId];

        if (deck.length > 0 && hand.length < 10) {
            const cardId = deck.pop();
            hand.push(cardId);
            gameState.lastActivity = new Date();
            return { success: true, cardId, gameState };
        }

        return { success: false, error: 'Cannot draw card' };
    }

    // End turn
    endTurn(gameId) {
        const gameState = this.getGameState(gameId);
        if (!gameState) return { success: false, error: 'Game not found' };

        // Switch players
        const nextPlayer = gameState.currentPlayer === 'viewers' ? 'streamer' : 'viewers';
        gameState.currentPlayer = nextPlayer;
        gameState.turn++;

        // Reset and increase mana for new turn
        const player = gameState.players[nextPlayer];
        player.maxMana = Math.min(player.maxMana + 1, 10);
        player.mana = player.maxMana;

        // Draw card for new turn
        this.drawCard(gameId, nextPlayer);

        // Allow creatures to attack
        gameState.board[nextPlayer].forEach(creature => {
            creature.canAttack = true;
        });

        gameState.lastActivity = new Date();

        return { 
            success: true, 
            message: `Turn ${gameState.turn} - ${nextPlayer.toUpperCase()}'s turn`,
            gameState 
        };
    }

    // Clean up inactive games
    cleanupInactiveGames(maxAge = 3600000) { // 1 hour
        const now = new Date();
        for (const [gameId, gameState] of this.activeGames.entries()) {
            if (now - gameState.lastActivity > maxAge) {
                this.activeGames.delete(gameId);
                console.log(`🧹 Cleaned up inactive game: ${gameId}`);
            }
        }
    }
}

module.exports = GameManager;
