let allMatchesObj = {};

module.exports = function (io) {
  console.log("Socket.IO initialized");
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
        ([_, match]) => match.status === "active"
      );
      const [activeMatchId, activeMatch] = activeMatchEntry || [0, null];
      if (!activeMatch) return;

      socket.emit("updateScore", activeMatch);
    });

    socket.on("updateScore", ({ matchId, refereeId, player, value }) => {
      const activeMatchEntry = Object.entries(allMatchesObj).find(
        ([_, match]) => match.status === "active"
      );
      const [activeMatchId, activeMatch] = activeMatchEntry || [0, null];
      if (!activeMatch) return;

      if (activeMatch.finished) return;

      if (!["red", "blue"].includes(player)) {
        return io.to(matchId).emit("matchFinished", {
          message: `Match ${matchId} has finished.`,
          finalScore: activeMatch.total,
          matchFinish: true,
        });
      }

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

      socket.emit("updateScore", activeMatch);
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
