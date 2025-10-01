const { response } = require("express");

let allMatchesObj = {};

function getActiveMatchEntry(isScoreBoard = false) {
  const result = Object.entries(allMatchesObj).find(([_, match]) =>
    isScoreBoard
      ? match.status === "active" ||
        match.status === "started" ||
        match.status === "start"
      : match.status === "active"
  );
  return result;
}

function initMatchIfNeeded(matchId, status, matchTime, player = {}) {
  if (!allMatchesObj[matchId]) {
    allMatchesObj[matchId] = {
      total: { red: 0, blue: 0 },
      referees: {},
      finished: false,
      status,
      matchId,
      matchTime,
      player,
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
    console.log("✅ New client connected:", socket.id);

    socket.onAny((eventName, ...args) => {
      console.log(`📩 Event received: ${eventName}`, args);
    });

    // Add match from Page 1
    socket.on(
      "addMatchToQueue",
      ({ matchId, refereeId, status, matchTime, player = {} }) => {
        console.log("🆕 Add match request:", matchId, refereeId);
        socket.join(matchId);
        let response = { status: false };

        const activeMatchEntry = getActiveMatchEntry();
        if (activeMatchEntry) {
          const [activeMatchId] = activeMatchEntry;
          response.message = "⚠️ Please finish the active match first";
          response.matchId = activeMatchId;
          socket.emit("allMatches", response);
          return;
        }

        // Init and save
        initMatchIfNeeded(matchId, status, matchTime, player);
        initRefereeIfNeeded(matchId, refereeId);

        response = { status: true, ...allMatchesObj[matchId] };
        console.log("🎯 Active Match Set:", response);

        // 🔥 Broadcast to EVERYONE (queue + scoreboard pages)
        redBlueNamespace.emit("joinMatchScoreBoardScore", response);
      }
    );

    // Scoreboard connects (no matchId needed)
    socket.on("joinMatchScoreBoard", () => {
      const activeMatchEntry = getActiveMatchEntry(true);
      if (activeMatchEntry) {
        const [matchId, match] = activeMatchEntry;
        socket.join(matchId);
        console.log("📊 Scoreboard joined, sending match:", match);
        socket.emit("joinMatchScoreBoardScore", match);
      } else {
        socket.emit("joinMatchScoreBoardScore", {
          status: false,
          message: "No active match",
        });
      }
    });

    // Update score
    socket.on("updateScore", ({ matchId, refereeId, player, value }) => {
      const match = allMatchesObj[matchId];
      if (!match || match?.finished) {
        redBlueNamespace.to(matchId).emit("updateScore", false);
        return;
      }

      initRefereeIfNeeded(matchId, refereeId);
      match.referees[refereeId][player] += value;
      match.total = calculateTotalScores(match.referees);

      redBlueNamespace.emit("updateScore", match);
      // redBlueNamespace.to(matchId).emit("updateScore", match);
    });

    // Start match
    socket.on("startMatch", ({ matchId }) => {
      const match = allMatchesObj[matchId];
      if (!match || match.finished) return;
      match.status = "start";
      console.log("▶️ Starting match:", matchId, match);
      // redBlueNamespace.to(matchId).emit("updateScore", match);
      redBlueNamespace.emit("updateScore", match);
    });

    socket.on("pauseMatch", ({ matchId }) => {
      const match = allMatchesObj[matchId];
      if (!match || match.finished) return;
      match.status = "paused";
      // console.log(" ⏸️ Pausing match:", matchId, match);
      // redBlueNamespace.to(matchId).emit("updateScore", match);
      redBlueNamespace.emit("updateScore", match);
    });

    // Reset (remove match completely)
    socket.on("resetMatch", ({ matchId }) => {
      console.log("♻️ Resetting match:", matchId);
      delete allMatchesObj[matchId];
      const response = { status: "reset", matchId, message: "Match reset" };
      redBlueNamespace.emit("joinMatchScoreBoardScore", response);
    });

    // Finish match
    socket.on("finishMatch", ({ matchId }) => {
      const match = allMatchesObj[matchId];
      if (!match || match.finished) return;

      match.finished = true;
      match.status = "finished";
      redBlueNamespace.to(matchId).emit("updateScore", match);

      // clear active
      redBlueNamespace.emit("joinMatchScoreBoardScore", {
        status: false,
        message: "No active match",
      });
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
};
