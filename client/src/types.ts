export const OpCode = {
  MOVE: 1,
  STATE_UPDATE: 2,
  GAME_OVER: 3,
  REJECTED: 4,
} as const;

export interface StateUpdate {
  board: number[];
  currentTurn: string;
  turnDeadline: number | null;
}

export interface GameOver {
  winner: string | null;
  board: number[];
  reason: "win" | "draw" | "forfeit" | "timeout" | "disconnect";
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  totalGames: number;
}

export interface LeaderboardRecord {
  userId: string;
  username: string;
  score: number;
  subscore: number;
  rank: number;
}
