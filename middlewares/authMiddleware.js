const constants = require("../common/constants");



const authPage = () => (req, res, next) => {
  if (constants.adminRoles.includes(req.body.role)) {
    next();
  } else {
    res.status(401).send("Unauthorized user role");
  }
};

module.exports = authPage;
