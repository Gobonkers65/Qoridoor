document.addEventListener('DOMContentLoaded', () => {
    const boardSize = 9;
    const gameBoard = document.getElementById('game-board');
    const currentPlayerNameDisplay = document.getElementById('current-player-name');
    const turnIndicator = document.getElementById('turn-indicator');
    
    const player1WallStackContainer = document.getElementById('player1-wall-stack');
    const player2WallStackContainer = document.getElementById('player2-wall-stack');
    const player1WallsCountDisplay = document.getElementById('player1-walls-count');
    const player2WallsCountDisplay = document.getElementById('player2-walls-count');

    const winnerMessage = document.getElementById('winner-message');
    const actionButtonElements = document.querySelectorAll('.action-button');

    const cellWidth = 40; 
    const grooveWidth = 7; 
    const pawnSize = 32;

    let gameState = {
        currentPlayer: 1,
        pawns: [ /* ... */ ],
        walls: [],
        playerWallsCount: { 1: 10, 2: 10 },
        horizontalSegments: Array(boardSize - 1).fill(null).map(() => Array(boardSize).fill(false)),
        verticalSegments: Array(boardSize).fill(null).map(() => Array(boardSize - 1).fill(false)),
        selectedPawn: null,
        mode: 'move', 
        gameOver: false
    };
    // Initialize pawns
    gameState.pawns = [
        { player: 1, row: 0, col: Math.floor(boardSize / 2), id: 'pawn1' },
        { player: 2, row: boardSize - 1, col: Math.floor(boardSize / 2), id: 'pawn2' }
    ];

    let currentPreviewedGrooves = []; // För att hålla reda på förhandsvisade springor

    function createBoard() {
        gameBoard.innerHTML = '';
        for (let r_idx = 0; r_idx < boardSize * 2 - 1; r_idx++) {
            for (let c_idx = 0; c_idx < boardSize * 2 - 1; c_idx++) {
                const div = document.createElement('div');
                const r_cell = Math.floor(r_idx / 2);
                const c_cell = Math.floor(c_idx / 2);

                if (r_idx % 2 === 0 && c_idx % 2 === 0) { 
                    div.classList.add('cell');
                    div.dataset.row = r_cell;
                    div.dataset.col = c_cell;
                    div.addEventListener('click', handleCellClick);
                } else if (r_idx % 2 === 0 && c_idx % 2 !== 0) { 
                    div.classList.add('v-groove');
                    div.dataset.row = r_cell; 
                    div.dataset.col = c_cell; 
                } else if (r_idx % 2 !== 0 && c_idx % 2 === 0) { 
                    div.classList.add('h-groove');
                    div.dataset.row = r_cell; 
                    div.dataset.col = c_cell;   
                } else { 
                    div.classList.add('intersection');
                    div.dataset.r = (r_idx - 1) / 2; 
                    div.dataset.c = (c_idx - 1) / 2;
                    div.addEventListener('click', handleIntersectionClick);
                    // Event listeners för hover-hints
                    div.addEventListener('mouseenter', handleIntersectionMouseEnter);
                    div.addEventListener('mouseleave', handleIntersectionMouseLeave);
                }
                gameBoard.appendChild(div);
            }
        }
        createPawns();
        renderWalls(); // Se till att detta anropas korrekt
        renderWallStacks();
        updateGameInfo();
        updateActionButtonStates();
    }

    function createPawns() { /* ... (oförändrad från förra versionen) ... */ 
        gameState.pawns.forEach(pawnState => {
            let pawnElement = document.getElementById(pawnState.id);
            if (!pawnElement) {
                pawnElement = document.createElement('div');
                pawnElement.classList.add('pawn');
                pawnElement.id = pawnState.id;
                gameBoard.appendChild(pawnElement);
            }
            const leftPos = pawnState.col * (cellWidth + grooveWidth) + (cellWidth - pawnSize) / 2;
            const topPos = pawnState.row * (cellWidth + grooveWidth) + (cellWidth - pawnSize) / 2;
            pawnElement.style.left = `${leftPos}px`;
            pawnElement.style.top = `${topPos}px`;
        });
    }
    
    function renderWallStacks() { /* ... (oförändrad) ... */ 
        player1WallStackContainer.innerHTML = '';
        player2WallStackContainer.innerHTML = '';
        player1WallsCountDisplay.textContent = gameState.playerWallsCount[1];
        player2WallsCountDisplay.textContent = gameState.playerWallsCount[2];

        for (let i = 0; i < gameState.playerWallsCount[1]; i++) {
            const wallVisual = document.createElement('div');
            wallVisual.classList.add('wall-visual', 'player1-wall-visual');
            player1WallStackContainer.appendChild(wallVisual);
        }
        for (let i = 0; i < gameState.playerWallsCount[2]; i++) {
            const wallVisual = document.createElement('div');
            wallVisual.classList.add('wall-visual', 'player2-wall-visual');
            player2WallStackContainer.appendChild(wallVisual);
        }
    }

    function renderWalls() { // Säkerställ att klasser appliceras korrekt
        // Rensa gamla klasser
        document.querySelectorAll('.h-groove, .v-groove').forEach(g => {
            g.classList.remove('h-wall-placed', 'v-wall-placed', 
                                'player1-wall', 'player2-wall', 
                                'wall-preview', 'player1-wall-preview', 'player2-wall-preview');
        });

        gameState.walls.forEach(wall => {
            const playerClass = wall.player === 1 ? 'player1-wall' : 'player2-wall';
            if (wall.orientation === 'H') {
                const groove1 = gameBoard.querySelector(`.h-groove[data-row='${wall.r}'][data-col='${wall.c}']`);
                const groove2 = gameBoard.querySelector(`.h-groove[data-row='${wall.r}'][data-col='${wall.c + 1}']`);
                if (groove1) groove1.classList.add('h-wall-placed', playerClass);
                if (groove2) groove2.classList.add('h-wall-placed', playerClass);
            } else { // 'V'
                const groove1 = gameBoard.querySelector(`.v-groove[data-row='${wall.r}'][data-col='${wall.c}']`);
                const groove2 = gameBoard.querySelector(`.v-groove[data-row='${wall.r + 1}'][data-col='${wall.c}']`);
                if (groove1) groove1.classList.add('v-wall-placed', playerClass);
                if (groove2) groove2.classList.add('v-wall-placed', playerClass);
            }
        });
        updateIntersectionHovers(); // Kan behövas för att städa upp hover-state om en vägg placeras
    }

    function updateGameInfo() { /* ... (oförändrad) ... */ 
        currentPlayerNameDisplay.textContent = `Spelare ${gameState.currentPlayer}`;
        turnIndicator.classList.remove('player1-turn', 'player2-turn');
        turnIndicator.classList.add(gameState.currentPlayer === 1 ? 'player1-turn' : 'player2-turn');
    }
    
    actionButtonElements.forEach(button => { /* ... (oförändrad) ... */ 
        button.addEventListener('click', (event) => {
            if (gameState.gameOver) return;
            const buttonPlayer = parseInt(event.target.dataset.player);
            if (buttonPlayer !== gameState.currentPlayer) return; 

            const newMode = event.target.dataset.mode;
            gameState.mode = newMode;

            if (newMode.startsWith('wall')) {
                deselectPawn();
            }
            updateActionButtonStates();
            updateIntersectionHovers(); // Uppdatera hover-status när läge ändras
        });
    });

    function updateActionButtonStates() { /* ... (oförändrad) ... */
        actionButtonElements.forEach(btn => {
            const buttonPlayer = parseInt(btn.dataset.player);
            if (buttonPlayer === gameState.currentPlayer) {
                btn.disabled = false;
                if (btn.dataset.mode === gameState.mode) {
                    btn.classList.add('selected-action');
                } else {
                    btn.classList.remove('selected-action');
                }
            } else {
                btn.disabled = true; 
                btn.classList.remove('selected-action');
            }
        });
    }
    
    function updateIntersectionHovers() {
        document.querySelectorAll('.intersection').forEach(inter => {
            if (gameState.mode.startsWith('wall-') && gameState.playerWallsCount[gameState.currentPlayer] > 0 && !gameState.gameOver) {
                inter.classList.add('wall-placement-hoverable');
            } else {
                inter.classList.remove('wall-placement-hoverable');
            }
        });
    }

    function deselectPawn() { /* ... (oförändrad) ... */ 
        if (gameState.selectedPawn) {
            const oldPawnCell = gameBoard.querySelector(`.cell[data-row='${gameState.selectedPawn.row}'][data-col='${gameState.selectedPawn.col}']`);
            if (oldPawnCell) {
                oldPawnCell.classList.remove('selected', 'player1', 'player2');
            }
            gameState.selectedPawn = null;
        }
    }

    function handleCellClick(event) { /* ... (oförändrad) ... */ 
        if (gameState.gameOver || gameState.mode !== 'move') return;

        const clickedRow = parseInt(event.target.dataset.row);
        const clickedCol = parseInt(event.target.dataset.col);

        if (gameState.selectedPawn) {
            const pawn = gameState.selectedPawn;
            if (isValidMove(pawn, clickedRow, clickedCol)) {
                const currentPawnState = gameState.pawns.find(p => p.player === pawn.player);
                currentPawnState.row = clickedRow;
                currentPawnState.col = clickedCol;
                deselectPawn();
                createPawns();
                checkWinCondition(currentPawnState);
                if (!gameState.gameOver) switchPlayer();
            } else {
                deselectPawn();
            }
        } else {
            const pawnToSelect = gameState.pawns.find(p => p.row === clickedRow && p.col === clickedCol && p.player === gameState.currentPlayer);
            if (pawnToSelect) {
                gameState.selectedPawn = { ...pawnToSelect };
                event.target.classList.add('selected', pawnToSelect.player === 1 ? 'player1' : 'player2');
            }
        }
    }

    function isValidMove(pawn, targetRow, targetCol) { /* ... (oförändrad) ... */ 
        const dr = Math.abs(pawn.row - targetRow);
        const dc = Math.abs(pawn.col - targetCol);
        if (!((dr === 1 && dc === 0) || (dr === 0 && dc === 1))) return false;

        if (targetRow < pawn.row) { if (gameState.horizontalSegments[targetRow][pawn.col]) return false; } 
        else if (targetRow > pawn.row) { if (gameState.horizontalSegments[pawn.row][pawn.col]) return false; } 
        else if (targetCol < pawn.col) { if (gameState.verticalSegments[pawn.row][targetCol]) return false; } 
        else if (targetCol > pawn.col) { if (gameState.verticalSegments[pawn.row][pawn.col]) return false; }
        return true;
    }

    function clearWallPreviews() {
        currentPreviewedGrooves.forEach(g => {
            g.classList.remove('wall-preview', 'player1-wall-preview', 'player2-wall-preview');
        });
        currentPreviewedGrooves = [];
    }

    function handleIntersectionMouseEnter(event) {
        if (gameState.gameOver || !gameState.mode.startsWith('wall-') || gameState.playerWallsCount[gameState.currentPlayer] <= 0) {
            return;
        }
        clearWallPreviews(); // Rensa tidigare previews

        const r_intersect = parseInt(event.target.dataset.r);
        const c_intersect = parseInt(event.target.dataset.c);
        const playerPreviewClass = gameState.currentPlayer === 1 ? 'player1-wall-preview' : 'player2-wall-preview';
        let groove1, groove2;

        if (gameState.mode === 'wall-h') {
            if (c_intersect + 1 >= boardSize) return; // Kan inte förhandsvisa utanför brädet
            // Kolla om segmenten är lediga och om det inte skapar en korsning (samma som i handleIntersectionClick)
            if (!gameState.horizontalSegments[r_intersect][c_intersect] &&
                !gameState.horizontalSegments[r_intersect][c_intersect + 1] &&
                !checkCrossingWall(r_intersect, c_intersect, 'H')) {
                
                groove1 = gameBoard.querySelector(`.h-groove[data-row='${r_intersect}'][data-col='${c_intersect}']`);
                groove2 = gameBoard.querySelector(`.h-groove[data-row='${r_intersect}'][data-col='${c_intersect + 1}']`);
            }
        } else if (gameState.mode === 'wall-v') {
            if (r_intersect + 1 >= boardSize) return; // Kan inte förhandsvisa utanför brädet
            if (!gameState.verticalSegments[r_intersect][c_intersect] &&
                !gameState.verticalSegments[r_intersect + 1][c_intersect] &&
                !checkCrossingWall(r_intersect, c_intersect, 'V')) {

                groove1 = gameBoard.querySelector(`.v-groove[data-row='${r_intersect}'][data-col='${c_intersect}']`);
                groove2 = gameBoard.querySelector(`.v-groove[data-row='${r_intersect + 1}'][data-col='${c_intersect}']`);
            }
        }

        if (groove1) { 
            groove1.classList.add('wall-preview', playerPreviewClass);
            currentPreviewedGrooves.push(groove1);
        }
        if (groove2) {
            groove2.classList.add('wall-preview', playerPreviewClass);
            currentPreviewedGrooves.push(groove2);
        }
    }

    function handleIntersectionMouseLeave(event) {
        clearWallPreviews();
    }


    function handleIntersectionClick(event) {
        if (gameState.gameOver || (!gameState.mode.startsWith('wall-'))) return;
        if (gameState.playerWallsCount[gameState.currentPlayer] <= 0) {
            alert("Inga väggar kvar!");
            return;
        }
        clearWallPreviews(); // Rensa preview innan placering

        const intersection_r = parseInt(event.target.dataset.r); 
        const intersection_c = parseInt(event.target.dataset.c); 

        if (gameState.mode === 'wall-h') {
            if (intersection_c + 1 >= boardSize) { alert("Kan inte placera vägg utanför brädet."); return; }
            if (!gameState.horizontalSegments[intersection_r][intersection_c] &&
                !gameState.horizontalSegments[intersection_r][intersection_c + 1] &&
                !checkCrossingWall(intersection_r, intersection_c, 'H')) {
                gameState.horizontalSegments[intersection_r][intersection_c] = true;
                gameState.horizontalSegments[intersection_r][intersection_c + 1] = true;
                gameState.walls.push({ r: intersection_r, c: intersection_c, orientation: 'H', player: gameState.currentPlayer });
                finishWallPlacement();
            } else {
                alert("Ogiltig väggplacering (överlapp eller korsning)!");
            }
        } else if (gameState.mode === 'wall-v') {
            if (intersection_r + 1 >= boardSize) { alert("Kan inte placera vägg utanför brädet."); return; }
            if (!gameState.verticalSegments[intersection_r][intersection_c] &&
                !gameState.verticalSegments[intersection_r + 1][intersection_c] &&
                !checkCrossingWall(intersection_r, intersection_c, 'V')) {
                gameState.verticalSegments[intersection_r][intersection_c] = true;
                gameState.verticalSegments[intersection_r + 1][intersection_c] = true;
                gameState.walls.push({ r: intersection_r, c: intersection_c, orientation: 'V', player: gameState.currentPlayer });
                finishWallPlacement();
            } else {
                alert("Ogiltig väggplacering (överlapp eller korsning)!");
            }
        }
    }
    
    function checkCrossingWall(r_intersect, c_intersect, newWallOrientation) { /* ... (oförändrad) ... */ 
        if (newWallOrientation === 'H') { 
            if (gameState.verticalSegments[r_intersect][c_intersect] &&
                (r_intersect + 1 < boardSize && gameState.verticalSegments[r_intersect + 1][c_intersect])) {
                return true;
            }
        } else { 
            if (gameState.horizontalSegments[r_intersect][c_intersect] &&
                (c_intersect + 1 < boardSize && gameState.horizontalSegments[r_intersect][c_intersect + 1])) {
                return true;
            }
        }
        return false;
    }

    function finishWallPlacement() { /* ... (oförändrad) ... */
        gameState.playerWallsCount[gameState.currentPlayer]--;
        renderWalls(); // Viktigt att detta anropas för att rita den nya väggen
        renderWallStacks(); 
        if (!gameState.gameOver) switchPlayer();
    }

    function switchPlayer() { /* ... (oförändrad, men ser till att updateIntersectionHovers anropas) ... */
        gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        gameState.mode = 'move'; 
        deselectPawn();
        updateGameInfo();
        updateActionButtonStates(); 
        updateIntersectionHovers(); // Rensa/uppdatera hover-möjligheter
    }

    function checkWinCondition(pawnMoved) { /* ... (oförändrad) ... */
        if (!pawnMoved) return;
        let winner = null;
        if (pawnMoved.player === 1 && pawnMoved.row === boardSize - 1) winner = 1;
        else if (pawnMoved.player === 2 && pawnMoved.row === 0) winner = 2;

        if (winner) {
            gameState.gameOver = true;
            winnerMessage.textContent = `Spelare ${winner} vinner!`;
            winnerMessage.classList.remove('hidden');
            winnerMessage.classList.add(winner === 1 ? 'player1wins' : 'player2wins');
            actionButtonElements.forEach(btn => btn.disabled = true); 
            updateIntersectionHovers(); // Ta bort hover-möjligheter vid spel slut
        }
    }

    createBoard(); // Initiera spelet
});