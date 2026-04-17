import { useState } from "react";
import { Session } from "@heroiclabs/nakama-js";
import Login from "./pages/Login";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Leaderboard from "./pages/Leaderboard";

type Page = "login" | "lobby" | "game" | "leaderboard";

export default function App() {
  const [page, setPage] = useState<Page>("login");
  const [session, setSession] = useState<Session | null>(null);
  const [matchId, setMatchId] = useState("");

  const handleLogin = (s: Session) => {
    setSession(s);
    setPage("lobby");
  };

  const handleMatchFound = (id: string) => {
    setMatchId(id);
    setPage("game");
  };

  const handleBackToLobby = () => {
    setMatchId("");
    setPage("lobby");
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={() => session && setPage("lobby")} style={{ cursor: "pointer" }}>
          ✕○ Arena
        </h1>
        {session && (
          <nav>
            <button
              className={page === "lobby" ? "active" : ""}
              onClick={() => setPage("lobby")}
            >
              Play
            </button>
            <button
              className={page === "leaderboard" ? "active" : ""}
              onClick={() => setPage("leaderboard")}
            >
              Leaderboard
            </button>
          </nav>
        )}
      </header>
      <main>
        {page === "login" && <Login onLogin={handleLogin} />}
        {page === "lobby" && session && (
          <Lobby session={session} onMatchFound={handleMatchFound} />
        )}
        {page === "game" && session && matchId && (
          <Game session={session} matchId={matchId} onBack={handleBackToLobby} />
        )}
        {page === "leaderboard" && session && (
          <Leaderboard session={session} />
        )}
      </main>
    </div>
  );
}
