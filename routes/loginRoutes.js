const authPage = require("../middlewares/authMiddleware");

const usersController = require("../controllers/usersController");
const { validatdeToken } = require("../common/jwt");
module.exports = function (app) {
  app.get("/api/users", function (req, res) {
    usersController.allUsers(req, res);
  });

  app.get("/api/usersDetails", authPage(), function (req, res) {
    usersController.userDetails(req, res);
  });

  app.post("/api/register", function (req, res) {
    usersController.registerNewUser(req, res);
  });

  app.post("/api/logIn", function (req, res) {
    usersController.userLogIn(req, res);
  });
  
  app.get("/api/profile", validatdeToken, function (req, res) {
    usersController.getProfile(req, res);
  });
};
