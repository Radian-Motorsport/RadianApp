let currentSessionId = null;
let currentUserName = null;

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public')); // Serve planner frontend



app.post('/telemetry', (req, res) => {
  const data = req.body;

  const isOnTrack = data?.values?.IsOnTrack;

  if (isOnTrack === true && currentUserName) {
    io.emit('currentBroadcaster', {
      driver: currentUserName,
      sessionId: currentSessionId
    });
  }

  io.emit('telemetry', data); // Broadcast to planner
  console.log('📡 Telemetry received:', data);
  res.sendStatus(200);
});



app.post('/sessionInfo', (req, res) => {
  const data = req.body;

  currentSessionId = data?.WeekendInfo?.SessionID;
  currentUserName = data?.DriverInfo?.Drivers?.[0]?.UserName;

  io.emit('sessionInfo', data); // Broadcast to planner
  console.log('📋 Session info received:', data);
  res.sendStatus(200);
});


server.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
