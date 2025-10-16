const chessboard = document.getElementById("chessboard");

const pieces = {
    'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚', 'P': '♟',
    'r': '♖', 'n': '♘', 'b': '♗', 'q': '♕', 'k': '♔', 'p': '♙'
};

let boardState = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

let draggedPiece = null;
let whs_move = 0;
let enPassantTarget = null;
let castlingRights = { whiteK: true, whiteQ: true, blackK: true, blackQ: true };

function renderBoard() {
    chessboard.innerHTML = "";
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement("div");
            cell.classList.add("cell", (r + c) % 2 === 0 ? "light" : "dark");
            cell.dataset.r = r;
            cell.dataset.c = c;
            const piece = boardState[r][c];
            if (piece !== '.') {
                const id = [piece, r, c];
                const pieceElement = document.createElement("div");
                pieceElement.id = id.join(",");
                pieceElement.textContent = pieces[piece];
                pieceElement.classList.add("piece");
                pieceElement.draggable = true;
                cell.appendChild(pieceElement);
            }
            chessboard.appendChild(cell);
        }
    }
}

function checkLetterCase(letter) {
    return letter === letter.toUpperCase() ? 1 : 0;
}

function cloneBoard(board) {
    return board.map(row => [...row]);
}

function findKing(board, color) {
    const target = color === "white" ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === target) return [r, c];
        }
    }
    return null;
}

function validatePawnMove(currentPosition, targetPosition, currentPiece, board) {
    const direction = currentPiece === 'p' ? 1 : -1;
    const [sr, sc] = currentPosition;
    const [tr, tc] = targetPosition;
    if (tr === sr + direction && tc === sc && board[tr][tc] === '.') return true;
    if (tr === sr + 2 * direction && tc === sc && board[tr][tc] === '.' && board[sr + direction][sc] === '.') {
        if ((currentPiece === 'p' && sr === 1) || (currentPiece === 'P' && sr === 6)) return true;
    }
    if (tr === sr + direction && Math.abs(tc - sc) === 1) {
        if (board[tr][tc] !== '.' && checkLetterCase(board[tr][tc]) !== checkLetterCase(currentPiece)) return true;
        if (enPassantTarget && tr === enPassantTarget[0] && tc === enPassantTarget[1]) return true;
    }
    return false;
}

function validateKnightMove(currentPosition, targetPosition, board) {
    const [sr, sc] = currentPosition;
    const [tr, tc] = targetPosition;
    const moves = [[-1, 2], [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1]];
    for (const [dr, dc] of moves) {
        if (sr + dr === tr && sc + dc === tc) {
            const tp = board[tr][tc];
            if (tp === '.' || checkLetterCase(tp) !== checkLetterCase(board[sr][sc])) return true;
        }
    }
    return false;
}

function validateBishopMove(currentPosition, targetPosition, board) {
    const [sr, sc] = currentPosition;
    const [tr, tc] = targetPosition;
    if (Math.abs(tr - sr) !== Math.abs(tc - sc)) return false;
    const rd = tr > sr ? 1 : -1;
    const cd = tc > sc ? 1 : -1;
    let r = sr + rd, c = sc + cd;
    while (r !== tr && c !== tc) {
        if (board[r][c] !== '.') return false;
        r += rd; c += cd;
    }
    const tp = board[tr][tc];
    return tp === '.' || checkLetterCase(tp) !== checkLetterCase(board[sr][sc]);
}

function validateRookMove(currentPosition, targetPosition, board) {
    const [sr, sc] = currentPosition;
    const [tr, tc] = targetPosition;
    if (sr !== tr && sc !== tc) return false;
    const rd = sr === tr ? 0 : (tr > sr ? 1 : -1);
    const cd = sc === tc ? 0 : (tc > sc ? 1 : -1);
    let r = sr + rd, c = sc + cd;
    while (r !== tr || c !== tc) {
        if (board[r][c] !== '.') return false;
        r += rd; c += cd;
    }
    const tp = board[tr][tc];
    return tp === '.' || checkLetterCase(tp) !== checkLetterCase(board[sr][sc]);
}

function validateQueenMove(currentPosition, targetPosition, board) {
    return validateBishopMove(currentPosition, targetPosition, board) || validateRookMove(currentPosition, targetPosition, board);
}

function validateKingMove(currentPosition, targetPosition, board, piece, ignoreCheck) {
    const [sr, sc] = currentPosition;
    const [tr, tc] = targetPosition;
    const moves = [[0, 1], [0, -1], [1, 0], [1, -1], [1, 1], [-1, 0], [-1, 1], [-1, -1]];
    for (const [dr, dc] of moves) {
        if (sr + dr === tr && sc + dc === tc) {
            const tp = board[tr][tc];
            if (tp === '.' || checkLetterCase(tp) !== checkLetterCase(board[sr][sc])) return true;
        }
    }
    if (!ignoreCheck) {
        if (piece === 'K' && sr === 7 && sc === 4 && tr === 7 && tc === 6 && castlingRights.whiteK) {
            if (board[7][5] === '.' && board[7][6] === '.' && !isKingInCheck(board, "white") && !isSquareAttacked(board, 7, 5, "black") && !isSquareAttacked(board, 7, 6, "black")) return true;
        }
        if (piece === 'K' && sr === 7 && sc === 4 && tr === 7 && tc === 2 && castlingRights.whiteQ) {
            if (board[7][3] === '.' && board[7][2] === '.' && board[7][1] === '.' && !isKingInCheck(board, "white") && !isSquareAttacked(board, 7, 3, "black") && !isSquareAttacked(board, 7, 2, "black")) return true;
        }
        if (piece === 'k' && sr === 0 && sc === 4 && tr === 0 && tc === 6 && castlingRights.blackK) {
            if (board[0][5] === '.' && board[0][6] === '.' && !isKingInCheck(board, "black") && !isSquareAttacked(board, 0, 5, "white") && !isSquareAttacked(board, 0, 6, "white")) return true;
        }
        if (piece === 'k' && sr === 0 && sc === 4 && tr === 0 && tc === 2 && castlingRights.blackQ) {
            if (board[0][3] === '.' && board[0][2] === '.' && board[0][1] === '.' && !isKingInCheck(board, "black") && !isSquareAttacked(board, 0, 3, "white") && !isSquareAttacked(board, 0, 2, "white")) return true;
        }
    }
    return false;
}

function isSquareAttacked(board, row, col, attackerColor) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '.') continue;
            const color = checkLetterCase(piece) === 1 ? "white" : "black";
            if (color !== attackerColor) continue;
            const pseudo = { id: [piece, r, c].join(',') };
            if (legalMove(pseudo, [row, col], 0, board, true)) return true;
        }
    }
    return false;
}

function isKingInCheck(board, color) {
    const pos = findKing(board, color);
    if (!pos) return false;
    const opp = color === "white" ? "black" : "white";
    return isSquareAttacked(board, pos[0], pos[1], opp);
}

function simulateMove(board, from, to) {
    const nb = cloneBoard(board);
    const [fr, fc] = from;
    const [tr, tc] = to;
    nb[tr][tc] = nb[fr][fc];
    nb[fr][fc] = '.';
    return nb;
}

function getAllLegalMoves(board, color) {
    const moves = [];
    const cf = color === "white" ? 1 : 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p === '.' || checkLetterCase(p) !== cf) continue;
            for (let tr = 0; tr < 8; tr++) {
                for (let tc = 0; tc < 8; tc++) {
                    const pseudo = { id: [p, r, c].join(',') };
                    if (legalMove(pseudo, [tr, tc], 0, board, false, true)) moves.push({ from: [r, c], to: [tr, tc] });
                }
            }
        }
    }
    return moves;
}

function legalMove(piece, targetPosition, whs_move, board = boardState, ignoreCheck = false, internalOnlySafetyCheck = false) {
    const [p, sr, sc] = piece.id.split(",");
    const cp = p;
    const currentColor = checkLetterCase(cp) === 1 ? "white" : "black";
    const currentPosition = [parseInt(sr), parseInt(sc)];
    const [tr, tc] = targetPosition;
    if (!internalOnlySafetyCheck && !ignoreCheck) {
        if (checkLetterCase(cp) !== (whs_move % 2)) return false;
    }
    if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return false;
    let isValid = false;
    switch (cp.toLowerCase()) {
        case 'p': isValid = validatePawnMove(currentPosition, targetPosition, cp, board); break;
        case 'n': isValid = validateKnightMove(currentPosition, targetPosition, board); break;
        case 'b': isValid = validateBishopMove(currentPosition, targetPosition, board); break;
        case 'r': isValid = validateRookMove(currentPosition, targetPosition, board); break;
        case 'q': isValid = validateQueenMove(currentPosition, targetPosition, board); break;
        case 'k': isValid = validateKingMove(currentPosition, targetPosition, board, cp, ignoreCheck); break;
    }
    if (!isValid) return false;
    if (ignoreCheck) return true;
    const sim = simulateMove(board, currentPosition, targetPosition);
    if (isKingInCheck(sim, currentColor)) return false;
    return true;
}

function handlePawnPromotion(row, col) {
    const piece = boardState[row][col];
    if (piece === 'P' && row === 0) {
        const choice = prompt("Promote to (Q,R,B,N):", "Q");
        boardState[row][col] = ['Q', 'R', 'B', 'N'].includes(choice) ? choice : 'Q';
    }
    if (piece === 'p' && row === 7) {
        const choice = prompt("Promote to (q,r,b,n):", "q");
        boardState[row][col] = ['q', 'r', 'b', 'n'].includes(choice) ? choice : 'q';
    }
}

function movePieceAndPostUpdate(currentPieceObj, targetPosition) {
    const [p, sr, sc] = currentPieceObj.id.split(",");
    const cp = p;
    const [tr, tc] = targetPosition;
    if ((cp === 'P' || cp === 'p') && enPassantTarget && tr === enPassantTarget[0] && tc === enPassantTarget[1] && boardState[tr][tc] === '.') {
        const dir = cp === 'P' ? 1 : -1;
        boardState[tr + dir][tc] = '.';
    }
    if (cp === 'K') {
        if (sr == 7 && sc == 4 && tr == 7 && tc == 6) {
            boardState[7][5] = 'R';
            boardState[7][7] = '.';
        }
        if (sr == 7 && sc == 4 && tr == 7 && tc == 2) {
            boardState[7][3] = 'R';
            boardState[7][0] = '.';
        }
        castlingRights.whiteK = false;
        castlingRights.whiteQ = false;
    }
    if (cp === 'k') {
        if (sr == 0 && sc == 4 && tr == 0 && tc == 6) {
            boardState[0][5] = 'r';
            boardState[0][7] = '.';
        }
        if (sr == 0 && sc == 4 && tr == 0 && tc == 2) {
            boardState[0][3] = 'r';
            boardState[0][0] = '.';
        }
        castlingRights.blackK = false;
        castlingRights.blackQ = false;
    }
    if (cp === 'R' && sr === 7 && sc === 0) castlingRights.whiteQ = false;
    if (cp === 'R' && sr === 7 && sc === 7) castlingRights.whiteK = false;
    if (cp === 'r' && sr === 0 && sc === 0) castlingRights.blackQ = false;
    if (cp === 'r' && sr === 0 && sc === 7) castlingRights.blackK = false;
    boardState[parseInt(sr)][parseInt(sc)] = '.';
    boardState[tr][tc] = cp;
    enPassantTarget = null;
    if (cp === 'P' && parseInt(sr) === 6 && tr === 4) enPassantTarget = [5, tc];
    if (cp === 'p' && parseInt(sr) === 1 && tr === 3) enPassantTarget = [2, tc];
    handlePawnPromotion(tr, tc);
}

function showCheckmateMessage(winner) {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.background = "rgba(0,0,0,0.8)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.fontSize = "3rem";
    overlay.style.color = "white";
    overlay.style.zIndex = "1000";
    overlay.textContent = `Checkmate — ${winner.toUpperCase()} wins!`;
    document.body.appendChild(overlay);
}

function checkGameEndChecks() {
    const sideToMove = whs_move % 2 === 0 ? "black" : "white";
    const inCheck = isKingInCheck(boardState, sideToMove);
    const moves = getAllLegalMoves(boardState, sideToMove);
    if (moves.length === 0) {
        if (inCheck) {
            const winner = sideToMove === "white" ? "black" : "white";
            showCheckmateMessage(winner);
        } else {
            alert("Stalemate!");
        }
    } else if (inCheck) {
        console.log(`${sideToMove.toUpperCase()} is in CHECK!`);
    }
}

chessboard.addEventListener("dragstart", (e) => {
    if (e.target.classList.contains("piece")) {
        draggedPiece = e.target;
        setTimeout(() => e.target.style.visibility = "hidden", 0);
    }
});

chessboard.addEventListener("dragend", (e) => {
    if (draggedPiece) {
        draggedPiece.style.visibility = "visible";
        draggedPiece = null;
    }
});

chessboard.addEventListener("dragover", (e) => e.preventDefault());

chessboard.addEventListener("drop", (e) => {
    e.preventDefault();
    if (!draggedPiece) return;
    const targetCell = e.target.classList.contains("cell") ? e.target : e.target.parentElement;
    const r = parseInt(targetCell.dataset.r);
    const c = parseInt(targetCell.dataset.c);
    if (legalMove(draggedPiece, [r, c], whs_move, boardState, false)) {
        movePieceAndPostUpdate(draggedPiece, [r, c]);
        whs_move++;
        renderBoard();
        checkGameEndChecks();
    }
});

renderBoard();
