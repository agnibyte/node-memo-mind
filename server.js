const express = require("express");
const os = require("os");
const cluster = require("cluster");
const morgan = require("morgan");
const app = express();
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const socketManager = require("./controllers/socketManager");

app.use(cookieParser());
app.use(express.json());
cluster.schedulingPolicy = cluster.SCHED_RR;
require("dotenv").config();

app.use(morgan("dev"));
// const isclustered = true;
const isclustered = false;
const noOfCpus = os.cpus().length;
const server = () => {
  const httpServer = http.createServer(app);

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Create namespaces for different games
  const redBlueNamespace = io.of("/api/socket/red-blue-fight");
  const soloNamespace = io.of("/api/socket/solo-game");

  // Attach controllers
  socketManager(redBlueNamespace, soloNamespace);

  // Pass io + namespaces to routes
  require("./app")(app, { io, redBlueNamespace, soloNamespace });

  const port = process.env.PORT || 7000;
  httpServer.listen(port, () => {
    console.log(`🚀 App listening on port ${port}`);
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
