Overview
This is a real-time online poker game built with Node.js, Express, and Socket.IO. The application enables multiplayer poker gameplay through WebSocket connections, allowing players to join rooms and compete against each other in live poker matches. The game implements standard poker hand evaluation logic and manages game state across multiple concurrent rooms.

User Preferences
Preferred communication style: Simple, everyday language.

System Architecture
Frontend Architecture
Single-Page Application Design

Pure HTML/CSS/JavaScript implementation without frameworks
Real-time UI updates driven by Socket.IO client events
Responsive design using CSS flexbox and gradient backgrounds
Client-side game state managed through socket event listeners
Rationale: A framework-less approach keeps the application lightweight and reduces complexity for a real-time game where Socket.IO handles most of the state synchronization.

Backend Architecture
Express + Socket.IO Server

Express serves static files (HTML, CSS, JS)
Socket.IO manages WebSocket connections for real-time communication
In-memory game state storage using JavaScript Maps
Room-based multiplayer architecture
Key Components:

Room Management System: Uses a Map data structure to track active game rooms and their state
Player Matchmaking: Maintains a waiting queue (waitingPlayers array) to pair players together
Game Logic Engine: Implements poker hand evaluation, deck shuffling, and card dealing
Rationale: In-memory storage was chosen for simplicity and low latency in real-time gameplay. This approach is suitable for a game where session persistence isn't critical, though it means game state is lost on server restart.

Trade-offs:

Pros: Extremely fast access, simple implementation, no database overhead
Cons: No persistence, limited scalability, state lost on crashes
Game State Management
Card Deck System

52-card standard deck representation with suits (hearts, diamonds, clubs, spades) and ranks (2-A)
Fisher-Yates shuffle algorithm for randomization
Rank values mapped for hand evaluation (2=2, J=11, Q=12, K=13, A=14)
Hand Evaluation Logic

Implemented poker hand ranking system (appears incomplete in provided code)
Checks for flush, straight, pairs, and other poker combinations
Uses count-based analysis of ranks and suits
Communication Protocol
WebSocket Events Architecture

Bidirectional real-time communication between clients and server
Event-driven game flow (player actions, game updates, state changes)
Room-based broadcasting for multi-player synchronization
Rationale: Socket.IO was chosen over HTTP polling for true real-time gameplay with minimal latency, essential for interactive card games.

External Dependencies
Core Dependencies
express (^4.18.2)

Purpose: HTTP server and static file serving
Used for: Hosting the web application and serving game assets
socket.io (^4.6.1)

Purpose: WebSocket communication library
Used for: Real-time bidirectional event-based communication between clients and server
Enables: Player matchmaking, game state synchronization, live updates
Runtime Environment
Node.js

Required for server execution
No specific version constraints defined in package.json
Notable Absence
No Database System

Current implementation uses in-memory storage only
No persistence layer for game history, user accounts, or statistics
Consider adding a database (e.g., PostgreSQL with Drizzle ORM) for:
Player profiles and authentication
Game history and statistics
Leaderboards
Persistent room state
