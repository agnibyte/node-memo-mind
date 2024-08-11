const fs = require("fs");

module.exports = function (app) {
  const routePath = __dirname + "/routes/";
  const routeFiles = ["home", "loginRoutes","sms"];

  routeFiles.map((val) => {
    if (fs.existsSync(routePath + val + ".js")) {
      require(routePath + val)(app);
    }
    return true;
  });
};
