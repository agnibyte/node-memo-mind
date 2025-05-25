let allMatchesObj = {};

function getActiveMatchEntry() {
  return Object.entries(allMatchesObj).find(([_, match]) => match.status === "active");
}

function initMatchIfNeeded(matchId, status) {
  if (!allMatchesObj[matchId]) {
    allMatchesObj[matchId] = {
      total: { red: 0, blue: 0 },
      referees: {},
      finished: false,
      status,
      matchId,
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

module.exports = function (io) {
  io.on("connection", (socket) => {
    socket.onAny((eventName, ...args) => {
      console.log(`✅✅ Event received: ${eventName}`, args);
    });

    socket.on("joinMatch", ({ matchId, refereeId, status }) => {
      socket.join(matchId);
      const response = { status: false };

      const activeMatchEntry = getActiveMatchEntry();
      if (activeMatchEntry) {
        const [activeMatchId] = activeMatchEntry;
        response.message = "Please finish the active matches";
        response.activeMatchId = activeMatchId;
        socket.emit("allMatches", response);
        return;
      }

      initMatchIfNeeded(matchId, status);
      initRefereeIfNeeded(matchId, refereeId);

      response.status = true;
      response.message = `Referee ${refereeId} joined Match ${matchId}`;
      response.activeMatchId = matchId;
      socket.emit("allMatches", response);
    });

    socket.on("joinMatchScoreBoard", ({ refereeId }) => {
      const activeMatchEntry = getActiveMatchEntry();
      if (activeMatchEntry) {
        const [matchId, match] = activeMatchEntry;
        socket.join(matchId);
        socket.emit("updateScore", match);
      } else {
        socket.emit("updateScore", null);
      }
    });

    socket.on("updateScore", ({ matchId, refereeId, player, value }) => {
      const match = allMatchesObj[matchId];
      if (!match || match.finished) return;

      initRefereeIfNeeded(matchId, refereeId);

      match.referees[refereeId][player] += value;
      match.total = calculateTotalScores(match.referees);

      io.to(matchId).emit("updateScore", match);
    });

    socket.on("finishMatch", ({ matchId }) => {
      const match = allMatchesObj[matchId];
      if (!match || match.finished) return;

      match.finished = true;
      match.status = "finished";

      io.to(matchId).emit("matchFinished", {
        message: `Match ${matchId} has finished.`,
        finalScore: match.total,
        matchStatus: true,
      });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
