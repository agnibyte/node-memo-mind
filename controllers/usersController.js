const connection = require("../common/dbConnection");
const bcrypt = require("bcrypt");
const { createToken } = require("../common/jwt");

module.exports.allUsers = function (req, res) {
  let response = { success: false };

  const getQuery = "SELECT * FROM user_test";
  connection
    .executeQuery(getQuery)
    .then((result) => {
      if (result.length > 0) {
        response.success = true;
        response.data = result;
      } else {
        response.data = [];
        response.success = true;
        response.message = "No data found";
      }
      res.status(200).json(response);
    })
    .catch((err) => {
      res
        .status(400)
        .json({ success: false, message: "Error while creating user" });
    });
};

module.exports.userDetails = function (req, res) {
  let result = [
    {
      id: 1,
      name: "suraj",
      age: 23,
    },
  ];
  res.status(200).json(result);
};
module.exports.registerNewUser = function (req, res) {
  const { firstName, lastName, email, password } = req.body;
  const ckeckQuery = "SELECT * FROM user_test WHERE email=?";
  connection
    .executeQuery(ckeckQuery, [email])
    .then((result) => {
      if (result.length > 0) {
        console.log("innn", result.length);
        res
          .status(400)
          .json({ success: false, message: "Email already exists" });
      } else {
        bcrypt.hash(password, 10).then((hashed) => {
          let tempObj = {
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: hashed,
          };
          console.log("tempObj", tempObj);
          const insertquery = "INSERT INTO user_test SET ?";
          connection
            .executeQuery(insertquery, [tempObj])
            .then((result) => {
              res.status(200).json({
                success: true,
                message: "user registred successfully",
              });
            })
            .catch((err) => {
              res
                .status(400)
                .json({ success: false, message: "Error while creating user" });
            });
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
};
module.exports.userLogIn = function (req, res) {
  const { email, password } = req.body;
  const ckeckQuery = "SELECT * FROM user_test WHERE email=?";
  connection
    .executeQuery(ckeckQuery, [email])
    .then((userData) => {
      if (userData.length === 0) {
        res
          .status(400)
          .json({ success: false, message: "User does not exists" });
      } else {
        bcrypt.compare(password, userData[0].password).then((match) => {
          console.log(match);
          if (!match) {
            res.status(400).json({
              success: false,
              message: "Password does not match",
            });
          } else {
            const accsesToken = createToken(userData[0]);
            res.cookie("access-token", accsesToken, {
              maxAge: 60 * 60 * 24 * 1000,
            });
            res.status(200).json({
              success: true,
              message: "User logged in successfully",
            });
          }
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
};
module.exports.getProfile = function (req, res) {
  const { id } = req.body;
  const ckeckQuery = "SELECT * FROM user_test WHERE id=?";
  connection
    .executeQuery(ckeckQuery, [id])
    .then((userData) => {
      if (userData.length === 0) {
        res
          .status(400)
          .json({ success: false, message: "User does not exists" });
      } else {
        const userObj = {
          id: userData[0].id,
          firstName: userData[0].firstName,
          lastName: userData[0].lastName,
          email: userData[0].email,
        };
        res.status(200).json({
          success: true,
          data: userObj,
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
};
// test
