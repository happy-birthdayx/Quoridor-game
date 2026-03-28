const GameModeManager = {
    mode: null, // null until selected
    setMode(mode) {
        this.mode = mode;
    },
    isLocalTurn() {
        if (!this.mode || state.winner) return false;
        if (this.mode === 'ai') return state.turn === 1;
        if (this.mode === 'online_p1') return state.turn === 1;
        if (this.mode === 'online_p2') return state.turn === 2;
        return true; 
    }
};

const BOARD_SIZE = 17;
let state = {
    turn: 1,
    p1: { r: 16, c: 8, walls: 10, targetRow: 0 },
    p2: { r: 0, c: 8, walls: 10, targetRow: 16 },
    grid: Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0)),
    wallOrientation: 'H',
    winner: null,
    validMoves: [] 
};

let currentHoveredIntersection = null;

// Drag state
let draggedWall = null;
let dragPointerId = null;

function initGame() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    state.grid = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
    state.p1 = { r: 16, c: 8, walls: 10, targetRow: 0 };
    state.p2 = { r: 0, c: 8, walls: 10, targetRow: 16 };
    state.turn = 1;
    state.wallOrientation = 'H';
    state.winner = null;
    state.validMoves = [];
    currentHoveredIntersection = null;
    draggedWall = null;
    
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const el = document.createElement('div');
            el.id = `cell-${r}-${c}`;
            el.dataset.r = r;
            el.dataset.c = c;
            el.classList.add('grid-item');
            
            if (r % 2 === 0 && c % 2 === 0) {
                el.classList.add('cell');
                el.addEventListener('click', () => handleCellClick(r, c));
            } else if (r % 2 !== 0 && c % 2 === 0) {
                el.classList.add('gap-h');
            } else if (r % 2 === 0 && c % 2 !== 0) {
                el.classList.add('gap-v');
            } else {
                el.classList.add('intersect');
            }
            board.appendChild(el);
        }
    }
    
    const p1El = document.createElement('div');
    p1El.id = 'p1';
    p1El.className = 'pawn p1';
    
    const p2El = document.createElement('div');
    p2El.id = 'p2';
    p2El.className = 'pawn p2';
    
    board.appendChild(p1El);
    board.appendChild(p2El);
    
    document.getElementById('game-over').classList.add('hidden');
    
    renderWallBank(1);
    renderWallBank(2);

    requestAnimationFrame(() => {
        updatePawnPosition(1);
        updatePawnPosition(2);
        updateUI();
        calculateValidMoves();
    });
}

function renderWallBank(playerNum) {
    const bank = document.getElementById(`p${playerNum}-wall-bank`);
    bank.innerHTML = '';
    const stateWalls = playerNum === 1 ? state.p1.walls : state.p2.walls;
    
    if (stateWalls > 0) {
        const wallH = document.createElement('div');
        wallH.className = 'draggable-wall pool-H';
        wallH.dataset.player = playerNum;
        wallH.dataset.type = 'H';
        wallH.addEventListener('pointerdown', startDrag);
        
        const wallV = document.createElement('div');
        wallV.className = 'draggable-wall pool-V';
        wallV.dataset.player = playerNum;
        wallV.dataset.type = 'V';
        wallV.addEventListener('pointerdown', startDrag);
        
        bank.appendChild(wallH);
        bank.appendChild(wallV);
    }
}

function updatePawnPosition(playerNum) {
    const pawn = document.getElementById(playerNum === 1 ? 'p1' : 'p2');
    const pState = playerNum === 1 ? state.p1 : state.p2;
    const cell = document.getElementById(`cell-${pState.r}-${pState.c}`);
    
    if (cell) {
        pawn.style.top = `${cell.offsetTop}px`;
        pawn.style.left = `${cell.offsetLeft}px`;
        pawn.style.width = `${cell.offsetWidth}px`;
        pawn.style.height = `${cell.offsetHeight}px`;
    }
}

function getValidMoves() {
    const currentPlayer = state.turn === 1 ? state.p1 : state.p2;
    const opponent = state.turn === 1 ? state.p2 : state.p1;
    const moves = [];

    const dirs = [
        { dr: -2, dc: 0, wr: -1, wc: 0 },
        { dr: 2, dc: 0, wr: 1, wc: 0 },
        { dr: 0, dc: -2, wr: 0, wc: -1 },
        { dr: 0, dc: 2, wr: 0, wc: 1 }
    ];

    dirs.forEach(d => {
        const nr = currentPlayer.r + d.dr;
        const nc = currentPlayer.c + d.dc;
        const wr = currentPlayer.r + d.wr;
        const wc = currentPlayer.c + d.wc;

        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && state.grid[wr][wc] === 0) {
            if (nr === opponent.r && nc === opponent.c) {
                const jr = nr + d.dr;
                const jc = nc + d.dc;
                const jwr = nr + d.wr; 
                const jwc = nc + d.wc;
                
                if (jr >= 0 && jr < BOARD_SIZE && jc >= 0 && jc < BOARD_SIZE && state.grid[jwr][jwc] === 0) {
                    // Straight jump
                    moves.push({ r: jr, c: jc });
                } else {
                    // Diagonal jump logic
                    if (d.dc === 0) { // Vertical block
                        if (nc - 2 >= 0 && state.grid[nr][nc - 1] === 0) moves.push({ r: nr, c: nc - 2 });
                        if (nc + 2 < BOARD_SIZE && state.grid[nr][nc + 1] === 0) moves.push({ r: nr, c: nc + 2 });
                    } else { // Horizontal block
                        if (nr - 2 >= 0 && state.grid[nr - 1][nc] === 0) moves.push({ r: nr - 2, c: nc });
                        if (nr + 2 < BOARD_SIZE && state.grid[nr + 1][nc] === 0) moves.push({ r: nr + 2, c: nc });
                    }
                }
            } else {
                moves.push({ r: nr, c: nc });
            }
        }
    });
    
    return moves;
}

function calculateValidMoves() {
    state.validMoves = getValidMoves();
    document.querySelectorAll('.valid-move').forEach(el => el.classList.remove('valid-move'));
    
    if (!state.winner && GameModeManager.isLocalTurn()) {
        state.validMoves.forEach(m => {
            const el = document.getElementById(`cell-${m.r}-${m.c}`);
            if (el) el.classList.add('valid-move');
        });
    }
}

function handleCellClick(r, c) {
    if (state.winner || !GameModeManager.isLocalTurn()) return;
    const isValid = state.validMoves.some(m => m.r === r && m.c === c);
    if (!isValid) return;
    
    if (typeof OnlineManager !== 'undefined' && GameModeManager.mode.startsWith('online')) {
        OnlineManager.sendMove({ type: 'pawn', r, c });
    }
    
    executeRemotePawnMove(r, c);
}

window.executeRemotePawnMove = function(r, c) {
    const playerNum = state.turn;
    const playerConfig = state.turn === 1 ? state.p1 : state.p2;
    playerConfig.r = r;
    playerConfig.c = c;
    
    updatePawnPosition(playerNum);
    checkWinCondition();
    if (!state.winner) {
        switchTurn();
    }
};

window.executeRemoteWallMove = function(ir, ic, orientation) {
    const playerConf = state.turn === 1 ? state.p1 : state.p2;
    const footprint = getWallFootprint(ir, ic, orientation);
    
    footprint.forEach(f => {
        state.grid[f.r][f.c] = 1;
        const el = document.getElementById(`cell-${f.r}-${f.c}`);
        if (el) el.classList.add('wall-placed');
    });
    
    playerConf.walls--;
    switchTurn();
};

function checkWinCondition() {
    if (state.p1.r === state.p1.targetRow) endGame(1);
    else if (state.p2.r === state.p2.targetRow) endGame(2);
}

function endGame(player) {
    state.winner = player;
    const wintxt = document.getElementById('winner-text');
    wintxt.textContent = `Player ${player} Wins!`;
    wintxt.style.color = player === 1 ? 'var(--p1-color)' : 'var(--p2-color)';
    document.getElementById('game-over').classList.remove('hidden');
    calculateValidMoves(); 
}

function switchTurn() {
    state.turn = state.turn === 1 ? 2 : 1;
    updateUI();
    calculateValidMoves();

    if (GameModeManager.mode === 'ai' && state.turn === 2 && !state.winner) {
        setTimeout(() => AIManager.playTurn(), 600);
    }
}

function updateUI() {
    document.getElementById('p1-walls').textContent = state.p1.walls;
    document.getElementById('p2-walls').textContent = state.p2.walls;
    
    const p1Status = document.getElementById('player1-status');
    const p2Status = document.getElementById('player2-status');
    const turnText = document.getElementById('turn-text');
    
    if (state.turn === 1) {
        p1Status.classList.add('active');
        p2Status.classList.remove('active');
        turnText.textContent = "Player 1's Turn";
        turnText.style.color = "var(--p1-color)";
    } else {
        p2Status.classList.add('active');
        p1Status.classList.remove('active');
        turnText.textContent = "Player 2's Turn";
        turnText.style.color = "var(--p2-color)";
    }

    const p1Bank = document.getElementById('p1-wall-bank');
    const p2Bank = document.getElementById('p2-wall-bank');
    if (GameModeManager.mode === 'online_p1' || GameModeManager.mode === 'ai') {
        p1Bank.style.display = 'flex';
        p2Bank.style.display = 'none';
    } else if (GameModeManager.mode === 'online_p2') {
        p1Bank.style.display = 'none';
        p2Bank.style.display = 'flex';
    } else {
        p1Bank.style.display = 'none';
        p2Bank.style.display = 'none';
    }

    document.querySelectorAll('.draggable-wall').forEach(w => {
        if (parseInt(w.dataset.player) === state.turn && GameModeManager.isLocalTurn()) {
            w.style.opacity = '1';
            w.style.cursor = 'grab';
        } else {
            w.style.opacity = '0.5';
            w.style.cursor = 'not-allowed';
        }
    });

    renderWallBank(1);
    renderWallBank(2);
}

function getBaseIntersection(r, c, orientation) {
    let ir = r % 2 === 0 ? (r < 16 ? r + 1 : r - 1) : r;
    let ic = c % 2 === 0 ? (c < 16 ? c + 1 : c - 1) : c;
    return { ir, ic };
}

function getWallFootprint(ir, ic, orientation) {
    if (orientation === 'H') {
        return [{r: ir, c: ic-1}, {r: ir, c: ic}, {r: ir, c: ic+1}];
    } else {
        return [{r: ir-1, c: ic}, {r: ir, c: ic}, {r: ir+1, c: ic}];
    }
}

function isValidWallFootprint(footprint) {
    for (let f of footprint) {
        if (f.r < 0 || f.r >= BOARD_SIZE || f.c < 0 || f.c >= BOARD_SIZE) return false;
        if (state.grid[f.r][f.c] === 1) return false;
    }
    return true;
}

function hasPath(startR, startC, targetRow) {
    const visited = new Set();
    const q = [{ r: startR, c: startC }];
    visited.add(`${startR},${startC}`);
    
    let head = 0;
    while(head < q.length) {
        const { r, c } = q[head++];
        if (r === targetRow) return true;
        
        const dirs = [
            { dr: -2, dc: 0, wr: -1, wc: 0 },
            { dr: 2, dc: 0, wr: 1, wc: 0 },
            { dr: 0, dc: -2, wr: 0, wc: -1 },
            { dr: 0, dc: 2, wr: 0, wc: 1 }
        ];

        for (let d of dirs) {
            const nr = r + d.dr;
            const nc = c + d.dc;
            const wr = r + d.wr;
            const wc = c + d.wc;
            
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && state.grid[wr][wc] === 0) {
                const key = `${nr},${nc}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    q.push({ r: nr, c: nc });
                }
            }
        }
    }
    return false;
}

function isValidWallPlacement(footprint) {
    if (!isValidWallFootprint(footprint)) return false;
    
    footprint.forEach(f => state.grid[f.r][f.c] = 1);
    
    const p1Path = hasPath(state.p1.r, state.p1.c, state.p1.targetRow);
    const p2Path = hasPath(state.p2.r, state.p2.c, state.p2.targetRow);
    
    footprint.forEach(f => state.grid[f.r][f.c] = 0);
    
    return p1Path && p2Path;
}

function handleWallHover(r, c) {
    if (state.winner) return;
    const { ir, ic } = getBaseIntersection(r, c, state.wallOrientation);
    renderWallHover(ir, ic);
}

function clearWallHover() {
    currentHoveredIntersection = null;
    document.querySelectorAll('.wall-hover-valid, .wall-hover-invalid').forEach(el => {
        el.classList.remove('wall-hover-valid', 'wall-hover-invalid');
    });
}

function renderWallHover(ir, ic) {
    clearWallHover();
    if (state.winner) return;

    const footprint = getWallFootprint(ir, ic, state.wallOrientation);
    const valid = isValidWallPlacement(footprint);
    const cls = valid ? 'wall-hover-valid' : 'wall-hover-invalid';
    
    currentHoveredIntersection = { r: ir, c: ic, valid: valid };
    
    footprint.forEach(f => {
        if (f.r >= 0 && f.r < BOARD_SIZE && f.c >= 0 && f.c < BOARD_SIZE) {
            const el = document.getElementById(`cell-${f.r}-${f.c}`);
            if (el) el.classList.add(cls);
        }
    });
}

// Drag logic
function startDrag(e) {
    if (state.winner || !GameModeManager.isLocalTurn()) return;
    const playerNum = parseInt(e.target.dataset.player);
    if (playerNum !== state.turn) return;

    draggedWall = e.target;
    dragPointerId = e.pointerId;
    
    state.wallOrientation = draggedWall.dataset.type;
    draggedWall.classList.add('is-dragging');
    
    document.body.appendChild(draggedWall);
    moveDraggedWall(e.clientX, e.clientY);
    
    document.addEventListener('pointermove', onDragMove);
    document.addEventListener('pointerup', onDragEnd);
    document.addEventListener('pointercancel', onDragEnd);
    draggedWall.setPointerCapture(dragPointerId);
}

function moveDraggedWall(x, y) {
    if (!draggedWall) return;
    draggedWall.style.left = `${x}px`;
    draggedWall.style.top = `${y}px`;
}

function onDragMove(e) {
    if (e.pointerId !== dragPointerId || !draggedWall) return;
    e.preventDefault();
    moveDraggedWall(e.clientX, e.clientY);
    
    draggedWall.style.display = 'none';
    const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
    draggedWall.style.display = '';

    if (dropTarget && dropTarget.dataset.r !== undefined) {
        const r = parseInt(dropTarget.dataset.r);
        const c = parseInt(dropTarget.dataset.c);
        handleWallHover(r, c);
    } else {
        clearWallHover();
    }
}

function onDragEnd(e) {
    if (e.pointerId !== dragPointerId || !draggedWall) return;
    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup', onDragEnd);
    document.removeEventListener('pointercancel', onDragEnd);
    
    if (currentHoveredIntersection && currentHoveredIntersection.valid) {
        if (typeof OnlineManager !== 'undefined' && GameModeManager.mode.startsWith('online')) {
            OnlineManager.sendMove({ 
                type: 'wall', 
                ir: currentHoveredIntersection.r, 
                ic: currentHoveredIntersection.c, 
                orientation: state.wallOrientation 
            });
        }
        
        executeRemoteWallMove(currentHoveredIntersection.r, currentHoveredIntersection.c, state.wallOrientation);
        draggedWall.remove();
        clearWallHover();
    } else {
        draggedWall.remove(); 
        updateUI();
    }
    
    draggedWall = null;
    dragPointerId = null;
    clearWallHover();
}

function returnToMenu() {
    GameModeManager.setMode(null);
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('disconnect-modal').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('btn-exit-game').classList.add('hidden');
    initGame();
}

document.getElementById('restart-btn').addEventListener('click', () => {
    initGame();
});

document.getElementById('btn-exit-game').addEventListener('click', () => {
    if (typeof OnlineManager !== 'undefined') OnlineManager.disconnect();
    returnToMenu();
});

document.getElementById('btn-leave-lobby').addEventListener('click', () => {
    if (typeof OnlineManager !== 'undefined') OnlineManager.disconnect();
    returnToMenu();
});

document.getElementById('btn-disconnect-ok').addEventListener('click', () => {
    if (typeof OnlineManager !== 'undefined') OnlineManager.disconnect();
    returnToMenu();
});

// Initial board render (Menu overlay prevents immediate interaction)
initGame();
