import { useEffect, useState, useRef, useCallback } from "react";
import { getSocket } from "../lib/nakama";
import { Session, MatchData } from "@heroiclabs/nakama-js";
import { OpCode, StateUpdate, GameOver } from "../types";

interface Props {
  session: Session;
  matchId: string;
  onBack: () => void;
}

const MARKS = ["", "✕", "○"];

export default function Game({ session, matchId, onBack }: Props) {
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

  const isMyTurn = currentTurn === session.user_id;

  // Countdown timer for timed mode
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!turnDeadline) {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && timerRef.current) clearInterval(timerRef.current);
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [turnDeadline]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) {
      setError("Socket not connected");
      return;
    }

    // Prevent double-join from React StrictMode
    if (joinedRef.current) return;
    joinedRef.current = true;

    socket.joinMatch(matchId).then((match) => {
      const p: Record<string, string> = {};
      for (const presence of match.presences) {
        p[presence.user_id!] = presence.username!;
      }
      p[session.user_id!] = session.username!;
      setPlayers(p);
      if (Object.keys(p).length >= 2) setWaiting(false);
    }).catch((err: Error) => {
      setError("Failed to join match: " + err.message);
    });

    socket.onmatchdata = (data: MatchData) => {
      const opCode = data.op_code;
      const payload = new TextDecoder().decode(data.data);

      if (opCode === OpCode.STATE_UPDATE) {
        const state: StateUpdate = JSON.parse(payload);
        setBoard(state.board);
        setCurrentTurn(state.currentTurn);
        setTurnDeadline(state.turnDeadline);
        setWaiting(false);
      } else if (opCode === OpCode.GAME_OVER) {
        const result: GameOver = JSON.parse(payload);
        setBoard(result.board);
        setGameOver(result);
        setTurnDeadline(null);
      } else if (opCode === OpCode.REJECTED) {
        const msg = JSON.parse(payload);
        setError(msg.reason);
        setTimeout(() => setError(""), 2000);
      }
    };

    socket.onmatchpresence = (event) => {
      setPlayers((prev) => {
        const updated = { ...prev };
        for (const join of event.joins || []) {
          updated[join.user_id!] = join.username!;
        }
        for (const leave of event.leaves || []) {
          delete updated[leave.user_id!];
        }
        if (Object.keys(updated).length >= 2) setWaiting(false);
        return updated;
      });
    };

    return () => {
      // Don't leave match on cleanup — React StrictMode re-mounts
      // Match leave is handled when navigating away via onBack
    };
  }, [matchId, session]);

  const makeMove = useCallback(
    (position: number) => {
      if (!isMyTurn || gameOver || board[position] !== 0) return;
      const socket = socketRef.current;
      if (!socket) return;
      socket.sendMatchState(matchId, OpCode.MOVE, JSON.stringify({ position }));
    },
    [isMyTurn, gameOver, board, matchId]
  );

  const handleBack = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.leaveMatch(matchId).catch(() => {});
    }
    onBack();
  }, [matchId, onBack]);

  const getResultText = () => {
    if (!gameOver) return "";
    if (gameOver.reason === "draw") return "It's a draw!";
    if (gameOver.reason === "timeout") {
      return gameOver.winner === session.user_id
        ? "You win! Opponent timed out." : "You lost! Time ran out.";
    }
    if (gameOver.reason === "disconnect") {
      return gameOver.winner === session.user_id
        ? "You win! Opponent disconnected." : "You lost! Disconnected.";
    }
    return gameOver.winner === session.user_id ? "You win!" : "You lost!";
  };

  return (
    <div className="page game-page">
      <div className="card game-card">
        {waiting ? (
          <div className="waiting">
            <h2>Waiting for opponent...</h2>
            <div className="spinner" />
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
                  {isMyTurn ? "Your turn" : "Opponent's turn"}
                  {timeLeft !== null && (
                    <span className={`timer ${timeLeft <= 5 ? "urgent" : ""}`}>
                      {" "}{timeLeft}s
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="board" role="grid" aria-label="Tic-tac-toe board">
              {board.map((cell, i) => (
                <button
                  key={i}
                  className={`cell ${cell === 1 ? "x" : cell === 2 ? "o" : ""} ${
                    isMyTurn && cell === 0 && !gameOver ? "clickable" : ""
                  }`}
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
                <button onClick={handleBack}>Play Again</button>
              </div>
            )}
            {error && <p className="error" role="alert">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
