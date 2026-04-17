function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
) {
  logger.info("XO Arena server module loaded.");

  // Register match handler
  initializer.registerMatch("xo_arena", {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchSignal: matchSignal,
    matchTerminate: matchTerminate,
  });

  // Create leaderboard
  try {
    nk.leaderboardCreate(
      LEADERBOARD_ID,
      false,
      nkruntime.SortOrder.DESCENDING,
      nkruntime.Operator.SET
    );
    logger.info("Leaderboard created/verified.");
  } catch (e) {
    logger.error("Failed to create leaderboard: %s", e);
  }

  // RPC: Find or create a match
  initializer.registerRpc("find_match", rpcFindMatch);

  // RPC: Get player stats
  initializer.registerRpc("get_player_stats", rpcGetPlayerStats);

  // RPC: Get leaderboard
  initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);

  logger.info("XO Arena RPCs registered.");
}

var rpcFindMatch: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  var mode = "classic";
  var boardSize = "3";
  if (payload) {
    try {
      var data = JSON.parse(payload);
      if (data.mode === "timed") mode = "timed";
      if (data.boardSize === "5" || data.boardSize === 5) boardSize = "5";
    } catch (e) {}
  }

  // Search for open matches with same mode and board size
  var matches: nkruntime.Match[] = [];
  try {
    var result = nk.matchList(10, true, "", 0, MAX_PLAYERS - 1, "");
    matches = result || [];
  } catch (e) {
    logger.error("Match list error: %s", e);
  }

  for (var i = 0; i < matches.length; i++) {
    var match = matches[i];
    try {
      var labelData = JSON.parse(match.label || "{}");
      if (labelData.open === true && labelData.mode === mode &&
          String(labelData.boardSize || 3) === boardSize) {
        logger.info("Found open match: %s", match.matchId);
        return JSON.stringify({ matchId: match.matchId });
      }
    } catch (e) {}
  }

  var matchId = nk.matchCreate("xo_arena", { mode: mode, boardSize: boardSize });
  logger.info("Created new match: %s (mode=%s, board=%s)", matchId, mode, boardSize);
  return JSON.stringify({ matchId: matchId });
};

var rpcGetPlayerStats: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  var targetUserId = ctx.userId;
  if (payload) {
    try {
      var data = JSON.parse(payload);
      if (data.userId) targetUserId = data.userId;
    } catch (e) {}
  }

  if (!targetUserId) {
    throw Error("No user ID provided");
  }

  try {
    var objects = nk.storageRead([
      { collection: "player_stats", key: "stats", userId: targetUserId },
    ]);
    if (objects.length > 0 && objects[0].value) {
      return JSON.stringify(objects[0].value);
    }
  } catch (e) {
    logger.error("Failed to read player stats: %s", e);
  }

  return JSON.stringify({
    wins: 0, losses: 0, draws: 0,
    currentStreak: 0, bestStreak: 0, totalGames: 0,
  });
};

var rpcGetLeaderboard: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  var limit = 20;
  if (payload) {
    try {
      var data = JSON.parse(payload);
      if (data.limit) limit = Math.min(data.limit, 100);
    } catch (e) {}
  }

  try {
    var result = nk.leaderboardRecordsList(LEADERBOARD_ID, [], limit);
    var records = (result.records || []).map(function (r: nkruntime.LeaderboardRecord) {
      return {
        userId: r.ownerId,
        username: r.username,
        score: r.score,
        subscore: r.subscore,
        rank: r.rank,
      };
    });
    return JSON.stringify({ records: records });
  } catch (e) {
    logger.error("Failed to get leaderboard: %s", e);
    return JSON.stringify({ records: [] });
  }
};
