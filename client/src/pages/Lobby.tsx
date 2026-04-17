import { useState } from "react";
import { client } from "../lib/nakama";
import { Session } from "@heroiclabs/nakama-js";

interface Props {
  session: Session;
  onMatchFound: (matchId: string) => void;
}

export default function Lobby({ session, onMatchFound }: Props) {
  const [mode, setMode] = useState<"classic" | "timed">("classic");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const findMatch = async () => {
    setSearching(true);
    setError("");
    try {
      const res = await client.rpc(session, "find_match", { mode });
      const data = res.payload as Record<string, string>;
      if (data.matchId) {
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
        <h2>Find a Match</h2>
        <p className="welcome">Welcome, {session.username}!</p>
        <div className="mode-select">
          <button
            className={mode === "classic" ? "active" : ""}
            onClick={() => setMode("classic")}
          >
            ♟ Classic
          </button>
          <button
            className={mode === "timed" ? "active" : ""}
            onClick={() => setMode("timed")}
          >
            ⏱ Timed (30s)
          </button>
        </div>
        <button className="find-btn" onClick={findMatch} disabled={searching}>
          {searching ? "Finding a random player..." : "Play Now"}
        </button>
        {searching && <p className="hint">It usually takes 30 seconds</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
