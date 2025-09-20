const fs = require("fs");

module.exports = function (app, io) {
  const routePath = __dirname + "/routes/";
  const routeFiles = ["home", "socket", "loginRoutes", "sms", "solo-game"];

  routeFiles.map((val) => {
    const fullPath = routePath + val + ".js";
    if (fs.existsSync(fullPath)) {
      require(fullPath)(app, io); // pass io here
    }
    return true;
  });
};
