const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const cors = require("cors");

corsOptions = {
  cors: true,
  origins: ["https://shoot-io.netlify.app/"],
};

const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);
const io = socketio(server, corsOptions);

let players = [];

io.on("connection", (socket) => {
  const playerCode = socket.id.substring(socket.id.length - 5);
  players.push({ code: playerCode, paired: false });
  socket.join(playerCode);
  socket.emit("init", { msg: "Connected", id: socket.id });
  socket.on("moved", ({ move, playerId, code }) => {
    socket.broadcast.to(code).emit("responded", { move, playerId });
  });
  socket.on("code", (data) => {
    let ind = players.findIndex((player) => player.code === data.code);
    if (ind === -1) {
      socket.emit("begin", {
        status: "error",
        msg: "No game for the given code is present",
      });
      return;
    }
    if (players[ind].paired) {
      socket.emit("begin", {
        status: "error",
        msg: "The person is playing with someone else",
      });
      return;
    }
    let currInd = players.findIndex((player) => player.code === playerCode);
    players[ind].paired = true;
    players[currInd].paired = true;
    socket.join(data.code);
    socket.emit("begin", { status: "success", code: data.code });
    socket.broadcast
      .to(data.code)
      .emit("begin", { status: "success", code: data.code });
  });
  socket.on("gameEnded", ({ code }) => {
    if (playerCode !== code) {
      socket.leave(code);
    }
    let ind = players.findIndex((player) => player.code === playerCode);
    players[ind].paired = false;
  });
});

app.use(cors());

server.listen(PORT, () => console.log(`The server is running on ${PORT}`));
