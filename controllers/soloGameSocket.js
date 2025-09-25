// controllers/soloGameSocket.js

let soloMatches = {};

/**
 * Ensure solo match object exists
 */
function initSoloMatchIfNeeded(matchId, status, matchTime, name, state) {
  if (!soloMatches[matchId]) {
    soloMatches[matchId] = {
      totalScore: 0,
      referees: {}, // { refereeId: score }
      finished: false,
      status,
      matchId,
      matchTime,
      name,
      state,
    };
  }
}

/**
 * Ensure referee entry exists inside solo match
 */
function initSoloRefereeIfNeeded(matchId, refereeId) {
  if (!soloMatches[matchId].referees[refereeId]) {
    soloMatches[matchId].referees[refereeId] = 0;
  }
}

/**
 * Calculate total score from all referees
 */
function calculateSoloTotalScore(referees) {
  return Object.values(referees).reduce((sum, score) => sum + score, 0);
}

/**
 * Get active solo match
 */
function getActiveSoloMatch(isScoreBoard = false) {
  const result = Object.entries(soloMatches).find(([_, match]) =>
    isScoreBoard
      ? match.status === "active" || match.status === "started"
      : match.status === "active"
  );
  return result;
}

module.exports = function (soloNamespace) {
  soloNamespace.on("connection", (socket) => {
    socket.onAny((eventName, ...args) => {
      console.log(`🎯 Solo Event received: ${eventName}`, args);
    });

    /**
     * Referee joins a solo match
     */
    socket.on(
      "addMatchToQueue",
      ({ matchId, refereeId, status, matchTime, name, state }) => {
        socket.join(matchId);
        const response = { status: false };

        const activeMatchEntry = getActiveSoloMatch();
        if (activeMatchEntry) {
          const [activeMatchId] = activeMatchEntry;
          response.message = "Please finish the active solo match first.";
          response.activeMatchId = activeMatchId;
          socket.emit("soloMatchUpdate", response);
          return;
        }

        initSoloMatchIfNeeded(matchId, status, matchTime, name, state);
        initSoloRefereeIfNeeded(matchId, refereeId);

        response.status = true;
        response.message = `Referee ${refereeId} joined Solo Match ${matchId}`;
        response.activeMatchId = matchId;
        socket.emit("soloMatchUpdate", response);
      }
    );

    /**
     * Scoreboard joins solo match
     */
    socket.on("joinSoloMatchScoreBoard", () => {
      const activeMatchEntry = getActiveSoloMatch(true);
      if (activeMatchEntry) {
        const [matchId, match] = activeMatchEntry;
        socket.join(matchId);
        console.log("soloMatchScoreBoardUpdate", match);
        socket.emit("soloMatchScoreBoardUpdate", match);
      } else {
        socket.emit("soloMatchScoreBoardUpdate", null);
      }
    });

    /**
     * Referee gives score to the solo player
     */
    socket.on("updateSoloScore", ({ matchId, refereeId, value }) => {
      console.log("soloMatches", soloMatches);
      const match = soloMatches[matchId];
      console.log("match", match);
      if (!match) {
        soloNamespace.to(matchId).emit("soloMatchScoreUpdate", false);
        return;
      }

      initSoloRefereeIfNeeded(matchId, refereeId);

      match.referees[refereeId] += parseInt(value);
      match.totalScore = calculateSoloTotalScore(match.referees);

      console.log("match", match);
      soloNamespace.to(matchId).emit("soloMatchScoreUpdate", match);
    });

    /**
     * Start solo match
     */
    socket.on("startSoloMatch", ({ matchId }) => {
      const match = soloMatches[matchId];
      if (!match || match.finished) return;

      match.status = "started";
      soloNamespace.to(matchId).emit("soloMatchStarted", match);
    });

    /**
     * Reset solo match (remove from memory)
     */
    socket.on("resetSoloMatch", ({ matchId }) => {
      console.log("Before reset:", soloMatches);
      delete soloMatches[matchId];
      console.log("After reset:", soloMatches);
    });

    /**
     * Finish solo match
     */
    socket.on("finishSoloMatch", ({ matchId }) => {
      const match = soloMatches[matchId];
      if (!match || match.finished) return;

      match.finished = true;
      match.status = "finished";
      soloNamespace.to(matchId).emit("soloMatchFinished", match);
    });

    /**
     * Disconnect
     */
    socket.on("disconnect", () => {
      console.log("Solo client disconnected:", socket.id);
    });
  });
};
