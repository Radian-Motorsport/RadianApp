const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const irsdk = require('iracing-sdk-js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ Viewer running at http://localhost:${PORT}`);
});

app.use(express.static('public')); // Serve frontend from /public

const iracing = irsdk.init({
  telemetryUpdateInterval: 0,         // 🚀 Max speed: every frame
  sessionInfoUpdateInterval: 0        // 🔁 Check for changes constantly
});

console.log('🔍 Waiting for iRacing...');

iracing.on('Telemetry', (data) => {
  const telemetry = data.values;
  io.emit('telemetry', telemetry);
  console.log(`📡 Telemetry Tick`);
  console.log(telemetry);
});

iracing.on('SessionInfo', (sessionInfo) => {
  io.emit('sessionInfo', sessionInfo.data);
  console.log('\n📋 SessionInfo:\n');
  console.dir(sessionInfo.data, { depth: null });
});

iracing.on('Disconnected', () => {
  console.log('❌ iRacing shut down');
});
