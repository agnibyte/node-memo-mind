const express = require("express");
const os = require("os");
const cluster = require("cluster");
const morgan = require("morgan");
const app = express();
const cookieParser = require("cookie-parser");

app.use(cookieParser());
app.use(express.json());
cluster.schedulingPolicy = cluster.SCHED_RR;
require("dotenv").config();

const port = 7000;
app.use(morgan("dev"));

// const isclustered = true;
const isclustered = false;
const noOfCpus = os.cpus().length;
const server = () => {

  require("./app")(app);
  app.listen(port, () => {
    console.log("app listening on port", port);
  });
};
if (isclustered && noOfCpus > 1) {
  if (cluster.isPrimary) {
    console.log(`Master process ${process.pid} is running`);

    for (let i = 0; i < noOfCpus; i++) {
      cluster.fork();
    }
    cluster.on("exit", (worker, code, signal) => {
      console.log(`Worker process ${worker.process.pid} died. Restarting...`);
      cluster.fork();
    });
  } else {
    server();
  }
} else {
  server();
}
