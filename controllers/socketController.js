const { response } = require("express");

// This file should not create a server - it's just for namespace handling
// The main server is in /api/socket.js

let allMatchesObj = {};

function getActiveMatchEntry(onlyActive = false) {
  const entries = Object.entries(allMatchesObj);
  if (onlyActive) {
    return entries.find(
      ([id, match]) => !match.finished && match.status === "active"
    );
  }
  return entries.find(([id, match]) => !match.finished);
}
// Helper functions
const initMatchIfNeeded = (matchId, status, matchTime, player) => {
  if (!allMatchesObj[matchId]) {
    allMatchesObj[matchId] = {
      matchId,
      status: status || "active",
      matchTime: matchTime || 1.5, // in minutes
      player: player || {},
      total: { red: 0, blue: 0 },
      referees: {},
      finished: false,
      createdAt: new Date().toISOString(),
      // Timer properties
      timerStarted: false,
      timerPaused: false,
      remainingTime: matchTime * 60, // Convert to seconds
      startTime: null,
      pauseTime: null,
      totalPausedTime: 0,
      timerId: null,
    };
  }
};

const initRefereeIfNeeded = (matchId, refereeId) => {
  if (!allMatchesObj[matchId]) {
    initMatchIfNeeded(matchId);
  }

  if (!allMatchesObj[matchId].referees[refereeId]) {
    allMatchesObj[matchId].referees[refereeId] = { red: 0, blue: 0 };
  }
};

const calculateTotalScores = (referees) => {
  const total = { red: 0, blue: 0 };
  Object.values(referees).forEach((ref) => {
    total.red += ref.red || 0;
    total.blue += ref.blue || 0;
  });
  return total;
};
// export const setupRedBlueFightNamespace = (io) => {
// const redBlueNamespace = io.of("/red-blue-fight");

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

      // startMatchTimer(matchId, redBlueNamespace);

      // Broadcast match started with timer info
      redBlueNamespace.to(matchId).emit("updateScore", match);
    });

    // Pause match
    socket.on("pauseMatch", ({ matchId }) => {
      const match = allMatchesObj[matchId];
      if (!match || match.finished) return;

      match.status = "paused";
      console.log("⏸️ Pausing match:", matchId);

      // Pause the timer
      // pauseMatchTimer(matchId);

      // Broadcast match paused with timer info
      redBlueNamespace.to(matchId).emit("updateScore", match);
    });

    // Resume match
    socket.on("resumeMatch", ({ matchId }) => {
      const match = allMatchesObj[matchId];
      if (!match || match.finished) return;

      match.status = "start";
      console.log("▶️ Resuming match:", matchId);

      // Resume the timer
      // resumeMatchTimer(matchId, redBlueNamespace);

      // Broadcast match resumed with timer info
      redBlueNamespace.to(matchId).emit("updateScore", match);
    });

    // Reset match
    socket.on("resetMatch", ({ matchId }) => {
      console.log("♻️ Resetting match:", matchId);

      // Stop the timer
      // stopMatchTimer(matchId);

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

      // Stop the timer
      // stopMatchTimer(matchId);

      redBlueNamespace.to(matchId).emit("updateScore", match);
      // redBlueNamespace.to(matchId).emit("joinMatchScoreBoardScore", {
      //   status: "finished",
      //   message: "Match finished",
      // });
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
};

// // Timer management functions
// const startMatchTimer = (matchId, redBlueNamespace) => {
//   const match = allMatchesObj[matchId];
//   if (!match || match.finished) return;

//   // Clear existing timer if any
//   if (match.timerId) {
//     clearInterval(match.timerId);
//     match.timerId = null;
//   }

//   match.timerStarted = true;
//   match.timerPaused = false;
//   match.startTime = Date.now();
//   match.totalPausedTime = 0;

//   console.log(
//     `⏰ Starting timer for match ${matchId}, duration: ${match.matchTime} minutes`
//   );

//   // Update timer every second
//   match.timerId = setInterval(() => {
//     const match = allMatchesObj[matchId];
//     if (!match || match.finished || match.timerPaused) return;

//     const now = Date.now();
//     const elapsed = (now - match.startTime - match.totalPausedTime) / 1000;
//     match.remainingTime = Math.max(0, match.matchTime * 60 - elapsed);

//     // Broadcast timer update to all clients in this match
//     redBlueNamespace.to(matchId).emit("timerUpdate", {
//       matchId,
//       remainingTime: match.remainingTime,
//       status: match.status,
//       isRunning: !match.timerPaused && !match.finished,
//     });

//     // Check if timer has reached zero
//     if (match.remainingTime <= 0) {
//       console.log(`⏰ Timer finished for match ${matchId}`);
//       match.finished = true;
//       match.status = "finished";
//       if (match.timerId) {
//         clearInterval(match.timerId);
//         match.timerId = null;
//       }

//       // Broadcast match finished
//       redBlueNamespace.to(matchId).emit("matchFinished", {
//         matchId,
//         finalScore: match.total,
//         message: "Match time completed",
//       });
//     }
//   }, 1000);
// };

// const pauseMatchTimer = (matchId) => {
//   const match = allMatchesObj[matchId];
//   if (!match || !match.timerStarted || match.timerPaused || match.finished)
//     return;

//   match.timerPaused = true;
//   match.pauseTime = Date.now();

//   if (match.timerId) {
//     clearInterval(match.timerId);
//     match.timerId = null;
//   }

//   console.log(`⏸️ Timer paused for match ${matchId}`);
// };

// const resumeMatchTimer = (matchId, redBlueNamespace) => {
//   const match = allMatchesObj[matchId];
//   if (!match || !match.timerStarted || !match.timerPaused || match.finished)
//     return;

//   // Add paused time to total paused time
//   if (match.pauseTime) {
//     match.totalPausedTime += Date.now() - match.pauseTime;
//     match.pauseTime = null;
//   }

//   match.timerPaused = false;
//   console.log(`▶️ Timer resumed for match ${matchId}`);
// };

// const stopMatchTimer = (matchId) => {
//   const match = allMatchesObj[matchId];
//   if (!match) return;

//   if (match.timerId) {
//     clearInterval(match.timerId);
//     match.timerId = null;
//   }

//   match.timerStarted = false;
//   match.timerPaused = false;
//   match.remainingTime = match.matchTime * 60;
//   match.startTime = null;
//   match.pauseTime = null;
//   match.totalPausedTime = 0;

//   console.log(`⏹️ Timer stopped for match ${matchId}`);
// };
