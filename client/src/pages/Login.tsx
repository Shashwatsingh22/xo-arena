import { useState } from "react";
import { authenticateDevice, connectSocket } from "../lib/nakama";
import { Session } from "@heroiclabs/nakama-js";

interface Props {
  onLogin: (session: Session) => void;
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim();
    if (!name || name.length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const session = await authenticateDevice(name);
      await connectSocket(session);
      onLogin(session);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page login-page">
      <div className="card">
        <h2>Who are you?</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nickname"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            autoFocus
            aria-label="Enter your nickname"
          />
          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Connecting..." : "Enter Arena"}
          </button>
        </form>
      </div>
    </div>
  );
}
