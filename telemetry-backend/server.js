let currentSessionId = null;
let currentUserName = null;
let lastBroadcastedDriver = null;
let lastBroadcastedSession = null;
let dataPersistenceEnabled = false; // OFF by default

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
    lapAvg5: null,
    projectedLaps: null,
    projectedTime: null,
    stintLapCount: null,
    stintFuelAvg: null,
    stintTotalTime: null,
    stintAvgLapTime: null
  },
  stintIncidentCount: 0,
  lastSessionId: null,
  lastSessionDate: new Date().toDateString()
};

// Connection tracking
const connectedClients = new Map(); // Socket.io clients (web viewers)
const httpClients = new Map(); // HTTP clients (racing apps)
const serverStartTime = Date.now();

// Helper function to detect racing app from User-Agent
function isRacingApp(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return ua.includes('radiantelemetryapp') || ua.includes('radianapp') || ua.includes('radian');
}

// Helper function to get or create HTTP client info
function getOrCreateHttpClient(req) {
  const userAgent = req.get('User-Agent') || 'Unknown';
  const clientKey = req.ip + '_' + userAgent; // Use IP + User-Agent as key
  
  if (!httpClients.has(clientKey)) {
    httpClients.set(clientKey, {
      id: clientKey,
      connectedAt: Date.now(),
      lastActive: Date.now(),
      userAgent: userAgent,
      isRacingApp: isRacingApp(userAgent),
      driverName: null,
      broadcastingEnabled: false, // Will be updated based on telemetry activity
      isActiveBroadcaster: false,
      lastTelemetryTime: null,
      paused: false // Add pause control
    });
  }
  
  // Update last active time
  const client = httpClients.get(clientKey);
  client.lastActive = Date.now();
  httpClients.set(clientKey, client);
  
  return client;
}

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

app.use(express.json());

// Disable caching for all static files - force fresh load every time
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(express.static('public')); // Serve planner frontend
app.use('/assets', express.static('../assets')); // Serve assets folder

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Get user agent for client type detection
  const userAgent = socket.handshake.headers['user-agent'] || 'Unknown';
  
  // Detect client type based on user agent
  // TODO FOR APP DEVELOPMENT: App should send custom user agent like "RadianTelemetryApp/1.0" 
  // TODO FOR APP DEVELOPMENT: This will distinguish app connections from web browser viewers
  const isApp = userAgent.includes('RadianTelemetryApp') || 
                userAgent.includes('RadianApp') || 
                userAgent.includes('Radian'); // Fallback detection patterns
  
  // Track this client connection
  connectedClients.set(socket.id, {
    id: socket.id,
    connectedAt: Date.now(),
    lastActive: Date.now(),
    userAgent: userAgent,
    clientType: isApp ? 'app' : 'viewer', // New field to distinguish apps from viewers
    isApp: isApp, // Boolean flag for easy checking
    driverName: null, // Will be updated if this client broadcasts telemetry
    isActiveBroadcaster: false, // New field to track if actively sending telemetry
    lastTelemetryTime: null // When they last sent telemetry data
  });
  
  // Notify all clients about the new connection
  io.emit('clientConnect', { 
    id: socket.id,
    timestamp: Date.now() 
  });
  
  // Send current telemetry state to newly connected client
  // Only send if persistence is enabled, otherwise send empty state
  if (dataPersistenceEnabled) {
    socket.emit('telemetryStateInit', telemetryState);
  } else {
    // Send empty state when persistence is off
    socket.emit('telemetryStateInit', {
      lastLapCompleted: -1,
      fuelUsageHistory: [],
      lapTimeHistory: [],
      previousValues: {
        fuelPerLap: null,
        fuelAvg: null,
        fuelAvg5: null,
        lastLapTime: null,
        lapAvg3: null,
        lapAvg5: null,
        projectedLaps: null,
        projectedTime: null,
        stintLapCount: null,
        stintFuelAvg: null,
        stintTotalTime: null,
        stintAvgLapTime: null
      }
    });
  }
  
  // Handle connection info requests
  socket.on('requestConnectionInfo', () => {
    // Get web viewers (Socket.io clients)
    const webViewers = Array.from(connectedClients.values()).map(client => ({
      id: client.id,
      connectedAt: client.connectedAt,
      connectedFor: Math.floor((Date.now() - client.connectedAt) / 1000),
      lastActive: client.lastActive,
      userAgent: client.userAgent,
      driverName: client.driverName,
      isActiveBroadcaster: client.isActiveBroadcaster,
      lastTelemetryTime: client.lastTelemetryTime,
      telemetryAge: client.lastTelemetryTime ? Math.floor((Date.now() - client.lastTelemetryTime) / 1000) : null,
      clientType: 'viewer'
    }));
    
    // Get racing apps (HTTP clients) - clean up old inactive ones first
    const now = Date.now();
    for (const [clientId, client] of httpClients.entries()) {
      if (now - client.lastActive > 300000) { // Remove clients inactive for 5+ minutes
        httpClients.delete(clientId);
      }
    }
    
    const racingApps = Array.from(httpClients.values()).map(client => ({
      id: client.id,
      connectedAt: client.connectedAt,
      connectedFor: Math.floor((Date.now() - client.connectedAt) / 1000),
      lastActive: client.lastActive,
      userAgent: client.userAgent,
      driverName: client.driverName,
      broadcastingEnabled: client.broadcastingEnabled,
      isActiveBroadcaster: client.isActiveBroadcaster,
      lastTelemetryTime: client.lastTelemetryTime,
      telemetryAge: client.lastTelemetryTime ? Math.floor((Date.now() - client.lastTelemetryTime) / 1000) : null,
      clientType: 'racing-app'
    }));
    
    // Debug logging
    console.log(`🔍 Connection info requested - Socket clients: ${connectedClients.size}, HTTP clients: ${httpClients.size}`);
    console.log(`🔍 Racing apps:`, racingApps);
    console.log(`🔍 Web viewers:`, webViewers);
    
    socket.emit('connectionInfo', {
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      clientCount: connectedClients.size + httpClients.size,
      webViewers: webViewers,
      racingApps: racingApps,
      clients: [...webViewers, ...racingApps], // Combined for backward compatibility
      storageActive: true,
      apiStatus: 'Operational'
    });
    
    // Also send current broadcaster info if available
    if (currentUserName || currentSessionId) {
      socket.emit('currentBroadcaster', {
        driver: currentUserName,
        sessionId: currentSessionId
      });
    }
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
    
    // Only update server state if persistence is enabled
    if (dataPersistenceEnabled) {
      Object.keys(updates).forEach(key => {
        if (key in telemetryState) {
          telemetryState[key] = updates[key];
        }
      });
    }
    
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
        lapAvg5: null,
        projectedLaps: null,
        projectedTime: null,
        stintLapCount: null,
        stintFuelAvg: null,
        stintTotalTime: null,
        stintAvgLapTime: null
      },
      stintIncidentCount: 0,
      // Keep session tracking
      lastSessionId: currentSessionId,
      lastSessionDate: new Date().toDateString()
    };
    
    // Clear broadcaster information
    lastBroadcastedDriver = null;
    lastBroadcastedSession = null;
    currentUserName = null;
    currentSessionId = null;
    
    // Clear broadcaster on all clients
    io.emit('currentBroadcaster', {
      driver: null,
      sessionId: null
    });
    
    // Broadcast reset to all clients
    io.emit('telemetryStateReset', telemetryState);
  });
  
  // Handle persistence toggle
  socket.on('setPersistence', (data) => {
    dataPersistenceEnabled = data.enabled;
    console.log(`Persistence setting changed: ${dataPersistenceEnabled}`);
    
    // If persistence was disabled, reset server state
    if (!dataPersistenceEnabled) {
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
          lapAvg5: null,
          projectedLaps: null,
          projectedTime: null,
          stintLapCount: null,
          stintFuelAvg: null,
          stintTotalTime: null,
          stintAvgLapTime: null
        },
        stintIncidentCount: 0,
        lastSessionId: null,
        lastSessionDate: new Date().toDateString()
      };
    }
    
    // Broadcast to all clients
    io.emit('persistenceChanged', { enabled: dataPersistenceEnabled });
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
  const clientIp = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';

  // Ignore all telemetry if IsOnTrack is false
  const isOnTrack = data?.values?.IsOnTrack;
  if (isOnTrack === false) {
    console.log(`📡 Telemetry ignored (driver not on track - IsOnTrack: ${isOnTrack})`);
    return res.sendStatus(200);
  }

  // Extract driver name from telemetry data if provided
  const telemetryDriverName = data?.driverName;

  // Debug logging
  console.log(`📡 Telemetry received from User-Agent: "${userAgent}"`);
  console.log(`📡 Is racing app: ${isRacingApp(userAgent)}`);
  console.log(`📡 IsOnTrack: ${isOnTrack} (type: ${typeof isOnTrack})`);
  if (telemetryDriverName) {
    console.log(`📡 Driver name from telemetry: ${telemetryDriverName}`);
  }

  // Get or create HTTP client info (for racing apps)
  const httpClient = getOrCreateHttpClient(req);
  
  // Update racing app as active broadcaster
  if (httpClient.isRacingApp) {
    httpClient.isActiveBroadcaster = true;
    httpClient.broadcastingEnabled = true; // App is sending telemetry, so broadcasting is enabled
    httpClient.lastTelemetryTime = Date.now();
    
    // Use driver name from telemetry data if available, otherwise fall back to session info
    if (telemetryDriverName) {
      httpClient.driverName = telemetryDriverName;
      currentUserName = telemetryDriverName; // Update global current user name
    } else if (currentUserName) {
      httpClient.driverName = currentUserName;
    }
    
    httpClients.set(httpClient.id, httpClient);
    
    console.log(`📡 Racing app "${userAgent}" broadcasting telemetry from ${httpClient.driverName || 'Unknown Driver'}`);
    console.log(`📡 HTTP clients count: ${httpClients.size}`);
  } else {
    console.log(`⚠️ Non-racing app sending telemetry: "${userAgent}"`);
  }

  // Mark other clients as inactive broadcasters (in case switching between clients)
  for (const [clientId, clientInfo] of httpClients.entries()) {
    if (clientInfo.lastTelemetryTime && (Date.now() - clientInfo.lastTelemetryTime) > 5000) {
      clientInfo.isActiveBroadcaster = false;
      httpClients.set(clientId, clientInfo);
    }
  }

  // Handle broadcaster info based on track status
  let broadcasterName;
  let shouldEmit = false;
  
  console.log(`📡 Broadcaster logic - isOnTrack: ${isOnTrack}, currentUserName: ${currentUserName}, lastBroadcastedDriver: ${lastBroadcastedDriver}`);
  
  if (isOnTrack === true && currentUserName) {
    // Driver is on track - use iRacing name only
    broadcasterName = currentUserName;
    shouldEmit = (broadcasterName !== lastBroadcastedDriver || currentSessionId !== lastBroadcastedSession);
    console.log(`📡 Driver on track - will emit: ${shouldEmit}, broadcaster: ${broadcasterName}`);
  } else {
    // Driver is off track (isOnTrack === false) - show "Seat Empty"
    broadcasterName = "Seat Empty";
    shouldEmit = (lastBroadcastedDriver !== "Seat Empty");
    console.log(`📡 Driver off track (isOnTrack: ${isOnTrack}) - will emit: ${shouldEmit}, broadcaster: ${broadcasterName}`);
  }
  
  if (shouldEmit) {
    console.log(`📡 Emitting currentBroadcaster: ${broadcasterName}`);
    io.emit('currentBroadcaster', {
      driver: broadcasterName,
      sessionId: currentSessionId
    });
    
    // Update last broadcasted values
    lastBroadcastedDriver = broadcasterName;
    lastBroadcastedSession = currentSessionId;
  }

  // Only broadcast telemetry data if driver is on track
  if (isOnTrack === true) {
    io.emit('telemetry', data); // Broadcast to planner
    console.log('📡 Telemetry broadcasted (driver on track):', data);
  } else {
    console.log(`📡 Telemetry ignored (driver not on track - IsOnTrack: ${isOnTrack})`);
  }
  
  res.sendStatus(200);
});



app.post('/sessionInfo', (req, res) => {
  const data = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';

  // NOTE: SessionInfo data structure doesn't have IsOnTrack - that's telemetry data
  // Removed incorrect IsOnTrack filter that was blocking all sessionInfo

  currentSessionId = data?.WeekendInfo?.SessionID;
  
  // Get the correct driver using DriverCarIdx
  const driverCarIdx = data?.DriverInfo?.DriverCarIdx;
  if (driverCarIdx !== undefined && data?.DriverInfo?.Drivers?.[driverCarIdx]) {
    currentUserName = data.DriverInfo.Drivers[driverCarIdx].UserName;
  } else {
    currentUserName = null;
  }
  
  // Debug logging
  console.log(`📋 SessionInfo received from User-Agent: "${userAgent}"`);
  console.log(`📋 DriverCarIdx: ${driverCarIdx}, Driver: ${currentUserName}, Session: ${currentSessionId}`);
  console.log(`📋 Is racing app: ${isRacingApp(userAgent)}`);
  
  // Get or create HTTP client info (for racing apps)
  const httpClient = getOrCreateHttpClient(req);
  
  // Update racing app info
  if (httpClient.isRacingApp && currentUserName) {
    httpClient.driverName = currentUserName;
    httpClients.set(httpClient.id, httpClient);
    console.log(`📋 Racing app "${userAgent}" updated session info for ${currentUserName}`);
    console.log(`📋 HTTP clients count: ${httpClients.size}`);
  }

  io.emit('sessionInfo', data); // Broadcast to planner
  console.log('📋 Session info received:', data);
  console.log('📋 Broadcasting sessionInfo to all connected clients...');
  console.log('📋 Connected clients count:', connectedClients.size);
  res.sendStatus(200);
});

// Test endpoint to manually trigger sessionInfo event
app.get('/test/sessioninfo', (req, res) => {
  console.log('🧪 TEST: Manual sessionInfo trigger requested');
  
  const testData = {
    WeekendInfo: {
      TrackDisplayName: "TEST TRACK",
      TrackLength: "3.5 km"
    },
    SessionInfo: {
      Sessions: [{
        SessionType: "TEST SESSION",
        SessionLaps: "25",
        SessionTime: "30 min"
      }]
    }
  };
  
  io.emit('sessionInfo', testData);
  console.log('🧪 TEST: Broadcasted test sessionInfo to all clients');
  res.json({ success: true, message: 'Test sessionInfo sent', connectedClients: connectedClients.size });
});


// Debug endpoint to check HTTP clients
app.get('/api/debug/clients', (req, res) => {
  res.json({
    socketClients: Array.from(connectedClients.values()),
    httpClients: Array.from(httpClients.values()),
    totalCount: connectedClients.size + httpClients.size
  });
});

server.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
  console.log(`📡 New endpoint available: POST /api/broadcasting-disabled`);
  console.log(`🎮 Racing apps should send User-Agent: "RadianTelemetryApp/1.0"`);
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

// Handle explicit broadcasting disabled signal from racing apps
app.post('/api/broadcasting-disabled', (req, res) => {
  console.log('Broadcasting disabled signal received from:', req.get('User-Agent'));
  
  // Update HTTP client with explicit disabled state
  const client = getOrCreateHttpClient(req);
  client.broadcastingEnabled = false;
  client.isActiveBroadcaster = false;
  client.lastActivity = Date.now();
  
  // Extract driver name if provided
  if (req.body && req.body.driverName) {
    client.driverName = req.body.driverName;
  }
  
  console.log(`Client ${client.id} explicitly disabled broadcasting`);
  
  // Broadcast updated connection info
  const connectionInfo = getConnectionInfo();
  io.emit('connectionInfo', connectionInfo);
  
  res.status(200).json({ 
    success: true, 
    message: 'Broadcasting disabled status recorded',
    clientId: client.id 
  });
});
