// controllers/homeSocket.js

module.exports = function (home) {
  home.on("connection", (socket) => {
    socket.onAny((eventName, ...args) => {
      console.log(`🎯 home Event received: ${eventName}`, args);
    });
    // Add match from Page 1
    socket.on("joinChat", ({ userName }) => {
      const response = {
        userName,
        timestamp: new Date(),
      };
      // ✅ Notify everyone in this match room only
      home.emit("joinedChat", response);

      // Broadcast live matches update
    });
    socket.on("sendMsg", ({ userId, message }) => {
      const response = {
        userId,
        message,
        timestamp: new Date(),
      };
      // ✅ Notify everyone in this namespace
      home.emit("newMsg", response);
    });

    socket.on("finishSoloMatch", ({ matchId }) => {
      const match = soloMatches[matchId];
      if (!match || match.finished) return;

      match.finished = true;
      match.status = "finished";
      home.to(matchId).emit("soloMatchFinished", match);
    });

    /**
     * Disconnect
     */
    socket.on("disconnect", () => {
      console.log("Solo client disconnected:", socket.id);
    });
  });
};
