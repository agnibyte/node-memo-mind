const socketController = require("../controllers/socketController");

module.exports = (app, io) => {
  socketController(io);
};
