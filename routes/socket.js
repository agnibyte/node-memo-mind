const socketController = require("../controllers/socketController");
const soloGameSocket = require("../controllers/soloGameSocket");

module.exports = (app, io) => {
  socketController(io);
  soloGameSocket(io);
};
