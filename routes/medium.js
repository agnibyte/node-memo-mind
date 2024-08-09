const cors = require("cors");
const bodyParser = require("body-parser");
const express = require("express");
const mongoose = require("mongoose");
const redis = require("redis");
const client = require("../lib/redis");

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect("mongodb://localhost:27017/test");
}
const testUsersSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  image: String,
});
const UsersAdmin = mongoose.model("users", testUsersSchema);

const server = express();
const expressPort = 5001;

client.on("ready", function () {
  console.log("redis is running");
});
server.use(cors());
server.use(bodyParser.json());

server.post("/user", async (req, res) => {
  const redisKey = "user";
  const { name, email, phone, image } = req.body;
  let user = new UsersAdmin();
  user.name = name;
  user.email = email;
  user.phone = phone;
  user.image = image;
  const doc = await user.save();
  await client.del(redisKey);

  res.json(doc);
});
server.get("/user", async (req, res) => {
  const redisKey = "user";
  let cachedData;
  try {
    const exists = await client.exists(redisKey);
    if (exists === 1) {
      console.log("Key exists");
      cachedData = await client.get(redisKey);
    } else {
      console.log("Key does not exist");
      console.log("data from MongoDB");
      const docs = await UsersAdmin.find({});
      const data = JSON.stringify(docs);
      await client.set(redisKey, data);
      cachedData = data;
    }
    // client.disconnect();
    res.json(JSON.parse(cachedData));
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

server.get("/usera", async (req, res) => {
  const docs = await UsersAdmin.find({});
  res.json(docs);
});

server.listen("8080", () => {
  console.log("server started");
});
