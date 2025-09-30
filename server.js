require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const GameManager = require('./src/gameManager');
const SocketHandler = require('./src/socketHandler');
const TikTokAPI = require('./src/tiktokAPI');

class TCGBackend {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: process.env.FRONTEND_URL || "https://tt-tcg-live.vercel.app",
                methods: ["GET", "POST"]
            }
        });
        
        this.gameManager = new GameManager();
        this.socketHandler = new SocketHandler(this.io, this.gameManager);
        this.tiktokAPI = new TikTokAPI(this.gameManager);
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupDatabase();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                message: 'TCG Backend Server Running',
                timestamp: new Date().toISOString()
            });
        });

        // TikTok webhook endpoint
        this.app.post('/webhook/tiktok', (req, res) => {
            this.tiktokAPI.handleWebhook(req.body);
            res.status(200).send('Webhook received');
        });

        // Game status endpoint
        this.app.get('/api/game/:roomId', (req, res) => {
            const roomId = req.params.roomId;
            const gameState = this.gameManager.getGameState(roomId);
            res.json(gameState);
        });
    }

    async setupDatabase() {
        try {
            if (process.env.MONGODB_URI) {
                await mongoose.connect(process.env.MONGODB_URI);
                console.log('✅ Connected to MongoDB');
            } else {
                console.log('ℹ️  Using in-memory storage (no MongoDB)');
            }
        } catch (error) {
            console.log('❌ MongoDB connection failed, using in-memory storage');
        }
    }

    start() {
        const PORT = process.env.PORT || 3000;
        this.server.listen(PORT, '0.0.0.0', () => {
            console.log(`🎴 TCG Backend Server running on port ${PORT}`);
            console.log(`🌐 Frontend: ${process.env.FRONTEND_URL}`);
            console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }
}

// Start the server
const backend = new TCGBackend();
backend.start();
