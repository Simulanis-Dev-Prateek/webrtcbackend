
const fs = require('fs');
// const https = require('https')
const express = require('express');
const app = express();
const socketio = require('socket.io');



// const { Server } = require("socket.io");
const https = require('https')


const key = fs.readFileSync('cert.key');
const cert = fs.readFileSync('cert.crt');

const expressServer = https.createServer({key, cert}, app);

// const io = new Server(8000, {
//   cors: true,
// });
const io = socketio(expressServer,{
  cors: {
      origin: [
          "https://localhost:3000",
          "https://192.168.1.195:3000"
          // 'https://LOCAL-DEV-IP-HERE' //if using a phone or another computer
      ],
      methods: ["GET", "POST"]
  }
});
expressServer.listen(8888,()=>{
  console.log("server running ")
});

const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();

io.on("connection", (socket) => {
  console.log(`Socket Connected`, socket.id);
  socket.on("room:join", (data) => {
    const { email, room } = data;
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    io.to(room).emit("user:joined", { email, id: socket.id });
    socket.join(room);
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    console.log("peer:nego:needed", offer);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });
});
