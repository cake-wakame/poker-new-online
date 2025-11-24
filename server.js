const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const waitingPlayers = [];

const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const rankValues = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

const TIME_LIMIT = 5 * 60 * 1000;
const MAX_DRAW_COUNT = 3;

function createDeck() {
    const deck = [];
    for (let suit of suits) {
        for (let rank of ranks) {
            deck.push({ suit, rank });
        }
    }
    return deck;
}

function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function checkHand(hand) {
    const rankList = hand.map(c => c.rank);
    const suitList = hand.map(c => c.suit);
    const rankCounts = {};
    const suitCounts = {};

    rankList.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
    suitList.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);

    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const isFlush = Object.values(suitCounts).some(c => c === 5);
    const sortedValues = rankList.map(r => rankValues[r]).sort((a, b) => a - b);

    let isStraight = true;
    for (let i = 1; i < sortedValues.length; i++) {
        if (sortedValues[i] !== sortedValues[i - 1] + 1) {
            isStraight = false;
            break;
        }
    }

    const isLowStraight = rankList.includes('A') && rankList.includes('2') &&
                          rankList.includes('3') && rankList.includes('4') && rankList.includes('5');
    if (isLowStraight) isStraight = true;

    const isRoyalFlush = isFlush && isStraight &&
                       rankList.includes('A') && rankList.includes('K') &&
                       rankList.includes('Q') && rankList.includes('J') && rankList.includes('10');

    const groups = Object.entries(rankCounts)
        .map(([rank, count]) => ({ rank, count, value: rankValues[rank] }))
        .sort((a, b) => {
            if (a.count !== b.count) return b.count - a.count;
            return b.value - a.value;
        });

    const kickers = groups.map(g => g.value);

    if (isRoyalFlush) return { name: 'ロイヤルフラッシュ', rank: 10, kickers: [14, 13, 12, 11, 10] };
    if (isFlush && isStraight) {
        if (isLowStraight) {
            return { name: 'ストレートフラッシュ', rank: 9, kickers: [5, 4, 3, 2, 1] };
        }
        return { name: 'ストレートフラッシュ', rank: 9, kickers: [sortedValues[4]] };
    }
    if (counts[0] === 4) return { name: 'フォーカード', rank: 8, kickers };
    if (counts[0] === 3 && counts[1] === 2) return { name: 'フルハウス', rank: 7, kickers };
    if (isFlush) return { name: 'フラッシュ', rank: 6, kickers };
    if (isStraight) {
        if (isLowStraight) {
            return { name: 'ストレート', rank: 5, kickers: [5, 4, 3, 2, 1] };
        }
        return { name: 'ストレート', rank: 5, kickers: [sortedValues[4]] };
    }
    if (counts[0] === 3) return { name: 'スリーカード', rank: 4, kickers };
    if (counts[0] === 2 && counts[1] === 2) return { name: 'ツーペア', rank: 3, kickers };
    if (counts[0] === 2) return { name: 'ワンペア', rank: 2, kickers };
    return { name: 'ハイカード', rank: 1, kickers };
}

function compareHands(hand1Result, hand2Result) {
    if (hand1Result.rank !== hand2Result.rank) {
        return hand1Result.rank > hand2Result.rank ? 1 : -1;
    }

    for (let i = 0; i < hand1Result.kickers.length; i++) {
        if (hand1Result.kickers[i] > hand2Result.kickers[i]) return 1;
        if (hand1Result.kickers[i] < hand2Result.kickers[i]) return -1;
    }

    return 0;
}

io.on('connection', (socket) => {
    console.log('プレイヤーが接続しました:', socket.id);

    socket.on('findMatch', () => {
        if (waitingPlayers.length > 0) {
            const opponent = waitingPlayers.shift();
            const roomId = `room_${socket.id}_${opponent.id}`;

            const room = {
                id: roomId,
                players: [
                    { id: socket.id, socket: socket, chips: 1000, bet: 0, ready: false, drawCount: 0 },
                    { id: opponent.id, socket: opponent, chips: 1000, bet: 0, ready: false, drawCount: 0 }
                ],
                deck: [],
                hands: {},
                phase: 'betting',
                currentBet: 0,
                timers: [],
                bettingStartTime: Date.now()
            };

            rooms.set(roomId, room);

            socket.join(roomId);
            opponent.join(roomId);

            socket.roomId = roomId;
            opponent.roomId = roomId;

            io.to(socket.id).emit('matchFound', {
                roomId,
                playerId: socket.id,
                opponentId: opponent.id,
                playerIndex: 0
            });
            io.to(opponent.id).emit('matchFound', {
                roomId,
                playerId: opponent.id,
                opponentId: socket.id,
                playerIndex: 1
            });

            console.log(`マッチング成功: ${roomId}`);
            
            startBettingTimer(room);
        } else {
            waitingPlayers.push(socket);
            socket.emit('waiting');
            console.log('マッチング待機中:', socket.id);
        }
    });

    socket.on('placeBet', ({ roomId, betAmount }) => {
        const room = rooms.get(roomId);
        if (!room || room.phase !== 'betting') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.ready) return;

        if (betAmount < 10) {
            socket.emit('betError', '最低ベット額は10チップです');
            return;
        }

        if (betAmount > player.chips) {
            socket.emit('betError', 'チップが足りません');
            return;
        }

        player.chips -= betAmount;
        player.bet = betAmount;
        player.ready = true;

        io.to(socket.id).emit('betPlaced', {
            chips: player.chips,
            bet: player.bet
        });

        const allReady = room.players.every(p => p.ready && p.bet > 0);
        if (allReady) {
            clearRoomTimers(room);
            
            const minBet = Math.min(...room.players.map(p => p.bet));
            room.currentBet = minBet;

            room.players.forEach(p => {
                if (p.bet > minBet) {
                    const refund = p.bet - minBet;
                    p.chips += refund;
                    p.bet = minBet;
                    p.socket.emit('betRefund', { refund, chips: p.chips, bet: p.bet });
                }
            });

            dealCards(room);
        }
    });

    socket.on('drawCards', ({ roomId, indices }) => {
        const room = rooms.get(roomId);
        if (!room || room.phase !== 'drawing') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.ready) return;

        if (player.drawCount >= MAX_DRAW_COUNT) {
            socket.emit('drawError', 'ドロー回数の上限に達しました');
            return;
        }

        const hand = room.hands[socket.id];
        if (!hand) return;

        for (let index of indices.sort((a, b) => b - a)) {
            if (index >= 0 && index < 5) {
                hand[index] = room.deck.pop();
            }
        }

        room.hands[socket.id] = hand;
        player.drawCount++;

        const remainingDraws = MAX_DRAW_COUNT - player.drawCount;
        socket.emit('cardsDrawn', { 
            hand, 
            drawCount: player.drawCount,
            remainingDraws 
        });

        if (player.drawCount >= MAX_DRAW_COUNT) {
            player.ready = true;
        }

        const allReady = room.players.every(p => p.ready);
        if (allReady) {
            clearRoomTimers(room);
            room.phase = 'showdown';
            evaluateWinner(room);
        }
    });

    socket.on('skipDraw', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room || room.phase !== 'drawing') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.ready) return;

        player.drawCount = MAX_DRAW_COUNT;
        player.ready = true;
        socket.emit('drawSkipped');

        const allReady = room.players.every(p => p.ready);
        if (allReady) {
            clearRoomTimers(room);
            room.phase = 'showdown';
            evaluateWinner(room);
        }
    });

    socket.on('disconnect', () => {
        console.log('プレイヤーが切断しました:', socket.id);

        const index = waitingPlayers.findIndex(p => p.id === socket.id);
        if (index !== -1) {
            waitingPlayers.splice(index, 1);
        }

        if (socket.roomId) {
            const room = rooms.get(socket.roomId);
            if (room) {
                clearRoomTimers(room);
                room.players.forEach(p => {
                    if (p.id !== socket.id) {
                        p.socket.emit('opponentDisconnected');
                    }
                });
                rooms.delete(socket.roomId);
            }
        }
    });
});

function dealCards(room) {
    room.deck = shuffle(createDeck());
    room.hands = {};

    room.players.forEach(player => {
        const hand = [];
        for (let i = 0; i < 5; i++) {
            hand.push(room.deck.pop());
        }
        room.hands[player.id] = hand;
        player.ready = false;
        player.drawCount = 0;

        player.socket.emit('cardsDealt', { 
            hand,
            drawCount: 0,
            remainingDraws: MAX_DRAW_COUNT
        });
    });

    room.phase = 'drawing';
    room.drawingStartTime = Date.now();
    startDrawingTimer(room);
}

function evaluateWinner(room) {
    const results = room.players.map(player => {
        const hand = room.hands[player.id];
        const handResult = checkHand(hand);
        return {
            player,
            hand,
            handResult
        };
    });

    const comparison = compareHands(results[0].handResult, results[1].handResult);
    let winner;
    if (comparison > 0) {
        winner = 0;
    } else if (comparison < 0) {
        winner = 1;
    } else {
        winner = -1;
    }

    const pot = room.currentBet * 2;

    if (winner === -1) {
        results.forEach(r => {
            r.player.chips += r.player.bet;
        });
    } else {
        results[winner].player.chips += pot;
    }

    room.players.forEach((player, index) => {
        const isWinner = winner === index;
        const isDraw = winner === -1;

        player.socket.emit('gameResult', {
            winner: isWinner ? 'you' : (isDraw ? 'draw' : 'opponent'),
            yourHand: results[index].hand,
            yourHandName: results[index].handResult.name,
            opponentHand: results[1 - index].hand,
            opponentHandName: results[1 - index].handResult.name,
            chips: player.chips,
            pot
        });

        player.bet = 0;
        player.ready = false;
    });

    room.phase = 'betting';
    room.currentBet = 0;
    room.bettingStartTime = Date.now();
    
    room.players.forEach(player => {
        player.drawCount = 0;
    });

    startBettingTimer(room);
}

function clearRoomTimers(room) {
    if (room.timers) {
        room.timers.forEach(timer => clearTimeout(timer));
        room.timers = [];
    }
}

function startBettingTimer(room) {
    clearRoomTimers(room);
    
    const timer = setTimeout(() => {
        if (room.phase !== 'betting') return;

        const notReadyPlayers = room.players.filter(p => !p.ready || p.bet === 0);
        
        if (notReadyPlayers.length === 0) return;

        if (notReadyPlayers.length === 2) {
            room.players.forEach(p => {
                p.socket.emit('gameResult', {
                    winner: 'draw',
                    yourHand: [],
                    yourHandName: 'タイムアウト',
                    opponentHand: [],
                    opponentHandName: 'タイムアウト',
                    chips: p.chips,
                    pot: 0,
                    reason: '両プレイヤーがタイムアウトしました'
                });
                p.bet = 0;
            });

            room.phase = 'betting';
            room.currentBet = 0;
            room.bettingStartTime = Date.now();
            
            room.players.forEach(player => {
                player.bet = 0;
                player.ready = false;
                player.drawCount = 0;
            });

            startBettingTimer(room);
            return;
        }

        const winner = room.players.find(p => p.ready && p.bet > 0);
        const loser = notReadyPlayers[0];

        if (winner && loser) {
            const totalPot = winner.bet + loser.bet;
            winner.chips += totalPot;

            room.players.forEach(p => {
                const isWinner = p.id === winner.id;
                p.socket.emit('gameResult', {
                    winner: isWinner ? 'you' : 'opponent',
                    yourHand: [],
                    yourHandName: isWinner ? '相手タイムアウト' : 'タイムアウト',
                    opponentHand: [],
                    opponentHandName: isWinner ? 'タイムアウト' : '相手タイムアウト',
                    chips: p.chips,
                    pot: totalPot,
                    reason: 'ベット時間切れ'
                });
            });

            room.phase = 'betting';
            room.currentBet = 0;
            room.bettingStartTime = Date.now();
            
            room.players.forEach(player => {
                player.bet = 0;
                player.ready = false;
                player.drawCount = 0;
            });

            startBettingTimer(room);
        }
    }, TIME_LIMIT);

    room.timers.push(timer);

    room.players.forEach(p => {
        p.socket.emit('timerStarted', { 
            phase: 'betting', 
            timeLimit: TIME_LIMIT,
            startTime: room.bettingStartTime
        });
    });
}

function startDrawingTimer(room) {
    clearRoomTimers(room);
    
    const timer = setTimeout(() => {
        if (room.phase !== 'drawing') return;

        const notReadyPlayers = room.players.filter(p => !p.ready);
        
        if (notReadyPlayers.length === 0) return;

        if (notReadyPlayers.length === 2) {
            room.phase = 'showdown';
            evaluateWinner(room);
            return;
        }

        const winner = room.players.find(p => p.ready);
        const loser = notReadyPlayers[0];

        if (winner && loser) {
            const totalPot = room.currentBet * 2;
            winner.chips += totalPot;

            room.players.forEach((p, index) => {
                const isWinner = p.id === winner.id;
                const winnerHand = room.hands[winner.id] || [];
                const loserHand = room.hands[loser.id] || [];

                p.socket.emit('gameResult', {
                    winner: isWinner ? 'you' : 'opponent',
                    yourHand: room.hands[p.id],
                    yourHandName: isWinner ? checkHand(winnerHand).name : 'タイムアウト',
                    opponentHand: room.hands[room.players[1 - index].id],
                    opponentHandName: isWinner ? 'タイムアウト' : checkHand(winnerHand).name,
                    chips: p.chips,
                    pot: totalPot,
                    reason: 'ドロー時間切れ'
                });
            });

            room.phase = 'betting';
            room.currentBet = 0;
            room.bettingStartTime = Date.now();
            
            room.players.forEach(player => {
                player.bet = 0;
                player.ready = false;
                player.drawCount = 0;
            });

            startBettingTimer(room);
        }
    }, TIME_LIMIT);

    room.timers.push(timer);

    room.players.forEach(p => {
        p.socket.emit('timerStarted', { 
            phase: 'drawing', 
            timeLimit: TIME_LIMIT,
            startTime: room.drawingStartTime
        });
    });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`サーバーがポート${PORT}で起動しました`);
});
