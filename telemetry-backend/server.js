let currentSessionId = null;
let currentUserName = null;

// Telemetry state storage
let telemetryState = {
  lastLapCompleted: -1,
  fuelAtLapStart: null,
  fuelUsageHistory: [],
  lapTimeHistory: [],
  lastLapStartTime: null,
  currentLap: 0,
  lastTeamLap: null,
  bufferedData: null,
  lapEntryPoint: null,
  bufferFrozen: true,
  driverWasOnTrack: false,
  lastTelemetryTime: null,
  stintStartTime: null,
  lastPitStopTimeValue: null,
  previousValues: {
    fuelPerLap: null,
    fuelAvg: null,
    fuelAvg5: null,
    lastLapTime: null,
    lapAvg3: null,
    lapAvg5: null
  },
  stintIncidentCount: 0,
  lastSessionId: null,
  lastSessionDate: new Date().toDateString()
};

// Connection tracking
const connectedClients = new Map();
const serverStartTime = Date.now();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public')); // Serve planner frontend

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Track this client connection
  connectedClients.set(socket.id, {
    id: socket.id,
    connectedAt: Date.now(),
    lastActive: Date.now(),
    userAgent: socket.handshake.headers['user-agent'] || 'Unknown',
    driverName: null // Will be updated if this client broadcasts telemetry
  });
  
  // Notify all clients about the new connection
  io.emit('clientConnect', { 
    id: socket.id,
    timestamp: Date.now() 
  });
  
  // Send current telemetry state to newly connected client
  socket.emit('telemetryStateInit', telemetryState);
  
  // Handle connection info requests
  socket.on('requestConnectionInfo', () => {
    const clientsInfo = Array.from(connectedClients.values()).map(client => ({
      id: client.id,
      connectedAt: client.connectedAt,
      connectedFor: Math.floor((Date.now() - client.connectedAt) / 1000),
      lastActive: client.lastActive,
      userAgent: client.userAgent,
      driverName: client.driverName
    }));
    
    socket.emit('connectionInfo', {
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      clientCount: connectedClients.size,
      clients: clientsInfo,
      storageActive: true,
      apiStatus: 'Operational'
    });
  });
  
  // Ping all clients
  socket.on('pingAllClients', () => {
    io.emit('serverPing', { timestamp: Date.now() });
  });
  
  // Handle client state updates
  socket.on('updateTelemetryState', (updates) => {
    if (!updates || typeof updates !== 'object') return;
    
    // Update client's last active timestamp
    const clientInfo = connectedClients.get(socket.id);
    if (clientInfo) {
      clientInfo.lastActive = Date.now();
      connectedClients.set(socket.id, clientInfo);
    }
    
    // Update server state
    Object.keys(updates).forEach(key => {
      if (key in telemetryState) {
        telemetryState[key] = updates[key];
      }
    });
    
    // Broadcast to all other clients
    socket.broadcast.emit('telemetryStateUpdate', updates);
  });
  
  // Handle client-initiated reset
  socket.on('resetTelemetryState', () => {
    // Reset most state values
    telemetryState = {
      lastLapCompleted: -1,
      fuelAtLapStart: null,
      fuelUsageHistory: [],
      lapTimeHistory: [],
      lastLapStartTime: null,
      currentLap: 0,
      lastTeamLap: null,
      bufferedData: null,
      lapEntryPoint: null,
      bufferFrozen: true,
      driverWasOnTrack: false,
      lastTelemetryTime: null,
      stintStartTime: null,
      lastPitStopTimeValue: null,
      previousValues: {
        fuelPerLap: null,
        fuelAvg: null,
        fuelAvg5: null,
        lastLapTime: null,
        lapAvg3: null,
        lapAvg5: null
      },
      stintIncidentCount: 0,
      // Keep session tracking
      lastSessionId: currentSessionId,
      lastSessionDate: new Date().toDateString()
    };
    
    // Broadcast reset to all clients
    io.emit('telemetryStateReset', telemetryState);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Get client info before removing
    const clientInfo = connectedClients.get(socket.id);
    
    // Remove from tracking
    connectedClients.delete(socket.id);
    
    // Notify other clients
    io.emit('clientDisconnect', { 
      id: socket.id,
      timestamp: Date.now(),
      connectedFor: clientInfo ? Math.floor((Date.now() - clientInfo.connectedAt) / 1000) : null
    });
  });
});



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
  const clientIp = req.ip || req.connection.remoteAddress;

  currentSessionId = data?.WeekendInfo?.SessionID;
  currentUserName = data?.DriverInfo?.Drivers?.[0]?.UserName;
  
  // Find the client that most likely sent this data and associate the driver name
  if (currentUserName) {
    for (const [socketId, clientInfo] of connectedClients.entries()) {
      // Update the client that's likely broadcasting the data
      // This is a best-effort approach since we don't have a direct socket connection for HTTP requests
      if (clientInfo.lastActive > Date.now() - 10000) { // Active in the last 10 seconds
        clientInfo.driverName = currentUserName;
        connectedClients.set(socketId, clientInfo);
        break;
      }
    }
  }

  io.emit('sessionInfo', data); // Broadcast to planner
  console.log('📋 Session info received:', data);
  res.sendStatus(200);
});


server.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});

// API Endpoints for telemetry state
app.get('/api/telemetry-state', (req, res) => {
  res.json(telemetryState);
});

app.post('/api/telemetry-state', (req, res) => {
  // Update telemetry state with values from client
  const updates = req.body;
  
  // Validate input
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Invalid telemetry state data' });
  }
  
  // Update state
  Object.keys(updates).forEach(key => {
    if (key in telemetryState) {
      telemetryState[key] = updates[key];
    }
  });
  
  // Broadcast state update to all clients
  io.emit('telemetryStateUpdate', telemetryState);
  
  res.status(200).json({ success: true });
});

// Reset telemetry state
app.post('/api/reset-telemetry', (req, res) => {
  // Reset most state values
  telemetryState = {
    lastLapCompleted: -1,
    fuelAtLapStart: null,
    fuelUsageHistory: [],
    lapTimeHistory: [],
    lastLapStartTime: null,
    currentLap: 0,
    lastTeamLap: null,
    bufferedData: null,
    lapEntryPoint: null,
    bufferFrozen: true,
    driverWasOnTrack: false,
    lastTelemetryTime: null,
    stintStartTime: null,
    lastPitStopTimeValue: null,
    previousValues: {
      fuelPerLap: null,
      fuelAvg: null,
      fuelAvg5: null,
      lastLapTime: null,
      lapAvg3: null,
      lapAvg5: null
    },
    stintIncidentCount: 0,
    // Keep session tracking
    lastSessionId: currentSessionId,
    lastSessionDate: new Date().toDateString()
  };
  
  // Broadcast reset to all clients
  io.emit('telemetryStateReset', telemetryState);
  
  res.status(200).json({ success: true });
});
