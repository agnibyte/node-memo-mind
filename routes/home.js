const events = require("events");
var eventEmitter = new events.EventEmitter();

let count = 0;
eventEmitter.on("my_event", () => {
  count++;
  console.log("event call successfully.");
});
module.exports = function (app) {
  app.get("/api/home", (req, res) => {
    // const { num } = req.body;
    const num = getRandomInt(3);
    console.log("num ", num);
    if (num === 0) {
      process.exit(1);
    }
    eventEmitter.emit("my_event");

    res.send(
      `process ${process.pid} is running number is ${num} api is called ${count} times!!`
    );
  });
 

  function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }

  app.get("/api/nonBlocking", (req, res) => {
    res.send("this is non blocking");
  });
  app.get("/api/Blocking", (req, res) => {
    let count = 0;
    for (let i = 0; i < 50; i++) {
      count++;
      // console.log(i);
    }
    res.send("this is final count: " + count);
  });
};
