import { useState } from "react";
import { client } from "../lib/nakama";
import { Session } from "@heroiclabs/nakama-js";
import { playClick } from "../lib/sounds";

interface Props {
  session: Session | null;
  guestName: string;
  onMatchFound: (matchId: string) => void;
  onPlayBot: (boardSize: 3 | 5) => void;
}

export default function Lobby({ session, guestName, onMatchFound, onPlayBot }: Props) {
  const [mode, setMode] = useState<"classic" | "timed">("classic");
  const [boardSize, setBoardSize] = useState<3 | 5>(3);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const displayName = session?.username || guestName || "Player";
  const isOnline = !!session;

  const findMatch = async () => {
    if (!session) return;
    playClick();
    setSearching(true);
    setError("");
    try {
      const res = await client.rpc(session, "find_match", { mode, boardSize: String(boardSize) });
      let data: Record<string, string>;
      if (typeof res.payload === "string") {
        data = JSON.parse(res.payload);
      } else {
        data = res.payload as Record<string, string>;
      }
      if (data && data.matchId) {
        onMatchFound(data.matchId);
      } else {
        setError("Could not find a match. Try again.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Matchmaking failed";
      setError(msg);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="page lobby-page">
      <div className="card">
        <div style={{ fontSize: "2.5rem", marginBottom: "0.3rem" }}>🎮</div>
        <h2>Ready to Play?</h2>
        <p className="welcome">Welcome back, {displayName}</p>

        <p className="hint" style={{ marginBottom: "0.5rem", marginTop: 0 }}>Board</p>
        <div className="board-size-select">
          <button
            className={boardSize === 3 ? "active" : ""}
            onClick={() => { playClick(); setBoardSize(3); }}
          >
            3×3 Classic
          </button>
          <button
            className={boardSize === 5 ? "active" : ""}
            onClick={() => { playClick(); setBoardSize(5); }}
          >
            5×5 Advanced
          </button>
        </div>
        {boardSize === 5 && (
          <p className="hint" style={{ marginTop: "-0.8rem", marginBottom: "1rem", fontSize: "0.8rem" }}>
            Get 4 in a row to win!
          </p>
        )}

        {isOnline && (
          <>
            <p className="hint" style={{ marginBottom: "0.5rem", marginTop: 0 }}>Mode</p>
            <div className="mode-select">
              <button
                className={mode === "classic" ? "active" : ""}
                onClick={() => { playClick(); setMode("classic"); }}
              >
                ♟ Classic
              </button>
              <button
                className={mode === "timed" ? "active" : ""}
                onClick={() => { playClick(); setMode("timed"); }}
              >
                ⏱ Timed (30s)
              </button>
            </div>

            <button className="find-btn" onClick={findMatch} disabled={searching}>
              {searching ? "🔍 Searching..." : "⚡ Play Online"}
            </button>

            {searching && (
              <div style={{ marginTop: "1rem" }}>
                <div className="spinner" />
                <p className="hint">Looking for an opponent...</p>
              </div>
            )}

            <div style={{ margin: "0.8rem 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>or</div>
          </>
        )}

        <button
          className="find-btn"
          style={{ background: "linear-gradient(135deg, #16a34a, #059669)", boxShadow: "0 4px 20px rgba(22,163,74,0.3)" }}
          onClick={() => { playClick(); onPlayBot(boardSize); }}
        >
          🤖 Play vs Bot
        </button>

        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
