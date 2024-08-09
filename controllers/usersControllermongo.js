const bcrypt = require("bcrypt");
const { createToken } = require("../common/jwt");
require("../models/mongoDb");
const User = require("../models/user.model");

module.exports.allUsers = function (req, res) {
  User.find({})
    .then((data) => {
      res.status(200).json({
        success: true,
        data: data,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        success: false,
        message: "Internal sever error",
      });
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

  bcrypt
    .hash(password, 10)
    .then((hashed) => {
      const user = new User({ firstName, lastName, email, password: hashed });
      user
        .save()
        .then((result) => {
          res.status(200).json({
            success: true,
            message: "User registered successfully",
          });
        })
        .catch((err) => {
          console.log(err);
          res.status(500).json({
            success: false,
            message: "User registration failed",
          });
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        success: false,
        message: "Internal sever error",
      });
    });
};
module.exports.userLogIn = function (req, res) {
  const { email, password } = req.body;
  User.findOne({ email })
    .then((userData) => {
      bcrypt.compare(password, userData.password).then((match) => {
        console.log(match);
        if (!match) {
          res.status(400).json({
            success: false,
            message: "Password does not match",
          });
        } else {
          const accsesToken = createToken(userData);
          res.cookie("access-token", accsesToken, {
            maxAge: 60 * 60 * 24 * 1000,
          });
          res.status(200).json({
            success: true,
            message: "User logged in successfully",
          });
        }
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        success: false,
        message: "user not found",
      });
    });
};
module.exports.getProfile = function (req, res) {
  const { id } = req.body;
  User.findOne({ _id: id })
    .then((data) => {
      res.status(200).json({
        success: true,
        data: data,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ success: false, message: "User does not exists" });
    });
  //   connection
  //     .executeQuery(ckeckQuery, [id])
  //     .then((userData) => {
  //       if (userData.length === 0) {
  //         res
  //           .status(400)
  //           .json({ success: false, message: "User does not exists" });
  //       } else {
  //         const userObj = {
  //           firstName: userData[0].firstName,
  //           lastName: userData[0].lastName,
  //           email: userData[0].email,
  //         };
  //         res.status(200).json({
  //           success: true,
  //           data: userObj,
  //         });
  //       }
  //     })
  //     .catch((err) => {
  //       console.log(err);
  //     });
};
