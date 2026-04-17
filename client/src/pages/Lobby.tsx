import { useState } from "react";
import { client } from "../lib/nakama";
import { Session } from "@heroiclabs/nakama-js";
import { playClick } from "../lib/sounds";

interface Props {
  session: Session;
  onMatchFound: (matchId: string) => void;
}

export default function Lobby({ session, onMatchFound }: Props) {
  const [mode, setMode] = useState<"classic" | "timed">("classic");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const findMatch = async () => {
    playClick();
    setSearching(true);
    setError("");
    try {
      const res = await client.rpc(session, "find_match", { mode });
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
        <p className="welcome">Welcome back, {session.username}</p>

        <p className="hint" style={{ marginBottom: "0.5rem", marginTop: 0 }}>Game Mode</p>
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
          {searching ? "🔍 Searching..." : "⚡ Play Now"}
        </button>

        {searching && (
          <div style={{ marginTop: "1rem" }}>
            <div className="spinner" />
            <p className="hint">Looking for an opponent...</p>
          </div>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
