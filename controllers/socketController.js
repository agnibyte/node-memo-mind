let allMatchesObj = {};

function getActiveMatchEntry(isScoreBoard = false) {
  const result = Object.entries(allMatchesObj).find(([_, match]) =>
    isScoreBoard
      ? match.status === "active" || match.status === "started"
      : match.status === "active"
  );
  return result;
}

function initMatchIfNeeded(matchId, status, matchTime) {
  if (!allMatchesObj[matchId]) {
    allMatchesObj[matchId] = {
      total: { red: 0, blue: 0 },
      referees: {},
      finished: false,
      status,
      matchId,
      matchTime,
    };
  }
}

function initRefereeIfNeeded(matchId, refereeId) {
  if (!allMatchesObj[matchId].referees[refereeId]) {
    allMatchesObj[matchId].referees[refereeId] = { red: 0, blue: 0 };
  }
}

function calculateTotalScores(referees) {
  return {
    red: Object.values(referees).reduce((sum, ref) => sum + ref.red, 0),
    blue: Object.values(referees).reduce((sum, ref) => sum + ref.blue, 0),
  };
}

module.exports = function (redBlueNamespace) {
  redBlueNamespace.on("connection", (socket) => {
    socket.onAny((eventName, ...args) => {
      console.log(`✅✅ Event received: ${eventName}`, args);
    });

    socket.on("joinMatch", ({ matchId, refereeId, status, matchTime }) => {
      console.log("in join ", matchId, refereeId);
      socket.join(matchId);
      const response = { status: false };

      const activeMatchEntry = getActiveMatchEntry();
      console.log("activeMatchEntry", activeMatchEntry);
      if (activeMatchEntry) {
        const [activeMatchId] = activeMatchEntry;
        response.message = "Please finish the active matches";
        response.activeMatchId = activeMatchId;
        socket.emit("allMatches", response);
        return;
      }

      initMatchIfNeeded(matchId, status, matchTime);
      initRefereeIfNeeded(matchId, refereeId);

      response.status = true;
      response.message = `Referee ${refereeId} joined Match ${matchId}`;
      response.activeMatchId = matchId;
      socket.emit("allMatches", response);
    });

    socket.on("joinMatchScoreBoard", ({ refereeId }) => {
      const activeMatchEntry = getActiveMatchEntry(true);
      if (activeMatchEntry) {
        const [matchId, match] = activeMatchEntry;
        socket.join(matchId);
        // socket.emit("updateScore", match);
        socket.emit("joinMatchScoreBoardScore", match);
      } else {
        socket.emit("updateScore", null);
      }
    });

    socket.on("updateScore", ({ matchId, refereeId, player, value }) => {
      const match = allMatchesObj[matchId];
      if (!match || match?.finished) {
        // status: false,
        // message: "Match not found or already finished",

        redBlueNamespace.to(matchId).emit("updateScore", false);
        return;
      }

      initRefereeIfNeeded(matchId, refereeId);

      match.referees[refereeId][player] += value;
      match.total = calculateTotalScores(match.referees);

      redBlueNamespace.to(matchId).emit("updateScore", match);
    });

    socket.on("startMatch", ({ matchId, refereeId }) => {
      const match = allMatchesObj[matchId];
      if (!match || match.finished) return;

      match.status = "started";
      // redBlueNamespace.to(matchId).emit("updateScore", match);
    });
    socket.on("resetMatch", ({ matchId, refereeId }) => {
      // const match = allMatchesObj[matchId];
      // if (!match || match.finished) return;
      console.log("allMatchesObj", allMatchesObj);

      delete allMatchesObj[matchId];
      console.log("allMatchesObj", allMatchesObj);

      // redBlueNamespace.to(matchId).emit("updateScore", match);
    });

    socket.on("finishMatch", ({ matchId }) => {
      const match = allMatchesObj[matchId];
      if (!match || match.finished) return;

      match.finished = true;
      match.status = "finished";
      redBlueNamespace.to(matchId).emit("updateScore", match);

      // redBlueNamespace.to(matchId).emit("matchFinished", {
      //   message: `Match ${matchId} has finished.`,
      //   finalScore: match.total,
      //   matchStatus: true,
      // });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
