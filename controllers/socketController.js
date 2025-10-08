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

        // Init and save match + referee
        initMatchIfNeeded(matchId, status, matchTime, player);
        initRefereeIfNeeded(matchId, refereeId);

        response = { status: true, ...allMatchesObj[matchId] };
        console.log("🎯 Match Set:", response);

        // ✅ Notify everyone in this match room only
        redBlueNamespace.emit("joinMatchScoreBoardScore", response);
      }
    );

    // Scoreboard connects (client may or may not pass matchId)
    socket.on("joinMatchScoreBoard", ({ matchId = "" } = {}) => {
      let match;

      if (matchId) {
        match = allMatchesObj[matchId];
      } else {
        const activeMatchEntry = getActiveMatchEntry(true);
        if (activeMatchEntry) {
          const [id, m] = activeMatchEntry;
          matchId = id;
          match = m;
        }
      }

      if (match) {
        socket.join(matchId);
        console.log("📊 Scoreboard joined match:", matchId);
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

      // ✅ Send only to this match room
      redBlueNamespace.to(matchId).emit("updateScore", match);
    });

    // Start match
    socket.on("startMatch", ({ matchId }) => {
      const match = allMatchesObj[matchId];
      if (!match || match.finished) return;

      match.status = "start";
      console.log("▶️ Starting match:", matchId);

      redBlueNamespace.to(matchId).emit("updateScore", match);
    });

    // Pause match
    socket.on("pauseMatch", ({ matchId }) => {
      const match = allMatchesObj[matchId];
      if (!match || match.finished) return;

      match.status = "paused";
      console.log("⏸️ Pausing match:", matchId);

      redBlueNamespace.to(matchId).emit("updateScore", match);
    });

    // Reset match
    socket.on("resetMatch", ({ matchId }) => {
      console.log("♻️ Resetting match:", matchId);
      delete allMatchesObj[matchId];
      const response = { status: "reset", matchId, message: "Match reset" };

      // ✅ Notify only that match room
      redBlueNamespace.to(matchId).emit("joinMatchScoreBoardScore", response);
    });

    // Finish match
    socket.on("finishMatch", ({ matchId }) => {
      const match = allMatchesObj[matchId];
      if (!match || match.finished) return;

      match.finished = true;
      match.status = "finished";

      redBlueNamespace.to(matchId).emit("updateScore", match);
      redBlueNamespace.to(matchId).emit("joinMatchScoreBoardScore", {
        status: false,
        message: "Match finished",
      });
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
};
