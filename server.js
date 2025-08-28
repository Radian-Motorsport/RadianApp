// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const irsdk = require('iracing-sdk-js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

app.use(express.json()); // Add this to parse incoming JSON

app.post('/telemetry', (req, res) => {
  console.log('📡 Telemetry POST received');
  io.emit('telemetry', req.body);
  res.sendStatus(200);
});

app.post('/sessionInfo', (req, res) => {
  console.log('📋 SessionInfo POST received');
  io.emit('sessionInfo', req.body);
  res.sendStatus(200);
});


irsdk.init({
  telemetryUpdateInterval: 1000,
  sessionInfoUpdateInterval: 5000
});

const iracing = irsdk.getInstance();

console.log('Waiting for iRacing...');

iracing.on('Connected', () => {
  console.log('Connected to iRacing');

  iracing.on('Disconnected', () => {
    console.log('iRacing shut down');
  });

  // Emit session info
  iracing.on('SessionInfo', (sessionInfo) => {
    const drivers = sessionInfo.data.DriverInfo.Drivers.map(driver => ({
      carIdx: driver.CarIdx,
      userName: driver.UserName,
      teamName: driver.TeamName
    }));

    io.emit('sessionInfo', { drivers });
    console.log('Session info sent to frontend');
  });

  // Emit telemetry every update
  iracing.on('TelemetryUpdate', (data) => {
    const telemetry = {
      lap: data.Lap?.value || 0,
      fuelLevel: data.FuelLevel?.value || 0,
      rpm: data.RPM?.value || 0,
      speed: data.Speed?.value || 0,
      timestamp: new Date().toISOString()
    };

    io.emit('telemetry', telemetry);
  });
});

io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

