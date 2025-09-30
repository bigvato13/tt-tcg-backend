class SocketHandler {
    constructor(io, gameManager) {
        this.io = io;
        this.gameManager = gameManager;
        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 New connection: ${socket.id}`);

            // Join game room
            socket.on('joinGame', (data) => {
                const { gameId, playerType } = data;
                this.handleJoinGame(socket, gameId, playerType);
            });

            // Play card
            socket.on('playCard', (data) => {
                const { gameId, playerId, cardId } = data;
                this.handlePlayCard(socket, gameId, playerId, cardId);
            });

            // Draw card
            socket.on('drawCard', (data) => {
                const { gameId, playerId } = data;
                this.handleDrawCard(socket, gameId, playerId);
            });

            // End turn
            socket.on('endTurn', (data) => {
                const { gameId } = data;
                this.handleEndTurn(socket, gameId);
            });

            // TikTok gift received
            socket.on('tiktokGift', (data) => {
                const { gameId, giftType, viewerName } = data;
                this.handleTikTokGift(socket, gameId, giftType, viewerName);
            });

            // Disconnect
            socket.on('disconnect', () => {
                console.log(`❌ Disconnected: ${socket.id}`);
                this.handleDisconnect(socket);
            });
        });
    }

    handleJoinGame(socket, gameId, playerType) {
        let gameState = this.gameManager.getGameState(gameId);
        
        // Create new game if doesn't exist
        if (!gameState) {
            gameState = this.gameManager.createGame(gameId);
        }

        // Assign socket to player
        if (gameState.players[playerType]) {
            gameState.players[playerType].socketId = socket.id;
            gameState.status = 'active';
        }

        // Join socket room
        socket.join(gameId);

        // Send current game state to joining player
        socket.emit('gameState', gameState);

        // Notify other players
        socket.to(gameId).emit('playerJoined', {
            playerType,
            gameState
        });

        console.log(`🎮 ${playerType} joined game: ${gameId}`);
    }

    handlePlayCard(socket, gameId, playerId, cardId) {
        const result = this.gameManager.playCard(gameId, playerId, cardId);
        
        if (result.success) {
            // Broadcast to all players in the room
            this.io.to(gameId).emit('cardPlayed', {
                playerId,
                cardId,
                gameState: result.gameState,
                message: result.message
            });
        } else {
            socket.emit('error', { message: result.error });
        }
    }

    handleDrawCard(socket, gameId, playerId) {
        const result = this.gameManager.drawCard(gameId, playerId);
        
        if (result.success) {
            this.io.to(gameId).emit('cardDrawn', {
                playerId,
                cardId: result.cardId,
                gameState: result.gameState
            });
        } else {
            socket.emit('error', { message: result.error });
        }
    }

    handleEndTurn(socket, gameId) {
        const result = this.gameManager.endTurn(gameId);
        
        if (result.success) {
            this.io.to(gameId).emit('turnEnded', {
                gameState: result.gameState,
                message: result.message
            });
        } else {
            socket.emit('error', { message: result.error });
        }
    }

    handleTikTokGift(socket, gameId, giftType, viewerName) {
        const gameState = this.gameManager.getGameState(gameId);
        if (!gameState) return;

        let effect = '';
        
        switch(giftType) {
            case 'rose':
                // Draw card for viewers
                this.gameManager.drawCard(gameId, 'viewers');
                effect = 'Drew a card!';
                break;
            case 'rocket':
                // Extra mana for viewers
                gameState.players.viewers.mana += 2;
                effect = '+2 Mana!';
                break;
            case 'lion':
                // Add special card to hand
                const rareCards = ['mana_crystal'];
                const randomCard = rareCards[Math.floor(Math.random() * rareCards.length)];
                gameState.hands.viewers.push(randomCard);
                effect = `Received ${this.gameManager.getCardDatabase()[randomCard].name}!`;
                break;
        }

        // Broadcast gift effect
        this.io.to(gameId).emit('tiktokGiftEffect', {
            viewerName,
            giftType,
            effect,
            gameState
        });

        console.log(`🎁 TikTok Gift: ${viewerName} sent ${giftType} - ${effect}`);
    }

    handleDisconnect(socket) {
        // Clean up player assignments
        // This would need more sophisticated handling for production
    }
}

module.exports = SocketHandler;
