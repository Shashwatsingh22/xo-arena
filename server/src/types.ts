/** Marks on the board: 0=empty, 1=X, 2=O */
const Mark = {
  EMPTY: 0,
  X: 1,
  O: 2,
} as const;

interface PlayerInfo {
  userId: string;
  username: string;
  mark: number;
}

interface MatchState {
  board: number[];
  boardSize: number;   // 3 or 5
  winLength: number;   // 3 for 3x3, 4 for 5x5
  players: { [userId: string]: PlayerInfo };
  marks: { [userId: string]: number };
  currentTurn: string;
  mode: string; // "classic" | "timed"
  turnDeadline: number | null;
  turnDuration: number;
  winner: string | null;
  gameOver: boolean;
  moveCount: number;
}

/** OpCodes for client-server messages */
const OpCode = {
  MOVE: 1,
  STATE_UPDATE: 2,
  GAME_OVER: 3,
  REJECTED: 4,
} as const;

const TICK_RATE = 5;
const TURN_DURATION_TIMED = 30;
const MAX_PLAYERS = 2;
const LEADERBOARD_ID = "xo_arena_global";
