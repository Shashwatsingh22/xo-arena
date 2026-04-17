import { useState, useCallback, useEffect, useRef } from "react";
import { getBotMove, checkWinLocal } from "../lib/bot";
import { playMove, playOpponentMove, playWin, playLose, playDraw, playMatchStart } from "../lib/sounds";

interface Props {
  boardSize: 3 | 5;
  onBack: () => void;
  soundOn: boolean;
}

const MARKS = ["", "✕", "○"];

export default function BotGame({ boardSize, onBack, soundOn }: Props) {
  const winLen = boardSize === 5 ? 4 : 3;
  const totalCells = boardSize * boardSize;
  const [board, setBoard] = useState<number[]>(Array(totalCells).fill(0));
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [winLine, setWinLine] = useState<number[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [botThinking, setBotThinking] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current && soundOn) { playMatchStart(); startedRef.current = true; }
  }, [soundOn]);

  const isPlayerTurn = moveCount % 2 === 0; // Player is X (even moves)
  const winLineSet = new Set(winLine);

  const checkEnd = useCallback((b: number[], mc: number) => {
    const result = checkWinLocal(b, boardSize, winLen);
    if (result) {
      setWinLine(result.cells);
      const w = result.mark === 1 ? "player" : "bot";
      setWinner(w);
      setGameOver(true);
      if (soundOn) { w === "player" ? playWin() : playLose(); }
      return true;
    }
    if (mc >= totalCells) {
      setWinner(null);
      setGameOver(true);
      if (soundOn) playDraw();
      return true;
    }
    return false;
  }, [boardSize, winLen, totalCells, soundOn]);

  const doBotMove = useCallback((b: number[], mc: number) => {
    setBotThinking(true);
    setTimeout(() => {
      const move = getBotMove(b, boardSize);
      if (move === -1) { setBotThinking(false); return; }
      const newBoard = [...b];
      newBoard[move] = 2; // O
      if (soundOn) playOpponentMove();
      setBoard(newBoard);
      setMoveCount(mc + 1);
      checkEnd(newBoard, mc + 1);
      setBotThinking(false);
    }, 400); // Small delay to feel natural
  }, [boardSize, soundOn, checkEnd]);

  const makeMove = useCallback((pos: number) => {
    if (!isPlayerTurn || gameOver || board[pos] !== 0 || botThinking) return;
    const newBoard = [...board];
    newBoard[pos] = 1; // X
    if (soundOn) playMove();
    setBoard(newBoard);
    const newMc = moveCount + 1;
    setMoveCount(newMc);
    if (!checkEnd(newBoard, newMc)) {
      doBotMove(newBoard, newMc);
    }
  }, [isPlayerTurn, gameOver, board, botThinking, moveCount, soundOn, checkEnd, doBotMove]);

  const restart = () => {
    setBoard(Array(totalCells).fill(0));
    setGameOver(false);
    setWinner(null);
    setWinLine([]);
    setMoveCount(0);
    setBotThinking(false);
    if (soundOn) playMatchStart();
  };

  const getResultText = () => {
    if (winner === "player") return "🏆 You win!";
    if (winner === "bot") return "🤖 Bot wins!";
    return "🤝 It's a draw!";
  };

  return (
    <div className="page game-page">
      <div className="card game-card">
        <div className="game-info">
          <div className="players">
            <span className={`player-tag ${isPlayerTurn && !gameOver ? "active-turn" : ""}`}>
              You (✕)
            </span>
            <span className={`player-tag ${!isPlayerTurn && !gameOver ? "active-turn" : ""}`}>
              🤖 Bot (○)
            </span>
          </div>
          {!gameOver && (
            <p className="turn-info">
              {botThinking ? "🤖 Bot thinking..." : "⚡ Your turn"}
            </p>
          )}
        </div>

        <div className={`board board-${boardSize}`} role="grid" aria-label="Tic-tac-toe board">
          {board.map((cell, i) => (
            <button
              key={i}
              className={`cell ${cell === 1 ? "x" : cell === 2 ? "o" : ""} ${
                isPlayerTurn && cell === 0 && !gameOver && !botThinking ? "clickable" : ""
              } ${winLineSet.has(i) ? "win" : ""}`}
              onClick={() => makeMove(i)}
              disabled={!isPlayerTurn || cell !== 0 || gameOver || botThinking}
              aria-label={`Cell ${i}, ${cell === 0 ? "empty" : MARKS[cell]}`}
            >
              {MARKS[cell]}
            </button>
          ))}
        </div>

        {gameOver && (
          <div className="game-result">
            <h2>{getResultText()}</h2>
            <div style={{ display: "flex", gap: "0.8rem", justifyContent: "center" }}>
              <button onClick={restart}>🔄 Rematch</button>
              <button onClick={onBack} style={{ background: "var(--surface)", boxShadow: "none" }}>
                ← Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
