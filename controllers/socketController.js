let allMatchesObj = {};

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("✅ Socket.IO connected:", socket.id);

    socket.onAny((eventName, ...args) => {
      console.log(`✅✅ Event received: ${eventName}`, args);
    });

    socket.on("joinMatch", ({ matchId, refereeId, status }) => {
      socket.join(matchId);
      const response = { status: false };

      const activeMatchEntry = Object.entries(allMatchesObj).find(
        ([_, match]) => match.status === "active"
      );

      if (activeMatchEntry) {
        const [activeMatchId] = activeMatchEntry;
        response.message = "Please finish the active matches";
        response.activeMatchId = activeMatchId;
        socket.emit("allMatches", response);
        return;
      }

      if (!allMatchesObj[matchId]) {
        allMatchesObj[matchId] = {
          total: { red: 0, blue: 0 },
          referees: {},
          finished: false,
          status,
          matchId,
        };
      }

      if (!allMatchesObj[matchId].referees[refereeId]) {
        allMatchesObj[matchId].referees[refereeId] = { red: 0, blue: 0 };
      }

      response.status = true;
      response.message = `Referee ${refereeId} joined Match ${matchId}`;
      response.activeMatchId = matchId;
      socket.emit("allMatches", response);
    });

    socket.on("joinMatchScoreBoard", ({ refereeId }) => {
      const activeMatchEntry = Object.entries(allMatchesObj).find(
        ([key, match]) => match.status === "active"
      );

      if (activeMatchEntry) {
        const [matchId, match] = activeMatchEntry;

        // Join room after finding active match
        socket.join(matchId);

        // Send active match details back to the client
        socket.emit("updateScore", match);
      } else {
        socket.emit("updateScore", null);
      }
    });

    socket.on("updateScore", ({ matchId, refereeId, player, value }) => {
      const activeMatch = allMatchesObj[matchId];
      if (!activeMatch || activeMatch.finished) return;

      if (!activeMatch.referees[refereeId]) {
        activeMatch.referees[refereeId] = { red: 0, blue: 0 };
      }

      activeMatch.referees[refereeId][player] += value;

      activeMatch.total.red = Object.values(activeMatch.referees).reduce(
        (sum, ref) => sum + ref.red,
        0
      );
      activeMatch.total.blue = Object.values(activeMatch.referees).reduce(
        (sum, ref) => sum + ref.blue,
        0
      );

      io.to(matchId).emit("updateScore", activeMatch);
    });

    socket.on("finishMatch", ({ matchId }) => {
      if (!allMatchesObj[matchId]) return;

      if (allMatchesObj[matchId].finished) return;

      allMatchesObj[matchId].finished = true;
      allMatchesObj[matchId].status = "finished";

      io.to(matchId).emit("matchFinished", {
        message: `Match ${matchId} has finished.`,
        finalScore: allMatchesObj[matchId].total,
        matchStatus: true,
      });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
