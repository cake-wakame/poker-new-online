Overview
This is a real-time online poker game built with Node.js, Express, and Socket.IO. The application enables multiplayer poker gameplay with WebSocket-based instant communication, card drawing mechanics, chip management, and support for all standard poker hands. The game features a matchmaking system where players can join rooms and compete against each other in real-time.

Render Deployment Status: This project is fully configured and ready for deployment to Render. All necessary configuration files (render.yaml) and code adjustments have been implemented.

Recent Changes
November 24, 2025 - Render Deployment Configuration

Configured server.js to use process.env.PORT for dynamic port assignment
Server binds to 0.0.0.0 for external access compatibility
Created render.yaml for one-click Blueprint deployment
Added deployment instructions to README.md
Verified all dependencies and project structure for Render compatibility
Static files served from public/ directory via Express
User Preferences
Preferred communication style: Simple, everyday language.

System Architecture
Frontend Architecture
Single Page Application (SPA) Pattern

Static HTML/CSS/JavaScript served from the public directory
Client-side game state management through Socket.IO event listeners
Real-time UI updates based on WebSocket messages
Responsive design with gradient background and card-based UI layout
Rationale: A simple SPA approach keeps the frontend lightweight and allows for instant updates via WebSocket events without page refreshes, which is essential for real-time gameplay.

Backend Architecture
Event-Driven WebSocket Server

Express.js server for serving static files and handling HTTP requests
Socket.IO for bidirectional real-time communication between clients
In-memory data structures (Maps) for game state management
Stateful server design with room-based game sessions
Rationale: Socket.IO provides reliable real-time communication with automatic fallback mechanisms. The event-driven architecture naturally fits poker's turn-based gameplay where player actions trigger state changes that need to be broadcast to all participants.

Game State Management

rooms Map: Stores active game rooms with player information and game state
waitingPlayers array: Queue system for matchmaking players
In-memory deck generation and shuffling algorithms
Hand evaluation logic for determining poker hand rankings
Rationale: In-memory storage keeps the application simple and fast for the MVP stage. Game sessions are ephemeral and don't require persistence. This approach minimizes latency for real-time gameplay.

Core Game Logic Components

Deck creation: Standard 52-card deck generation with suits (hearts, diamonds, clubs, spades) and ranks (2-A)
Shuffling algorithm: Fisher-Yates shuffle for random card distribution
Hand evaluation: Poker hand ranking system supporting all standard hands (straight, flush, full house, etc.)
Card exchange mechanism: Draw poker variant allowing players to replace cards
Alternatives Considered:

Database-backed persistence was considered but rejected for MVP to reduce complexity
Redis could be used for game state if horizontal scaling becomes necessary
Deployment Architecture
Render Platform Deployment

Node.js runtime environment (v14+)
Blueprint deployment via render.yaml for infrastructure-as-code
Environment variable support for port configuration
Free tier compatible with automatic scaling options
Rationale: Render provides simple deployment with WebSocket support out of the box. The blueprint approach (render.yaml) enables reproducible deployments and easy environment management.

External Dependencies
Core Framework Dependencies
Express.js (v4.18.2)

Purpose: Web server framework for serving static files and handling HTTP requests
Used for: Serving the game UI from the public directory
Socket.IO (v4.6.1)

Purpose: Real-time bidirectional event-based communication
Used for: Game state synchronization, player actions, matchmaking, and live updates
Features utilized: Room management, event broadcasting, connection handling
Deployment Platform
Render

Purpose: Cloud hosting platform for web services
Configuration: Managed via render.yaml blueprint or manual web service setup
Port: Dynamic assignment via process.env.PORT (default: 5000)
Build process: npm install → npm start
No Database/Persistence Layer

Current implementation uses in-memory data structures only
Game state is ephemeral and lost on server restart
Future consideration: Could add PostgreSQL or Redis for persistent user accounts, chip balances, and game history
Development Dependencies
Node.js Runtime

Minimum version: 14.0.0
Purpose: JavaScript runtime for server-side execution
