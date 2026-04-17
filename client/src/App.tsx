import { useState } from "react";
import { Session } from "@heroiclabs/nakama-js";
import Login from "./pages/Login";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import BotGame from "./pages/BotGame";
import Leaderboard from "./pages/Leaderboard";
import { resumeAudio } from "./lib/sounds";

type Page = "login" | "lobby" | "game" | "botgame" | "leaderboard";

export default function App() {
  const [page, setPage] = useState<Page>("login");
  const [session, setSession] = useState<Session | null>(null);
  const [matchId, setMatchId] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [botBoardSize, setBotBoardSize] = useState<3 | 5>(3);

  const handleLogin = (s: Session) => {
    resumeAudio();
    setSession(s);
    setPage("lobby");
  };

  const handleMatchFound = (id: string) => {
    setMatchId(id);
    setPage("game");
  };

  const handlePlayBot = (size: 3 | 5) => {
    setBotBoardSize(size);
    setPage("botgame");
  };

  const handleBackToLobby = () => {
    setMatchId("");
    setPage("lobby");
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={() => session && setPage("lobby")} style={{ cursor: "pointer" }}>
          ✕○ ARENA
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
              Rankings
            </button>
            <button
              className="sound-toggle"
              onClick={() => setSoundOn(!soundOn)}
              aria-label={soundOn ? "Mute sounds" : "Unmute sounds"}
            >
              {soundOn ? "🔊" : "🔇"}
            </button>
          </nav>
        )}
      </header>
      <main>
        {page === "login" && <Login onLogin={handleLogin} />}
        {page === "lobby" && session && (
          <Lobby session={session} onMatchFound={handleMatchFound} onPlayBot={handlePlayBot} />
        )}
        {page === "game" && session && matchId && (
          <Game session={session} matchId={matchId} onBack={handleBackToLobby} soundOn={soundOn} />
        )}
        {page === "botgame" && (
          <BotGame boardSize={botBoardSize} onBack={handleBackToLobby} soundOn={soundOn} />
        )}
        {page === "leaderboard" && session && (
          <Leaderboard session={session} />
        )}
      </main>
    </div>
  );
}
