document.addEventListener('DOMContentLoaded', () => {
    const boardSize = 9; 
    const gameBoard = document.getElementById('game-board');
    const statusText = document.getElementById('game-status');
    
    // Game State
    let state = {
        turn: 1, 
        // ÄNDRING: P1 startar nu på rad 8 (botten), P2 på rad 0 (toppen)
        p1: { r: 8, c: 4, walls: 10 }, 
        p2: { r: 0, c: 4, walls: 10 },
        walls: [], 
        mode: 'move', 
        winner: null,
        previewWall: null, 
        specialTiles: [] 
    };

    function initGame() {
        state.turn = 1;
        // ÄNDRING: Återställ till nya startpositioner
        state.p1 = { r: 8, c: 4, walls: 10 };
        state.p2 = { r: 0, c: 4, walls: 10 };
        state.walls = [];
        state.winner = null;
        state.previewWall = null;
        
        state.specialTiles = [];
        for(let i=0; i<3; i++) {
            state.specialTiles.push({
                r: Math.floor(Math.random() * 5) + 2, 
                c: Math.floor(Math.random() * 9)
            });
        }

        renderBoard();
        updateUI();
        document.getElementById('message-overlay').classList.add('hidden');
    }

    function renderBoard() {
        gameBoard.innerHTML = '';
        for (let r = 0; r < 17; r++) {
            for (let c = 0; c < 17; c++) {
                const el = document.createElement('div');
                const cellR = Math.floor(r/2);
                const cellC = Math.floor(c/2);

                if (r % 2 === 0 && c % 2 === 0) {
                    el.className = 'cell';
                    el.dataset.r = cellR;
                    el.dataset.c = cellC;
                    
                    if (state.specialTiles.some(t => t.r === cellR && t.c === cellC)) {
                        el.classList.add('special-tile');
                    }

                    if (state.p1.r === cellR && state.p1.c === cellC) {
                        const p = document.createElement('div');
                        p.className = 'pawn p1';
                        el.appendChild(p);
                    } else if (state.p2.r === cellR && state.p2.c === cellC) {
                        const p = document.createElement('div');
                        p.className = 'pawn p2';
                        el.appendChild(p);
                    }
                    
                    el.onclick = () => handleMoveClick(cellR, cellC);

                    if (state.mode === 'move' && !state.winner) {
                        const currentPawn = state.turn === 1 ? state.p1 : state.p2;
                        if (isValidMove(currentPawn, cellR, cellC)) {
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
                    el.dataset.gr = r; 
                    el.dataset.gc = c;
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
        const rBase = w.r * 2 + 1;
        const cBase = w.c * 2 + 1;
        
        const intersection = gameBoard.querySelector(`.intersection[data-r="${w.r}"][data-c="${w.c}"]`);
        if (intersection) intersection.classList.add(className);

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

    function handleMoveClick(r, c) {
        if (state.mode !== 'move' || state.winner) return;
        const current = state.turn === 1 ? state.p1 : state.p2;

        if (isValidMove(current, r, c)) {
            current.r = r;
            current.c = c;
            
            const bonusIndex = state.specialTiles.findIndex(t => t.r === r && t.c === c);
            if (bonusIndex !== -1) {
                state.specialTiles.splice(bonusIndex, 1);
                if (Math.random() > 0.3) {
                    current.walls++;
                    alert(`Bonus! Spelare ${state.turn} hittade en extra vägg.`);
                } else {
                    alert(`Ingenting här... otur!`);
                }
            }

            checkWin();
            if (!state.winner) switchTurn();
        }
    }

function isValidMove(pawn, targetR, targetC) {
        // Hämta motståndarens position
        const opponent = state.turn === 1 ? state.p2 : state.p1;

        // REGEL 1: Man får ALDRIG landa på rutan där motståndaren står
        if (targetR === opponent.r && targetC === opponent.c) {
            return false;
        }

        const dR = targetR - pawn.r; // Skillnad i rader
        const dC = targetC - pawn.c; // Skillnad i kolumner
        const absDr = Math.abs(dR);
        const absDc = Math.abs(dC);
        const dist = absDr + absDc; // Totalt avstånd (Manhattan distance)

        // REGEL 2: Vanligt steg (1 steg bort)
        if (dist === 1) {
            // Kontrollera bara att ingen vägg är i vägen
            return !isBlocked(pawn.r, pawn.c, targetR, targetC);
        }

        // REGEL 3: Hopp över motståndare (2 steg rakt fram)
        // Detta sker när avståndet är 2 i en riktning och 0 i den andra
        if ((absDr === 2 && absDc === 0) || (absDr === 0 && absDc === 2)) {
            // Räkna ut rutan som ligger mitt emellan (där motståndaren borde stå)
            const midR = pawn.r + (dR / 2);
            const midC = pawn.c + (dC / 2);

            // Vi får bara hoppa om motståndaren faktiskt står där i mitten
            if (midR === opponent.r && midC === opponent.c) {
                // Kontrollera väggar:
                // 1. Finns vägg mellan mig och motståndaren?
                const blockedStep1 = isBlocked(pawn.r, pawn.c, midR, midC);
                // 2. Finns vägg mellan motståndaren och dit jag vill landa?
                const blockedStep2 = isBlocked(midR, midC, targetR, targetC);

                // Hoppet är giltigt om ingen av vägarna är blockerad
                return !blockedStep1 && !blockedStep2;
            }
        }

        return false; 
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
        
        const currentP = state.turn === 1 ? state.p1 : state.p2;
        if (currentP.walls <= 0) {
            alert("Slut på väggar!");
            return;
        }

        const type = state.mode === 'wall-h' ? 'H' : 'V';
        
        if (state.previewWall && state.previewWall.r === r && state.previewWall.c === c && state.previewWall.type === type) {
            if (canPlaceWall(r, c, type)) {
                state.walls.push(state.previewWall);
                currentP.walls--;
                state.previewWall = null;
                state.mode = 'move';
                switchTurn();
            } else {
                alert("Ogiltig placering! (Kanske blockerar vägen?)");
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
        
        // ÄNDRING: P1 (start 8) ska till 0. P2 (start 0) ska till 8.
        const p1HasPath = bfs(state.p1, 0); 
        const p2HasPath = bfs(state.p2, 8); 
        
        state.walls.pop(); 

        return p1HasPath && p2HasPath;
    }

    function bfs(startNode, targetRow) {
        let queue = [{r: startNode.r, c: startNode.c}];
        let visited = new Set();
        visited.add(`${startNode.r},${startNode.c}`);

        while(queue.length > 0) {
            let curr = queue.shift();
            if (curr.r === targetRow) return true;

            const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
            for (let d of dirs) {
                let nr = curr.r + d[0];
                let nc = curr.c + d[1];
                
                if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
                    let key = `${nr},${nc}`;
                    if (!visited.has(key) && !isBlocked(curr.r, curr.c, nr, nc)) {
                        visited.add(key);
                        queue.push({r: nr, c: nc});
                    }
                }
            }
        }
        return false;
    }

    function switchTurn() {
        state.turn = state.turn === 1 ? 2 : 1;
        state.previewWall = null;
        updateUI();
        renderBoard();
    }

    function checkWin() {
        // ÄNDRING: Vinstvillkor bytta
        if (state.p1.r === 0) endGame(1);
        if (state.p2.r === 8) endGame(2);
    }

    function endGame(winner) {
        state.winner = winner;
        document.getElementById('winner-text').innerText = `Spelare ${winner} Vinner!`;
        document.getElementById('message-overlay').classList.remove('hidden');
    }

    function updateUI() {
        document.getElementById('p1-walls').innerText = state.p1.walls;
        document.getElementById('p2-walls').innerText = state.p2.walls;
        statusText.innerText = `Spelare ${state.turn}, din tur!`;

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
            updateUI();
            renderBoard();
        });
    });

    document.getElementById('restart-btn').addEventListener('click', initGame);

    initGame();
});