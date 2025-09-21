// controllers/socketManager.js

const soloGameSocket = require("./soloGameSocket"); // Solo performance matches

module.exports = function (io) {
  soloGameSocket(io);
};
