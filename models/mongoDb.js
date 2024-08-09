// db.js
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose
  .connect("mongodb://localhost:27017/test")
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
    process.exit(1);
  });
