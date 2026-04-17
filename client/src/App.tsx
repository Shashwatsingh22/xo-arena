import { useState } from "react";
import { Session } from "@heroiclabs/nakama-js";
import Login from "./pages/Login";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";

type Page = "login" | "lobby" | "game";

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
      </header>
      <main>
        {page === "login" && <Login onLogin={handleLogin} />}
        {page === "lobby" && session && (
          <Lobby session={session} onMatchFound={handleMatchFound} />
        )}
        {page === "game" && session && matchId && (
          <Game session={session} matchId={matchId} onBack={handleBackToLobby} />
        )}
      </main>
    </div>
  );
}
