let supabaseClient = null;
let onlineChannel = null;
let currentRoom = null;

const supabaseUrl = 'https://ctrdrqvjrfchtpjrpzhm.supabase.co';
const supabaseKey = 'sb_publishable_U_5fKfQzlQdCZuc-B-tV2g_d88LlzZ3';

const OnlineManager = {
    init() {
        if (!window.supabase) {
            console.warn("Supabase not available yet, retrying...");
            setTimeout(() => this.init(), 500);
            return;
        }
        
        if (!supabaseClient) {
            supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        }

        document.getElementById('btn-create-room').addEventListener('click', this.createRoom.bind(this));
        document.getElementById('btn-join-room').addEventListener('click', this.joinRoom.bind(this));
    },

    setStatus(msg) {
        document.getElementById('connection-status').textContent = msg;
    },

    createRoom() {
        const roomId = Math.random().toString(36).substr(2, 4).toUpperCase();
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('lobby-screen').classList.remove('hidden');
        document.getElementById('lobby-room-code').textContent = roomId;
        document.getElementById('lobby-status').textContent = 'Waiting for opponent to join...';
        document.getElementById('lobby-loader').classList.remove('hidden');
        this.connectToRoom(roomId, 1);
    },

    joinRoom() {
        const input = document.getElementById('room-code-input').value.trim().toUpperCase();
        if (!input) {
            this.setStatus('Please enter a room code.');
            return;
        }
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('lobby-screen').classList.remove('hidden');
        document.getElementById('lobby-room-code').textContent = input;
        document.getElementById('lobby-status').textContent = 'Connecting to room...';
        document.getElementById('lobby-loader').classList.remove('hidden');
        this.connectToRoom(input, 2);
    },

    connectToRoom(roomId, playerRole) {
        if (!supabaseClient) return;

        if (onlineChannel) {
            supabaseClient.removeChannel(onlineChannel);
        }
        
        currentRoom = roomId;
        GameModeManager.setMode(`online_p${playerRole}`);

        onlineChannel = supabaseClient.channel(`room-${roomId}`, {
            config: {
                broadcast: { self: false }
            }
        });

        onlineChannel.on('broadcast', { event: 'game_move' }, (payload) => {
            this.receiveMove(payload.payload);
        }).subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                if (playerRole === 1) {
                    this.setStatus(`Room: ${roomId} - Waiting for P2...`);
                } else {
                    document.getElementById('lobby-status').textContent = 'Connected! Starting game...';
                    document.getElementById('lobby-loader').classList.add('hidden');
                    onlineChannel.send({ type: 'broadcast', event: 'game_move', payload: { type: 'join' } });
                    setTimeout(() => this.startGame(), 1500);
                }
            } else if (status === 'CHANNEL_ERROR') {
                document.getElementById('lobby-status').textContent = 'Connection error. Returning...';
                document.getElementById('lobby-loader').classList.add('hidden');
                setTimeout(() => typeof returnToMenu === 'function' && returnToMenu(), 2000);
            }
        });
    },

    receiveMove(move) {
        if (move.type === 'join' && GameModeManager.mode === 'online_p1') {
            document.getElementById('lobby-status').textContent = 'Opponent joined! Starting game...';
            document.getElementById('lobby-loader').classList.add('hidden');
            setTimeout(() => this.startGame(), 1500);
        } else if (move.type === 'leave') {
            document.getElementById('disconnect-modal').classList.remove('hidden');
            state.winner = 'disconnected';
        } else if (move.type === 'pawn') {
            executeRemotePawnMove(move.r, move.c);
        } else if (move.type === 'wall') {
            executeRemoteWallMove(move.ir, move.ic, move.orientation);
        }
    },

    sendMove(moveData) {
        if (onlineChannel && GameModeManager.mode && GameModeManager.mode.startsWith('online')) {
            onlineChannel.send({
                type: 'broadcast',
                event: 'game_move',
                payload: moveData
            });
        }
    },

    startGame() {
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('lobby-screen').classList.add('hidden');
        document.getElementById('btn-exit-game').classList.remove('hidden');
        initGame();
    },

    disconnect() {
        if (onlineChannel && supabaseClient) {
            this.sendMove({ type: 'leave' });
            setTimeout(() => supabaseClient.removeChannel(onlineChannel), 150);
        }
        onlineChannel = null;
        currentRoom = null;
        this.setStatus('');
    }
};

window.addEventListener('beforeunload', () => {
    if (onlineChannel && supabaseClient) {
        OnlineManager.sendMove({ type: 'leave' });
    }
});

window.addEventListener('DOMContentLoaded', () => {
    OnlineManager.init();
});
