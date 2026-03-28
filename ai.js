const AIManager = {
    init() {
        document.getElementById('btn-play-ai').addEventListener('click', () => {
            GameModeManager.setMode('ai');
            document.getElementById('main-menu').classList.add('hidden');
            document.getElementById('btn-exit-game').classList.remove('hidden');
            initGame();
        });
    },

    playTurn() {
        const p1Path = this.getShortestPath(state.p1.r, state.p1.c, state.p1.targetRow);
        const p2Path = this.getShortestPath(state.p2.r, state.p2.c, state.p2.targetRow);
        
        // If opponent is closer and we have walls, attempt to block
        if (p1Path.length < p2Path.length && state.p2.walls > 0 && p1Path.length > 0) {
            const nextStep = p1Path[0];
            const blocked = this.tryBlockSequence(state.p1.r, state.p1.c, nextStep);
            if (blocked) return;
        }
        
        // Otherwise, move forward
        const validMoves = getValidMoves();
        if (p2Path.length > 0) {
            const desiredStep = p2Path[0];
            const isValid = validMoves.some(m => m.r === desiredStep.r && m.c === desiredStep.c);
            
            if (isValid) {
                executeRemotePawnMove(desiredStep.r, desiredStep.c);
                return;
            }
        }
        
        // Fallback random move
        if (validMoves.length > 0) {
            const rnd = validMoves[Math.floor(Math.random() * validMoves.length)];
            executeRemotePawnMove(rnd.r, rnd.c);
        }
    },

    tryBlockSequence(r, c, nextStep) {
        let wallR = r, wallC = c, orientation = 'H';
        
        if (nextStep.r < r) { // UP
            wallR = r; wallC = c; orientation = 'H';
        } else if (nextStep.r > r) { // DOWN
            wallR = r + 1; wallC = c; orientation = 'H';
        } else if (nextStep.c < c) { // LEFT
            wallR = r; wallC = c; orientation = 'V';
        } else { // RIGHT
            wallR = r; wallC = c + 1; orientation = 'V';
        }
        
        // Check surrounding intersections to block the path
        const intersectionsToTry = [
            getBaseIntersection(wallR * 2, wallC * 2, orientation),
            getBaseIntersection(wallR * 2, (wallC - 1) * 2, orientation),
            getBaseIntersection((wallR - 1) * 2, wallC * 2, orientation)
        ];

        for (let intersect of intersectionsToTry) {
            const f = getWallFootprint(intersect.ir, intersect.ic, orientation);
            if (isValidWallPlacement(f)) {
                executeRemoteWallMove(intersect.ir, intersect.ic, orientation);
                return true;
            }
        }
        
        return false;
    },

    getShortestPath(startR, startC, targetRow) {
        const q = [{ r: startR, c: startC, path: [] }];
        const visited = new Set();
        visited.add(`${startR},${startC}`);
        
        const dirs = [
            { dr: -2, dc: 0, wr: -1, wc: 0 },
            { dr: 2, dc: 0, wr: 1, wc: 0 },
            { dr: 0, dc: -2, wr: 0, wc: -1 },
            { dr: 0, dc: 2, wr: 0, wc: 1 }
        ];

        let head = 0;
        while(head < q.length) {
            const curr = q[head++];
            
            if (curr.r === targetRow) {
                return curr.path;
            }
            
            for (let d of dirs) {
                const nr = curr.r + d.dr;
                const nc = curr.c + d.dc;
                const wr = curr.r + d.wr;
                const wc = curr.c + d.wc;
                
                if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && state.grid[wr][wc] === 0) {
                    const key = `${nr},${nc}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        q.push({ r: nr, c: nc, path: [...curr.path, { r: nr, c: nc }] });
                    }
                }
            }
        }
        return []; 
    }
};

window.addEventListener('DOMContentLoaded', () => {
    AIManager.init();
});
