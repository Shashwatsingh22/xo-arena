// Bot AI for Tic-Tac-Toe
// 3×3: Minimax (perfect play)
// 5×5: Heuristic (fast, strong)

const EMPTY = 0, X = 1, O = 2;

function getWinLines(size: number, winLen: number): number[][] {
  const lines: number[][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const dirs = [[0,1],[1,0],[1,1],[1,-1]];
      for (const [dr, dc] of dirs) {
        const er = r + dr * (winLen - 1), ec = c + dc * (winLen - 1);
        if (er < 0 || er >= size || ec < 0 || ec >= size) continue;
        const line: number[] = [];
        for (let s = 0; s < winLen; s++) line.push((r + dr * s) * size + (c + dc * s));
        lines.push(line);
      }
    }
  }
  return lines;
}

function checkWin(board: number[], size: number, winLen: number): { mark: number; cells: number[] } | null {
  const lines = getWinLines(size, winLen);
  for (const line of lines) {
    const first = board[line[0]];
    if (first === EMPTY) continue;
    if (line.every(i => board[i] === first)) return { mark: first, cells: line };
  }
  return null;
}

// Minimax for 3×3
function minimax(board: number[], isMax: boolean, depth: number): number {
  const win = checkWin(board, 3, 3);
  if (win) return win.mark === O ? 10 - depth : depth - 10;
  if (board.every(c => c !== EMPTY)) return 0;

  let best = isMax ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== EMPTY) continue;
    board[i] = isMax ? O : X;
    const score = minimax(board, !isMax, depth + 1);
    board[i] = EMPTY;
    best = isMax ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

function botMove3x3(board: number[]): number {
  let bestScore = -Infinity, bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== EMPTY) continue;
    board[i] = O;
    const score = minimax(board, false, 0);
    board[i] = EMPTY;
    if (score > bestScore) { bestScore = score; bestMove = i; }
  }
  return bestMove;
}

// Heuristic for 5×5 (4-in-a-row)
function botMove5x5(board: number[]): number {
  const size = 5, winLen = 4;
  const lines = getWinLines(size, winLen);

  // Score each empty cell
  const scores = new Array(25).fill(0);
  for (const line of lines) {
    let oCount = 0, xCount = 0, empties: number[] = [];
    for (const idx of line) {
      if (board[idx] === O) oCount++;
      else if (board[idx] === X) xCount++;
      else empties.push(idx);
    }
    // Skip blocked lines
    if (oCount > 0 && xCount > 0) continue;

    for (const idx of empties) {
      if (oCount > 0) {
        // Bot's line — prioritize completing
        if (oCount === 3) scores[idx] += 1000;
        else if (oCount === 2) scores[idx] += 50;
        else scores[idx] += 5;
      } else if (xCount > 0) {
        // Opponent's line — block
        if (xCount === 3) scores[idx] += 500;
        else if (xCount === 2) scores[idx] += 30;
        else scores[idx] += 3;
      } else {
        scores[idx] += 1;
      }
    }
  }

  // Prefer center
  if (board[12] === EMPTY) scores[12] += 8;

  let bestScore = -1, bestMove = -1;
  for (let i = 0; i < 25; i++) {
    if (board[i] !== EMPTY && bestMove === -1) continue;
    if (board[i] === EMPTY && scores[i] > bestScore) {
      bestScore = scores[i]; bestMove = i;
    }
  }
  return bestMove;
}

export function getBotMove(board: number[], boardSize: number): number {
  if (boardSize === 3) return botMove3x3([...board]);
  return botMove5x5([...board]);
}

export function checkWinLocal(board: number[], boardSize: number, winLen: number) {
  return checkWin(board, boardSize, winLen);
}
