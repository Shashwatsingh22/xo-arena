import { useEffect, useState, useRef, useCallback } from "react";
import { getSocket } from "../lib/nakama";
import { Session, MatchData } from "@heroiclabs/nakama-js";
import { OpCode, StateUpdate, GameOver } from "../types";
import { playMove, playOpponentMove, playWin, playLose, playDraw, playMatchStart, playCountdown } from "../lib/sounds";

interface Props {
  session: Session;
  matchId: string;
  onBack: () => void;
  soundOn: boolean;
}

const MARKS = ["", "✕", "○"];

export default function Game({ session, matchId, onBack, soundOn }: Props) {
  const [board, setBoard] = useState<number[]>(Array(9).fill(0));
  const [currentTurn, setCurrentTurn] = useState("");
  const [gameOver, setGameOver] = useState<GameOver | null>(null);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(true);
  const [players, setPlayers] = useState<Record<string, string>>({});
  const [turnDeadline, setTurnDeadline] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const socketRef = useRef(getSocket());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joinedRef = useRef(false);
  const prevBoardRef = useRef<number[]>(Array(9).fill(0));
  const gameStartedRef = useRef(false);

  const isMyTurn = currentTurn === session.user_id;
  const winLineSet = new Set(gameOver?.winLine || []);

  // Countdown timer for timed mode
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!turnDeadline) { setTimeLeft(null); return; }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 5 && remaining > 0 && soundOn) playCountdown();
      if (remaining <= 0 && timerRef.current) clearInterval(timerRef.current);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [turnDeadline, soundOn]);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    if (!socket) { setError("Socket not connected"); return; }
    if (joinedRef.current) return;
    joinedRef.current = true;

    socket.joinMatch(matchId).then((match) => {
      const p: Record<string, string> = {};
      for (const presence of match.presences || []) {
        p[presence.user_id!] = presence.username!;
      }
      p[session.user_id!] = session.username!;
      setPlayers(p);
      if (Object.keys(p).length >= 2) {
        setWaiting(false);
        if (!gameStartedRef.current && soundOn) { playMatchStart(); gameStartedRef.current = true; }
      }
    }).catch((err: Error) => {
      setError("Failed to join match: " + err.message);
    });

    socket.onmatchdata = (data: MatchData) => {
      const opCode = data.op_code;
      const payload = new TextDecoder().decode(data.data);

      if (opCode === OpCode.STATE_UPDATE) {
        const state: StateUpdate = JSON.parse(payload);
        // Detect if opponent made a move
        if (soundOn) {
          const oldBoard = prevBoardRef.current;
          for (let i = 0; i < state.board.length; i++) {
            if (oldBoard[i] === 0 && state.board[i] !== 0) {
              playOpponentMove();
              break;
            }
          }
        }
        prevBoardRef.current = [...state.board];
        setBoard(state.board);
        setCurrentTurn(state.currentTurn);
        setTurnDeadline(state.turnDeadline);
        if (!gameStartedRef.current && soundOn) { playMatchStart(); gameStartedRef.current = true; }
        setWaiting(false);
      } else if (opCode === OpCode.GAME_OVER) {
        const result: GameOver = JSON.parse(payload);
        setBoard(result.board);
        setGameOver(result);
        setTurnDeadline(null);
        if (soundOn) {
          if (result.reason === "draw") playDraw();
          else if (result.winner === session.user_id) playWin();
          else playLose();
        }
      } else if (opCode === OpCode.REJECTED) {
        const msg = JSON.parse(payload);
        setError(msg.reason);
        setTimeout(() => setError(""), 2000);
      }
    };

    socket.onmatchpresence = (event) => {
      setPlayers((prev) => {
        const updated = { ...prev };
        for (const join of event.joins || []) updated[join.user_id!] = join.username!;
        for (const leave of event.leaves || []) delete updated[leave.user_id!];
        if (Object.keys(updated).length >= 2) {
          setWaiting(false);
          if (!gameStartedRef.current && soundOn) { playMatchStart(); gameStartedRef.current = true; }
        }
        return updated;
      });
    };

    return () => {};
  }, [matchId, session, soundOn]);

  const makeMove = useCallback((position: number) => {
    if (!isMyTurn || gameOver || board[position] !== 0) return;
    const socket = socketRef.current;
    if (!socket) return;
    if (soundOn) playMove();
    socket.sendMatchState(matchId, OpCode.MOVE, JSON.stringify({ position }));
  }, [isMyTurn, gameOver, board, matchId, soundOn]);

  const handleBack = useCallback(() => {
    const socket = socketRef.current;
    if (socket) socket.leaveMatch(matchId).catch(() => {});
    onBack();
  }, [matchId, onBack]);

  const getResultText = () => {
    if (!gameOver) return "";
    if (gameOver.reason === "draw") return "🤝 It's a draw!";
    if (gameOver.reason === "timeout") {
      return gameOver.winner === session.user_id
        ? "🏆 You win! Opponent timed out." : "⏰ Time ran out!";
    }
    if (gameOver.reason === "disconnect") {
      return gameOver.winner === session.user_id
        ? "🏆 You win! Opponent left." : "💨 Disconnected!";
    }
    return gameOver.winner === session.user_id ? "🏆 Victory!" : "💀 Defeated!";
  };

  const boardSize = Math.sqrt(board.length);

  return (
    <div className="page game-page">
      <div className="card game-card">
        {waiting ? (
          <div className="waiting">
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⚔️</div>
            <h2>Waiting for opponent...</h2>
            <div className="spinner" />
            <p className="hint">Share the link with a friend!</p>
          </div>
        ) : (
          <>
            <div className="game-info">
              <div className="players">
                {Object.entries(players).map(([uid, name]) => (
                  <span key={uid} className={`player-tag ${uid === currentTurn ? "active-turn" : ""}`}>
                    {name} {uid === session.user_id ? "(you)" : ""}
                  </span>
                ))}
              </div>
              {!gameOver && (
                <p className="turn-info">
                  {isMyTurn ? "⚡ Your turn" : "⏳ Opponent's turn"}
                  {timeLeft !== null && (
                    <span className={`timer ${timeLeft <= 5 ? "urgent" : ""}`}>
                      {" "}{timeLeft}s
                    </span>
                  )}
                </p>
              )}
            </div>
            <div
              className={`board board-${boardSize}`}
              role="grid"
              aria-label="Tic-tac-toe board"
            >
              {board.map((cell, i) => (
                <button
                  key={i}
                  className={`cell ${cell === 1 ? "x" : cell === 2 ? "o" : ""} ${
                    isMyTurn && cell === 0 && !gameOver ? "clickable" : ""
                  } ${winLineSet.has(i) ? "win" : ""}`}
                  onClick={() => makeMove(i)}
                  disabled={!isMyTurn || cell !== 0 || !!gameOver}
                  aria-label={`Cell ${i}, ${cell === 0 ? "empty" : MARKS[cell]}`}
                >
                  {MARKS[cell]}
                </button>
              ))}
            </div>
            {gameOver && (
              <div className="game-result">
                <h2>{getResultText()}</h2>
                <button onClick={handleBack}>⚡ Play Again</button>
              </div>
            )}
            {error && <p className="error" role="alert">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
