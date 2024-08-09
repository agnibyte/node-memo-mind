const express = require("express");
const { getValue, setValue, setHashValue } = require("../common/helpers");

const app = express();
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.get("/get/:key", async (req, res) => {
  const key = req.params.key;
  const result = await getValue(key);
  console.log(result);
  res.send(result);
});
app.post("/set", async (req, res) => {
  const { key, value } = req.body;
  const result = await setValue(key, value);
  res.send(result);
});
app.post("/hset", async (req, res) => {
  const { key, hsetObj } = req.body;
  const result = await setHashValue(key, hsetObj);
  res.send(result);
});
app.post("/write", (req, res) => {
  console.log(req.body);
  res.send("POST Request Called");
});


const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
