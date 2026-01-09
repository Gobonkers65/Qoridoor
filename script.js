document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const statusText = document.getElementById('game-status');
    
    // Game State
    let state = {
        turn: 1,
        players: {
            1: { 
                pawns: [],
                walls: 10,
                targetRow: 0,
                color: 'p1'
            },
            2: { 
                pawns: [],
                walls: 10,
                targetRow: 8,
                color: 'p2'
            }
        },
        walls: [], 
        mode: 'move', 
        selectedPawnIndex: null,
        winner: null,
        previewWall: null
    };

    function initGame() {
        state.turn = 1;
        // Återställ pjäser (Röd på rad 8, Blå på rad 0)
        state.players[1].pawns = [{ r: 8, c: 3, id: 'p1_a' }, { r: 8, c: 5, id: 'p1_b' }];
        state.players[1].walls = 10;
        
        state.players[2].pawns = [{ r: 0, c: 3, id: 'p2_a' }, { r: 0, c: 5, id: 'p2_b' }];
        state.players[2].walls = 10;

        state.walls = [];
        state.winner = null;
        state.previewWall = null;
        state.selectedPawnIndex = null;
        
        renderBoard();
        updateUI();
        document.getElementById('message-overlay').classList.add('hidden');
    }

    function renderBoard() {
        gameBoard.innerHTML = '';

        // Kolla om spelare har lämnat sin baslinje för att färga motståndarens mållinje
        const redLeftBase = !state.players[1].pawns.some(p => p.r === 8);
        const blueLeftBase = !state.players[2].pawns.some(p => p.r === 0);

        for (let r = 0; r < 17; r++) {
            for (let c = 0; c < 17; c++) {
                const el = document.createElement('div');
                const cellR = Math.floor(r/2);
                const cellC = Math.floor(c/2);

                if (r % 2 === 0 && c % 2 === 0) {
                    el.className = 'cell';
                    el.dataset.r = cellR;
                    el.dataset.c = cellC;

                    // Färga målzoner
                    if (cellR === 0 && blueLeftBase) el.classList.add('goal-zone-p1'); // Rött mål
                    if (cellR === 8 && redLeftBase) el.classList.add('goal-zone-p2'); // Blått mål

                    // Rita Pjäser
                    [1, 2].forEach(pid => {
                        state.players[pid].pawns.forEach((p, idx) => {
                            if (p.r === cellR && p.c === cellC) {
                                const pawnDiv = document.createElement('div');
                                pawnDiv.className = `pawn ${state.players[pid].color}`;
                                if (state.turn === pid && state.selectedPawnIndex === idx && state.mode === 'move') {
                                    pawnDiv.classList.add('selected');
                                }
                                pawnDiv.onclick = (e) => {
                                    e.stopPropagation(); 
                                    handlePawnSelect(pid, idx);
                                };
                                el.appendChild(pawnDiv);
                            }
                        });
                    });

                    el.onclick = () => handleMoveClick(cellR, cellC);

                    if (state.mode === 'move' && !state.winner && state.selectedPawnIndex !== null) {
                        const currentPawn = state.players[state.turn].pawns[state.selectedPawnIndex];
                        if (currentPawn && isValidMove(currentPawn, cellR, cellC)) {
                            el.classList.add('valid-move');
                        }
                    }

                } else if (r % 2 !== 0 && c % 2 !== 0) {
                    el.className = 'intersection';
                    el.dataset.r = Math.floor(r/2);
                    el.dataset.c = Math.floor(c/2);
                    el.onclick = () => handleIntersectionClick(Math.floor(r/2), Math.floor(c/2));
                } else {
                    el.className = r % 2 !== 0 ? 'h-groove' : 'v-groove';
                }
                gameBoard.appendChild(el);
            }
        }
        drawWalls();
    }

    function drawWalls() {
        state.walls.forEach(w => applyWallStyle(w, 'wall'));
        if (state.previewWall) {
            applyWallStyle(state.previewWall, 'wall-preview');
        }
    }

    function applyWallStyle(w, className) {
        const intersection = gameBoard.querySelector(`.intersection[data-r="${w.r}"][data-c="${w.c}"]`);
        if (intersection) intersection.classList.add(className);

        const rBase = w.r * 2 + 1;
        const cBase = w.c * 2 + 1;

        if (w.type === 'H') {
            const g1 = gameBoard.children[(rBase) * 17 + (w.c*2)];
            const g2 = gameBoard.children[(rBase) * 17 + (w.c*2 + 2)];
            if(g1) g1.classList.add(className);
            if(g2) g2.classList.add(className);
        } else {
            const g1 = gameBoard.children[(w.r*2) * 17 + cBase];
            const g2 = gameBoard.children[(w.r*2 + 2) * 17 + cBase];
            if(g1) g1.classList.add(className);
            if(g2) g2.classList.add(className);
        }
    }

    function handlePawnSelect(pid, idx) {
        if (state.winner || state.mode !== 'move') return;
        if (pid === state.turn) {
            state.selectedPawnIndex = idx;
            renderBoard();
        }
    }

    function handleMoveClick(targetR, targetC) {
        if (state.mode !== 'move' || state.winner || state.selectedPawnIndex === null) return;
        
        const playerObj = state.players[state.turn];
        const pawn = playerObj.pawns[state.selectedPawnIndex];

        if (isValidMove(pawn, targetR, targetC)) {
            pawn.r = targetR;
            pawn.c = targetC;
            
            // MÅLGÅNG
            if (pawn.r === playerObj.targetRow) {
                playerObj.pawns.splice(state.selectedPawnIndex, 1);
                state.selectedPawnIndex = null;
                playerObj.walls++;
                alert(`Pjäs i mål! ${state.turn === 1 ? 'Röd' : 'Blå'} får +1 vägg.`);

                if (playerObj.pawns.length === 0) {
                    endGame(state.turn);
                } else {
                    switchTurn();
                }
            } else {
                switchTurn();
            }
        }
    }

    // Uppdaterad logik för att inkludera DIAGONALA HOPP och STEG
    function isValidMove(pawn, targetR, targetC) {
        if (isOccupied(targetR, targetC)) return false;

        const dR = targetR - pawn.r;
        const dC = targetC - pawn.c;
        const absDr = Math.abs(dR);
        const absDc = Math.abs(dC);
        const dist = absDr + absDc;

        // 1. Ortogonalt steg (1 steg)
        if (dist === 1) {
            return !isBlocked(pawn.r, pawn.c, targetR, targetC);
        }

        // 2. Diagonalt steg (1 snett)
        if (absDr === 1 && absDc === 1) {
            return !isDiagonalBlocked(pawn.r, pawn.c, targetR, targetC);
        }

        // 3. Ortogonalt hopp (2 steg rakt)
        if ((absDr === 2 && absDc === 0) || (absDr === 0 && absDc === 2)) {
            const midR = pawn.r + (dR / 2);
            const midC = pawn.c + (dC / 2);
            if (isOccupied(midR, midC)) {
                return !isBlocked(pawn.r, pawn.c, midR, midC) && !isBlocked(midR, midC, targetR, targetC);
            }
        }

        // 4. Diagonalt hopp (2 steg snett)
        if (absDr === 2 && absDc === 2) {
            const midR = pawn.r + (dR / 2);
            const midC = pawn.c + (dC / 2);
            if (isOccupied(midR, midC)) {
                return !isDiagonalBlocked(pawn.r, pawn.c, midR, midC) && !isDiagonalBlocked(midR, midC, targetR, targetC);
            }
        }

        return false;
    }

    function isDiagonalBlocked(r1, c1, r2, c2) {
        // Kontrollera om båda vägarna runt hörnet är blockerade
        const path1Blocked = isBlocked(r1, c1, r1, c2) || isBlocked(r1, c2, r2, c2);
        const path2Blocked = isBlocked(r1, c1, r2, c1) || isBlocked(r2, c1, r2, c2);
        return path1Blocked && path2Blocked;
    }

    function isOccupied(r, c) {
        return state.players[1].pawns.some(p => p.r === r && p.c === c) ||
               state.players[2].pawns.some(p => p.r === r && p.c === c);
    }

    function isBlocked(r1, c1, r2, c2) {
        return state.walls.some(w => {
            if (w.type === 'H') {
                return (w.r === Math.min(r1, r2) && (w.c === c1 || w.c === c1 -1) && r1 !== r2);
            } else {
                return (w.c === Math.min(c1, c2) && (w.r === r1 || w.r === r1 - 1) && c1 !== c2);
            }
        });
    }

    function handleIntersectionClick(r, c) {
        if (state.mode === 'move' || state.winner) return;
        const playerObj = state.players[state.turn];
        
        if (playerObj.walls <= 0) {
            alert("Slut på väggar!");
            return;
        }

        const type = state.mode === 'wall-h' ? 'H' : 'V';
        
        if (state.previewWall && state.previewWall.r === r && state.previewWall.c === c && state.previewWall.type === type) {
            if (canPlaceWall(r, c, type)) {
                state.walls.push(state.previewWall);
                playerObj.walls--;
                state.previewWall = null;
                state.mode = 'move';
                state.selectedPawnIndex = null;
                switchTurn();
            } else {
                alert("Ogiltig placering!");
                state.previewWall = null;
                renderBoard();
            }
        } else {
            state.previewWall = { r, c, type, player: state.turn };
            renderBoard();
        }
    }

    function canPlaceWall(r, c, type) {
        const collision = state.walls.some(w => 
            (w.r === r && w.c === c) || 
            (type === 'H' && w.type === 'H' && w.r === r && Math.abs(w.c - c) === 1) || 
            (type === 'V' && w.type === 'V' && w.c === c && Math.abs(w.r - r) === 1) 
        );
        if (collision) return false;

        state.walls.push({r, c, type});
        
        let allPathsValid = true;
        // Alla kvarvarande pjäser måste kunna nå sina mål
        state.players[1].pawns.forEach(p => { if (!bfs(p, 0)) allPathsValid = false; });
        state.players[2].pawns.forEach(p => { if (!bfs(p, 8)) allPathsValid = false; });
        
        state.walls.pop(); 
        return allPathsValid;
    }

    function bfs(startNode, targetRow) {
        let queue = [{r: startNode.r, c: startNode.c}];
        let visited = new Set();
        visited.add(`${startNode.r},${startNode.c}`);

        while(queue.length > 0) {
            let curr = queue.shift();
            if (curr.r === targetRow) return true;

            const dirs = [[-1,0], [1,0], [0,-1], [0,1], [-1,-1], [-1,1], [1,-1], [1,1]];
            for (let d of dirs) {
                let nr = curr.r + d[0];
                let nc = curr.c + d[1];
                
                if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
                    let key = `${nr},${nc}`;
                    if (!visited.has(key)) {
                         // Kontrollera om draget är möjligt (endast väggkoll)
                         // Notera: För BFS struntar vi i andra pjäser, bara väggar stoppar vägen
                        const dist = Math.abs(d[0]) + Math.abs(d[1]);
                        let possible = false;

                        if (dist === 1) { // Ortogonalt
                             possible = !isBlocked(curr.r, curr.c, nr, nc);
                        } else { // Diagonalt
                             possible = !isDiagonalBlocked(curr.r, curr.c, nr, nc);
                        }

                        if (possible) {
                            visited.add(key);
                            queue.push({r: nr, c: nc});
                        }
                    }
                }
            }
        }
        return false;
    }

    function switchTurn() {
        state.turn = state.turn === 1 ? 2 : 1;
        state.previewWall = null;
        state.selectedPawnIndex = null;
        updateUI();
        renderBoard();
    }

    function endGame(winner) {
        state.winner = winner;
        document.getElementById('winner-text').innerText = `SPELARE ${winner === 1 ? 'RÖD' : 'BLÅ'} VINNER!`;
        document.getElementById('message-overlay').classList.remove('hidden');
    }

    function updateUI() {
        document.getElementById('p1-walls').innerText = state.players[1].walls;
        document.getElementById('p1-pawns-left').innerText = state.players[1].pawns.length;
        
        document.getElementById('p2-walls').innerText = state.players[2].walls;
        document.getElementById('p2-pawns-left').innerText = state.players[2].pawns.length;

        statusText.innerText = state.turn === 1 ? "Röd Spelare: Välj pjäs eller vägg" : "Blå Spelare: Välj pjäs eller vägg";

        document.getElementById('player1-panel').classList.toggle('active', state.turn === 1);
        document.getElementById('player2-panel').classList.toggle('active', state.turn === 2);

        document.querySelectorAll('.btn-action').forEach(btn => {
            const p = parseInt(btn.dataset.player);
            const m = btn.dataset.mode;
            
            if (p === state.turn) {
                btn.disabled = false;
                btn.classList.toggle('selected', state.mode === m);
            } else {
                btn.disabled = true;
                btn.classList.remove('selected');
            }
        });
    }

    document.querySelectorAll('.btn-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
            state.mode = e.target.dataset.mode;
            state.previewWall = null;
            state.selectedPawnIndex = null;
            updateUI();
            renderBoard();
        });
    });

    document.getElementById('restart-btn').addEventListener('click', initGame);

    initGame();
});