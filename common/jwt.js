const { sign, verify } = require("jsonwebtoken");
module.exports.createToken = (user) => {
  const accsesToken = sign({ email: user.email, id: user.id }, process.env.JWT_SECRET_KEY);
  return accsesToken;
};
module.exports.validatdeToken = (req, res, next) => {
  try {
    const accsesToken = req.cookies["access-token"];
    if (!accsesToken) {
      res.status(403).json({
        sucsses: false,
        message: "User Session is expired please back to log in",
      });
    } else {
      const validate = verify(accsesToken, process.env.JWT_SECRET_KEY);
      if (validate) {
        req.authenticate = true;
        req.body = validate;
        return next();
      }
    }
  } catch (error) {
    console.log("JsonWebTokenError: jwt must be provided");
    res.status(403).json({
      sucsses: false,
      message: "User Session is expired please back to log in",
    });
  }
};
