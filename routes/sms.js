const smsController = require("../controllers/smsController");
const { validatdeToken } = require("../common/jwt");

module.exports = function (app) {
  app.post("/api/sendSms", function (req, res) {
    smsController.sendSms(req, res);
  });
};
