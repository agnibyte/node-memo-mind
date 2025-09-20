const soloGameSocket = require("../controllers/soloGameSocket");

module.exports = (app, io) => {
  soloGameSocket(io);
};
