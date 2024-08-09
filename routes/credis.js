const express = require("express");
const mongoose = require("mongoose");
const client = require("../lib/redis");

const app = express();
const PORT = process.env.PORT || 3100;

mongoose
  .connect("mongodb://localhost:27017/test", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
    process.exit(1);
  });


client.on("connect", () => {
  console.log("Connected to Redis");
});

client.on("error", (err) => {
  console.error("Error connecting to Redis:", err.message);
});

app.get("/api/data", (req, res) => {
  client.get("data", (err, cachedData) => {
    if (err) {
      console.error("Error retrieving data from Redis:", err.message);
      res.send("Data from MongoDB");
    } else if (cachedData) {
      res.send("Data from Redis: " + cachedData);
    } else {
      const data = "Data from MongoDB";
      client.setex("data", 3600, data);
      res.send(data);
    }
  });
});

app.post("/api/data", (req, res) => {
  client.del("data"); // Delete cached data
  res.send("Data inserted into MongoDB");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});