// Dynamic win checker for any board size
function checkWinner(board: number[], size: number, winLen: number): number {
  // Check all lines: rows, cols, diagonals
  for (var r = 0; r < size; r++) {
    for (var c = 0; c < size; c++) {
      var idx = r * size + c;
      if (board[idx] === Mark.EMPTY) continue;
      var mark = board[idx];

      // Check 4 directions: right, down, down-right, down-left
      var dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (var d = 0; d < dirs.length; d++) {
        var dr = dirs[d][0], dc = dirs[d][1];
        var endR = r + dr * (winLen - 1);
        var endC = c + dc * (winLen - 1);
        if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;

        var won = true;
        for (var step = 1; step < winLen; step++) {
          if (board[(r + dr * step) * size + (c + dc * step)] !== mark) {
            won = false;
            break;
          }
        }
        if (won) return mark;
      }
    }
  }
  return Mark.EMPTY;
}

function broadcastState(dispatcher: nkruntime.MatchDispatcher, state: MatchState) {
  var msg = JSON.stringify({
    board: state.board,
    currentTurn: state.currentTurn,
    turnDeadline: state.turnDeadline,
    boardSize: state.boardSize,
    winLength: state.winLength,
  });
  dispatcher.broadcastMessage(OpCode.STATE_UPDATE, msg);
}

function broadcastGameOver(
  dispatcher: nkruntime.MatchDispatcher,
  state: MatchState,
  reason: string
) {
  dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({
    winner: state.winner,
    board: state.board,
    reason: reason,
  }));
}

function updateLeaderboard(
  ctx: nkruntime.Context, logger: nkruntime.Logger,
  nk: nkruntime.Nakama, state: MatchState
) {
  var playerIds = Object.keys(state.players);
  for (var i = 0; i < playerIds.length; i++) {
    var uid = playerIds[i];
    var isWinner = state.winner === uid;
    var isDraw = state.winner === null;
    var stats = { wins: 0, losses: 0, draws: 0, currentStreak: 0, bestStreak: 0, totalGames: 0 };
    try {
      var objects = nk.storageRead([{ collection: "player_stats", key: "stats", userId: uid }]);
      if (objects.length > 0 && objects[0].value) stats = objects[0].value as typeof stats;
    } catch (e) { logger.warn("Could not read stats for %s: %s", uid, e); }

    stats.totalGames++;
    if (isDraw) { stats.draws++; stats.currentStreak = 0; }
    else if (isWinner) {
      stats.wins++; stats.currentStreak++;
      if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
    } else { stats.losses++; stats.currentStreak = 0; }

    try {
      nk.storageWrite([{ collection: "player_stats", key: "stats", userId: uid,
        value: stats, permissionRead: 2, permissionWrite: 0 }]);
    } catch (e) { logger.error("Could not write stats for %s: %s", uid, e); }
    try {
      nk.leaderboardRecordWrite(LEADERBOARD_ID, uid, state.players[uid].username, stats.wins * 100, stats.bestStreak);
    } catch (e) { logger.error("Could not update leaderboard for %s: %s", uid, e); }
  }
}

var matchInit: nkruntime.MatchInitFunction = function (
  ctx: nkruntime.Context, logger: nkruntime.Logger,
  nk: nkruntime.Nakama, params: { [key: string]: string }
) {
  var mode = params.mode === "timed" ? "timed" : "classic";
  var boardSize = params.boardSize === "5" ? 5 : 3;
  var winLength = boardSize === 5 ? 4 : 3;
  var totalCells = boardSize * boardSize;
  var board: number[] = [];
  for (var i = 0; i < totalCells; i++) board.push(0);

  var state: MatchState = {
    board: board, boardSize: boardSize, winLength: winLength,
    players: {}, marks: {}, currentTurn: "", mode: mode,
    turnDeadline: null, turnDuration: mode === "timed" ? TURN_DURATION_TIMED : 0,
    winner: null, gameOver: false, moveCount: 0,
  };

  var label = JSON.stringify({ mode: mode, boardSize: boardSize, open: true, players: 0 });
  logger.info("Match created. Mode: %s, Board: %dx%d, Win: %d-in-a-row", mode, boardSize, boardSize, winLength);
  return { state: state, tickRate: TICK_RATE, label: label };
};

var matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = function (
  ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher, tick: number,
  state: nkruntime.MatchState, presence: nkruntime.Presence,
  metadata: { [key: string]: string }
) {
  var s = state as MatchState;
  if (s.gameOver) return { state: s, accept: false, rejectMessage: "Match is over" };
  if (Object.keys(s.players).length >= MAX_PLAYERS) return { state: s, accept: false, rejectMessage: "Match is full" };
  return { state: s, accept: true };
};

var matchJoin: nkruntime.MatchJoinFunction = function (
  ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher, tick: number,
  state: nkruntime.MatchState, presences: nkruntime.Presence[]
) {
  var s = state as MatchState;
  for (var i = 0; i < presences.length; i++) {
    var presence = presences[i];
    var uid = presence.userId;
    if (s.players[uid]) { logger.info("Player %s re-joined", presence.username); continue; }
    var playerCount = Object.keys(s.players).length;
    var mark = playerCount === 0 ? Mark.X : Mark.O;
    s.players[uid] = { userId: uid, username: presence.username, mark: mark };
    s.marks[uid] = mark;
    logger.info("Player %s joined as %s", presence.username, mark === Mark.X ? "X" : "O");
    if (mark === Mark.X) s.currentTurn = uid;
  }
  var totalPlayers = Object.keys(s.players).length;
  var label = JSON.stringify({ mode: s.mode, boardSize: s.boardSize, open: totalPlayers < MAX_PLAYERS, players: totalPlayers });
  dispatcher.matchLabelUpdate(label);
  if (totalPlayers === MAX_PLAYERS) {
    logger.info("Both players in! Broadcasting state.");
    if (s.mode === "timed") s.turnDeadline = Date.now() + s.turnDuration * 1000;
    broadcastState(dispatcher, s);
  }
  return { state: s };
};

var matchLeave: nkruntime.MatchLeaveFunction = function (
  ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher, tick: number,
  state: nkruntime.MatchState, presences: nkruntime.Presence[]
) {
  var s = state as MatchState;
  for (var i = 0; i < presences.length; i++) {
    logger.info("Player %s left", presences[i].username);
    if (s.moveCount > 0 || s.gameOver) {
      delete s.players[presences[i].userId];
      delete s.marks[presences[i].userId];
    }
  }
  var remaining = Object.keys(s.players);
  if (remaining.length === 1 && !s.gameOver && s.moveCount > 0) {
    s.winner = remaining[0]; s.gameOver = true;
    broadcastGameOver(dispatcher, s, "disconnect");
    updateLeaderboard(ctx, logger, nk, s);
  }
  if (s.gameOver && remaining.length === 0) return null;
  return { state: s };
};

var matchLoop: nkruntime.MatchLoopFunction = function (
  ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher, tick: number,
  state: nkruntime.MatchState, messages: nkruntime.MatchMessage[]
) {
  var s = state as MatchState;
  if (s.gameOver) return null;
  if (Object.keys(s.players).length < MAX_PLAYERS) return { state: s };

  // Timeout check
  if (s.mode === "timed" && s.turnDeadline && Date.now() > s.turnDeadline) {
    var others = Object.keys(s.players).filter(function (uid) { return uid !== s.currentTurn; });
    s.winner = others.length > 0 ? others[0] : null;
    s.gameOver = true;
    broadcastGameOver(dispatcher, s, "timeout");
    updateLeaderboard(ctx, logger, nk, s);
    return { state: s };
  }

  var maxCells = s.boardSize * s.boardSize;

  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];
    if (msg.opCode !== OpCode.MOVE) continue;
    var senderId = msg.sender.userId;

    if (senderId !== s.currentTurn) {
      dispatcher.broadcastMessage(OpCode.REJECTED, JSON.stringify({ reason: "Not your turn" }), [msg.sender]);
      continue;
    }

    var moveData: { position: number };
    try { moveData = JSON.parse(nk.binaryToString(msg.data)); }
    catch (e) {
      dispatcher.broadcastMessage(OpCode.REJECTED, JSON.stringify({ reason: "Invalid message" }), [msg.sender]);
      continue;
    }

    if (moveData.position < 0 || moveData.position >= maxCells) {
      dispatcher.broadcastMessage(OpCode.REJECTED, JSON.stringify({ reason: "Invalid position" }), [msg.sender]);
      continue;
    }
    if (s.board[moveData.position] !== Mark.EMPTY) {
      dispatcher.broadcastMessage(OpCode.REJECTED, JSON.stringify({ reason: "Cell occupied" }), [msg.sender]);
      continue;
    }

    s.board[moveData.position] = s.marks[senderId];
    s.moveCount++;

    var winnerMark = checkWinner(s.board, s.boardSize, s.winLength);
    if (winnerMark !== Mark.EMPTY) {
      var uids = Object.keys(s.marks);
      for (var j = 0; j < uids.length; j++) {
        if (s.marks[uids[j]] === winnerMark) { s.winner = uids[j]; break; }
      }
      s.gameOver = true;
      broadcastGameOver(dispatcher, s, "win");
      updateLeaderboard(ctx, logger, nk, s);
      return { state: s };
    }

    if (s.moveCount >= maxCells) {
      s.winner = null; s.gameOver = true;
      broadcastGameOver(dispatcher, s, "draw");
      updateLeaderboard(ctx, logger, nk, s);
      return { state: s };
    }

    // Switch turn
    var allPlayerIds = Object.keys(s.players);
    for (var k = 0; k < allPlayerIds.length; k++) {
      if (allPlayerIds[k] !== senderId) { s.currentTurn = allPlayerIds[k]; break; }
    }
    if (s.mode === "timed") s.turnDeadline = Date.now() + s.turnDuration * 1000;
    broadcastState(dispatcher, s);
  }
  return { state: s };
};

var matchSignal: nkruntime.MatchSignalFunction = function (
  ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher, tick: number,
  state: nkruntime.MatchState, data: string
) { return { state: state, data: "signal received" }; };

var matchTerminate: nkruntime.MatchTerminateFunction = function (
  ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher, tick: number,
  state: nkruntime.MatchState, graceSeconds: number
) { return { state: state }; };
