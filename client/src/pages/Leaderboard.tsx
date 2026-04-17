import { useEffect, useState } from "react";
import { client } from "../lib/nakama";
import { Session } from "@heroiclabs/nakama-js";
import { LeaderboardRecord, PlayerStats } from "../types";

interface Props {
  session: Session;
}

export default function Leaderboard({ session }: Props) {
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [myStats, setMyStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lbRes, statsRes] = await Promise.all([
          client.rpc(session, "get_leaderboard", { limit: 20 }),
          client.rpc(session, "get_player_stats", {}),
        ]);
        const lb = lbRes.payload as { records?: LeaderboardRecord[] };
        setRecords(lb.records || []);
        setMyStats(statsRes.payload as unknown as PlayerStats);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [session]);

  if (loading) {
    return (
      <div className="page">
        <div className="waiting">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page leaderboard-page">
      {myStats && (
        <div className="card stats-card">
          <h2>Your Stats</h2>
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-value">{myStats.wins}</span>
              <span className="stat-label">Wins</span>
            </div>
            <div className="stat">
              <span className="stat-value">{myStats.losses}</span>
              <span className="stat-label">Losses</span>
            </div>
            <div className="stat">
              <span className="stat-value">{myStats.draws}</span>
              <span className="stat-label">Draws</span>
            </div>
            <div className="stat">
              <span className="stat-value">{myStats.bestStreak}</span>
              <span className="stat-label">Best Streak</span>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Leaderboard</h2>
        {records.length === 0 ? (
          <p className="hint">No records yet. Play some games!</p>
        ) : (
          <table className="leaderboard-table" role="table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Player</th>
                <th scope="col">Score</th>
                <th scope="col">Streak</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr
                  key={r.userId}
                  className={r.userId === session.user_id ? "highlight" : ""}
                >
                  <td>{r.rank || i + 1}</td>
                  <td>{r.username}</td>
                  <td>{r.score}</td>
                  <td>{r.subscore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
