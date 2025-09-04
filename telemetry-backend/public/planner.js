// planner.js - Endurance Race Planning with Telemetry Data

// Socket connection is already initialized in telemetry.js
// const socket = io('https://radianapp.onrender.com'); // Removed to avoid duplicate declaration

// State variables for stint calculations
let stintData = [];
let currentStintNumber = 1;
let raceTimeRemaining = 0;
let nextPitStop = 0;
let stintDuration = 0;
let lapsPerStint = 0;
let totalLapsCompleted = 0;

// Pit and race status variables
let isPitting = false;
let isRaceRunning = false;
let pitStartTime = 0;
let pitDurations = [];
let lastPitTimeChecked = Date.now();
let lastSessionTimeRemain = null;
let sessionTimeRemainHistory = [];

// Fuel and lap time variables - will be populated from telemetry
let fuelPerLap = 0;        // From index calculations
let avgLapTime = 0;        // From index calculations
let tankCapacity = 0;      // From SessionInfo.DriverCarFuelMaxLtr
let currentFuelLevel = 0;  // From telemetry FuelLevel
let raceDuration = 0;      // From SessionInfo.SessionTime
let pitStopTime = 45;      // Default, will be updated based on actual pit times

// Planner state persistence functions
function savePlannerState() {
  if (!window.storageManager) {
    console.warn('Planner: StorageManager not available');
    return;
  }
  
  const stateToSave = {
    stintData,
    currentStintNumber,
    raceTimeRemaining,
    nextPitStop,
    stintDuration,
    lapsPerStint,
    totalLapsCompleted,
    isPitting,
    isRaceRunning,
    pitStartTime,
    pitDurations,
    lastPitTimeChecked,
    lastSessionTimeRemain,
    sessionTimeRemainHistory,
    fuelPerLap,
    avgLapTime,
    tankCapacity,
    currentFuelLevel,
    raceDuration,
    pitStopTime
  };
  
  window.storageManager.savePlannerState(stateToSave);
}

function loadPlannerState() {
  if (!window.storageManager) {
    console.warn('Planner: StorageManager not available');
    return;
  }
  
  const savedState = window.storageManager.loadPlannerState();
  if (savedState) {
    // Restore state variables
    stintData = savedState.stintData ?? [];
    currentStintNumber = savedState.currentStintNumber ?? 1;
    raceTimeRemaining = savedState.raceTimeRemaining ?? 0;
    nextPitStop = savedState.nextPitStop ?? 0;
    stintDuration = savedState.stintDuration ?? 0;
    lapsPerStint = savedState.lapsPerStint ?? 0;
    totalLapsCompleted = savedState.totalLapsCompleted ?? 0;
    isPitting = savedState.isPitting ?? false;
    isRaceRunning = savedState.isRaceRunning ?? false;
    pitStartTime = savedState.pitStartTime ?? 0;
    pitDurations = savedState.pitDurations ?? [];
    lastPitTimeChecked = savedState.lastPitTimeChecked ?? Date.now();
    lastSessionTimeRemain = savedState.lastSessionTimeRemain ?? null;
    sessionTimeRemainHistory = savedState.sessionTimeRemainHistory ?? [];
    fuelPerLap = savedState.fuelPerLap ?? 0;
    avgLapTime = savedState.avgLapTime ?? 0;
    tankCapacity = savedState.tankCapacity ?? 0;
    currentFuelLevel = savedState.currentFuelLevel ?? 0;
    raceDuration = savedState.raceDuration ?? 0;
    pitStopTime = savedState.pitStopTime ?? 45;
    
    console.log('Planner: Restored state from storage');
    
    // Update UI with restored state
    setTimeout(() => updateUI(), 100);
  }
}

// Auto-save planner state periodically
function setupPlannerAutoSave() {
  // Save every 15 seconds
  setInterval(savePlannerState, 15000);
  
  // Save when page is about to unload
  window.addEventListener('beforeunload', savePlannerState);
  window.addEventListener('pagehide', savePlannerState);
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initPlannerPage);

function initPlannerPage() {
  // Load saved planner state
  loadPlannerState();
  
  // Set up auto-save
  setupPlannerAutoSave();
  
  setupEventListeners();
  setupDataSharing();
  
  // Initialize trend tracking variables
  window.lastFuelPerLap = null;
  window.lastAvgLapTime = null;
  
  // Try to get initial values from telemetryDashboard if available
  if (window.telemetryDashboard) {
    // Get race data
    if (window.telemetryDashboard.getRaceData) {
      const raceData = window.telemetryDashboard.getRaceData();
      
      if (raceData.sessionTime > 0) {
        raceDuration = raceData.sessionTime;
      }
    }
    
    // Get fuel data
    if (window.telemetryDashboard.getFuelData) {
      const fuelData = window.telemetryDashboard.getFuelData();
      
      if (fuelData.maxFuel > 0) {
        tankCapacity = fuelData.maxFuel;
      }
      
      if (fuelData.avgFuelUsed3 > 0) {
        fuelPerLap = fuelData.avgFuelUsed3;
      }
      
      if (fuelData.currentFuelLevel > 0) {
        currentFuelLevel = fuelData.currentFuelLevel;
      }
    }
    
    // Get lap time data
    if (window.telemetryDashboard.getLapTimeData) {
      const lapData = window.telemetryDashboard.getLapTimeData();
      
      if (lapData.avgLapTime > 0) {
        avgLapTime = lapData.avgLapTime;
      }
    }
  } else {
    // Start with default values if no telemetry data is available
    tankCapacity = 104;  // Default fuel tank capacity in liters
    fuelPerLap = 2.8;    // Default fuel consumption per lap
    avgLapTime = 90;     // Default lap time in seconds
    raceDuration = 3600; // Default race duration (1 hour)
  }
  
  // Create initial stint plan with default values
  calculateStintPlan();
  updateUI();
  
  // Log initial setup
  console.log("Endurance Planner initialized with values from telemetry");
}

function setupEventListeners() {
  // Listen for telemetry data
  socket.on('telemetry', handleTelemetryData);
  
  // Listen for session info updates
  socket.on('sessionUpdate', handleSessionUpdate);
}

function setupDataSharing() {
  // Since we're directly accessing variables from telemetry.js, we don't need to set up our own
  // data structure. This function exists mostly for future expansion.
  
  // However, we can expose some of our variables for other files to use if needed
  window.endurancePlanner = {
    stintData: stintData,
    getCurrentStint: () => currentStintNumber,
    getNextPitTime: () => nextPitStop,
    getLapsPerStint: () => lapsPerStint,
    getStintDuration: () => stintDuration,
    isPitting: () => isPitting,
    getSafetyMargin: () => 5 // Fixed 5% safety margin
  };
  
  // Log data sharing setup
  console.log("Endurance planner data sharing initialized");
}

function handleSessionUpdate(sessionInfo) {
  // Extract tank capacity from session info if available
  if (sessionInfo && sessionInfo.DriverInfo && sessionInfo.DriverInfo.DriverCarFuelMaxLtr) {
    tankCapacity = sessionInfo.DriverInfo.DriverCarFuelMaxLtr;
    console.log(`Updated tank capacity: ${tankCapacity}L`);
  }
  
  // Extract race duration from session info
  if (sessionInfo && sessionInfo.SessionInfo && sessionInfo.SessionInfo.Sessions) {
    const currentSession = sessionInfo.SessionInfo.Sessions.find(s => s.SessionNum === sessionInfo.SessionNum);
    if (currentSession && currentSession.SessionTime) {
      raceDuration = currentSession.SessionTime;
      console.log(`Updated race duration: ${formatTime(raceDuration)}`);
    }
  }
  
  // Recalculate stint plan with new session info
  calculateStintPlan();
  updateUI();
}

function handleTelemetryData(data) {
  // Update our page refresh rate display
  updateRefreshRate();

  // Extract the values we need from telemetry
  const values = data?.values;
  if (!values) return;
  
  // Try to get data from telemetryDashboard first
  if (window.telemetryDashboard) {
    // Get race data
    const raceData = window.telemetryDashboard.getRaceData();
    if (raceData) {
      raceTimeRemaining = raceData.raceTimeRemaining;
      isRaceRunning = raceData.isRaceRunning;
      
      if (raceData.currentLap > 0) {
        totalLapsCompleted = raceData.currentLap;
      }
    }
    
    // Get fuel data
    const fuelData = window.telemetryDashboard.getFuelData();
    if (fuelData) {
      if (fuelData.currentFuelLevel > 0) {
        currentFuelLevel = fuelData.currentFuelLevel;
      }
      
      if (fuelData.maxFuel > 0) {
        tankCapacity = fuelData.maxFuel;
      }
      
      if (fuelData.avgFuelUsed3 > 0) {
        fuelPerLap = fuelData.avgFuelUsed3;
      }
    }
    
    // Get lap time data
    const lapData = window.telemetryDashboard.getLapTimeData();
    if (lapData && lapData.avgLapTime > 0) {
      avgLapTime = lapData.avgLapTime;
    }
  }
  
  // Extract race time remaining directly if not available from telemetryDashboard
  if (raceTimeRemaining <= 0 && values.SessionTimeRemain > 0) {
    raceTimeRemaining = values.SessionTimeRemain;
  }
  
  // Extract lap info directly if not available from telemetryDashboard
  if (totalLapsCompleted <= 0 && values.LapCompleted > 0) {
    totalLapsCompleted = values.LapCompleted;
  }
  
  // Extract pit road status
  const playerCarIdx = values.PlayerCarIdx;
  const onPitRoad = values.CarIdxOnPitRoad && values.CarIdxOnPitRoad[playerCarIdx];
  
  // Track pit stop duration
  const now = Date.now();
  if (onPitRoad && !isPitting) {
    // Pit entry detected
    isPitting = true;
    pitStartTime = now;
  } else if (!onPitRoad && isPitting) {
    // Pit exit detected
    isPitting = false;
    const pitDuration = (now - pitStartTime) / 1000; // convert to seconds
    
    // Only consider reasonable pit times (between 10 seconds and 5 minutes)
    if (pitDuration > 10 && pitDuration < 300) {
      pitDurations.push(pitDuration);
      
      // Keep only recent pit stops (last 10)
      if (pitDurations.length > 10) {
        pitDurations.shift();
      }
      
      // Update average pit stop time
      if (pitDurations.length > 0) {
        pitStopTime = pitDurations.reduce((sum, time) => sum + time, 0) / pitDurations.length;
      }
    }
    
    // Increment stint number after pit exit
    currentStintNumber++;
  }
  
  // Recalculate stint plan if values have changed significantly
  calculateStintPlan();
  
  // Update the UI with new values
  updateUI();
}

// Helper functions to access data calculated in other files
// These functions access the variables directly from telemetry.js
function getFuelPerLapFromTelemetry(data) {
  // First, try to use the exported data from telemetryDashboard
  if (window.telemetryDashboard && window.telemetryDashboard.getFuelData) {
    const fuelData = window.telemetryDashboard.getFuelData();
    
    // Use avgFuelUsed3 if available
    if (fuelData.avgFuelUsed3 > 0) {
      return fuelData.avgFuelUsed3;
    }
    
    // Otherwise calculate from fuelUsageHistory if available
    if (fuelData.fuelUsageHistory && fuelData.fuelUsageHistory.length > 0) {
      const numLaps = Math.min(fuelData.fuelUsageHistory.length, 3);
      const recentFuel = fuelData.fuelUsageHistory.slice(-numLaps);
      return recentFuel.reduce((sum, val) => sum + val, 0) / numLaps;
    }
    
    // Also update the current fuel level
    if (fuelData.currentFuelLevel > 0) {
      currentFuelLevel = fuelData.currentFuelLevel;
    }
  }
  
  // If no data is available from telemetryDashboard, calculate from the current telemetry packet
  const values = data?.values;
  if (values && values.FuelLevel) {
    currentFuelLevel = values.FuelLevel;
    
    // If we have fuelAtLapStart, calculate fuel usage
    if (typeof window.fuelAtLapStart !== 'undefined' && window.fuelAtLapStart !== null) {
      const fuelUsed = window.fuelAtLapStart - values.FuelLevel;
      if (fuelUsed > 0 && fuelUsed < 10) { // Sanity check
        return fuelUsed;
      }
    }
  }
  
  // Fall back to a reasonable default
  return 2.8; // Default fuel per lap (L)
}

function getAvgLapTimeFromTelemetry(data) {
  // First, try to use the exported data from telemetryDashboard
  if (window.telemetryDashboard && window.telemetryDashboard.getLapTimeData) {
    const lapData = window.telemetryDashboard.getLapTimeData();
    
    // Use avgLapTime if available
    if (lapData.avgLapTime > 0) {
      return lapData.avgLapTime;
    }
    
    // Otherwise calculate from lapTimeHistory if available
    if (lapData.lapTimeHistory && lapData.lapTimeHistory.length > 0) {
      const numLaps = Math.min(lapData.lapTimeHistory.length, 3);
      const recentLaps = lapData.lapTimeHistory.slice(-numLaps);
      return recentLaps.reduce((sum, val) => sum + val, 0) / numLaps;
    }
  }
  
  // If no lap time data is available, calculate from the current telemetry packet
  // For now, we just fall back to a reasonable default
  return 90; // Default lap time (seconds)
}

// This function formats time from seconds into HH:MM:SS format
function formatTime(totalSeconds) {
  if (totalSeconds === undefined || totalSeconds === null) return "--:--:--";
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// Calculate the stint plan based on current values
function calculateStintPlan() {
  // Don't calculate if we don't have valid data yet
  if (fuelPerLap <= 0 || avgLapTime <= 0 || tankCapacity <= 0) {
    // Set some reasonable defaults if we don't have real data
    fuelPerLap = fuelPerLap || 2.8;
    avgLapTime = avgLapTime || 90;
    tankCapacity = tankCapacity || 104;
  }
  
  // Clear previous stint data
  stintData = [];
  
  // Use a 5% safety margin (same as default in static planner)
  const safetyMargin = 5; // 5% safety margin
  
  // Calculate basic stint values
  const fuelPerStint = tankCapacity * (1 - (safetyMargin / 100)); // Using 95% of tank capacity (leave 5% margin)
  lapsPerStint = Math.floor(fuelPerStint / fuelPerLap);
  stintDuration = lapsPerStint * avgLapTime;
  
  // Use the race time remaining if available, otherwise use a default
  const estimatedRaceDuration = raceTimeRemaining > 0 ? raceTimeRemaining : 3600;
  
  // Calculate total number of stints needed
  const raceLaps = Math.ceil(estimatedRaceDuration / avgLapTime);
  const totalStints = Math.ceil(raceLaps / lapsPerStint);
  
  // Determine current race progress based on telemetry
  let raceElapsedTime = 0;
  if (isRaceRunning && sessionTimeRemainHistory.length >= 2) {
    // If we know the race duration and remaining time
    const totalRaceDuration = estimatedRaceDuration; // This would ideally come from session info
    raceElapsedTime = totalRaceDuration - raceTimeRemaining;
  }
  
  // Generate stint data starting from current race state
  let currentTime = raceElapsedTime;
  
  // Account for current stint progress
  let stintOffset = 0;
  if (currentStintNumber > 1) {
    stintOffset = currentStintNumber - 1;
  }
  
  // Calculate fuel remaining in current stint
  let currentStintFuelRemaining = 0;
  if (currentFuelLevel > 0) {
    currentStintFuelRemaining = currentFuelLevel;
  }
  
  // Calculate laps remaining in current stint
  const currentStintLapsRemaining = Math.floor(currentStintFuelRemaining / fuelPerLap);
  
  // Calculate time remaining in current stint
  const currentStintTimeRemaining = currentStintLapsRemaining * avgLapTime;
  
  // Generate stint data for remaining race
  for (let i = currentStintNumber; i <= totalStints + stintOffset; i++) {
    // For current stint, use actual remaining time and fuel
    let stintStartTime = currentTime;
    let stintEndTime, actualStintDuration, actualLaps, fuelUsed;
    
    if (i === currentStintNumber && currentStintTimeRemaining > 0) {
      // Current active stint
      stintEndTime = stintStartTime + currentStintTimeRemaining;
      actualStintDuration = currentStintTimeRemaining;
      actualLaps = currentStintLapsRemaining;
      fuelUsed = currentStintFuelRemaining;
    } else {
      // Future stints
      stintEndTime = Math.min(stintStartTime + stintDuration, estimatedRaceDuration);
      actualStintDuration = stintEndTime - stintStartTime;
      actualLaps = Math.floor(actualStintDuration / avgLapTime);
      fuelUsed = actualLaps * fuelPerLap;
    }
    
    // Add to stint data if there's any time in this stint
    if (actualStintDuration > 0) {
      stintData.push({
        stintNumber: i,
        startTime: stintStartTime,
        endTime: stintEndTime,
        stintDuration: actualStintDuration,
        laps: actualLaps,
        fuel: typeof fuelUsed === 'number' ? fuelUsed.toFixed(2) + ' L' : fuelUsed
      });
      
      currentTime = stintEndTime;
      
      // Add pit stop after stint (except for the last stint)
      if (currentTime < estimatedRaceDuration && i < totalStints + stintOffset) {
        const pitStartTime = currentTime;
        const pitEndTime = pitStartTime + pitStopTime;
        
        stintData.push({
          stintNumber: `PIT ${i}`,
          startTime: pitStartTime,
          endTime: pitEndTime,
          stintDuration: pitStopTime,
          laps: "—",
          fuel: "Refueling"
        });
        
        currentTime = pitEndTime;
      }
    }
    
    // If we've reached race duration, stop adding stints
    if (currentTime >= estimatedRaceDuration) break;
  }
  
  // Calculate next pit stop time
  if (stintData.length > 0) {
    // Find the next pit stop
    const currentStintIndex = stintData.findIndex(stint => 
      !String(stint.stintNumber).startsWith('PIT') && 
      stint.stintNumber === currentStintNumber
    );
    
    if (currentStintIndex !== -1 && currentStintIndex < stintData.length - 1) {
      // Next pit stop is the end time of the current stint
      nextPitStop = stintData[currentStintIndex].endTime - raceElapsedTime;
    } else {
      // No more pit stops
      nextPitStop = 0;
    }
  } else {
    nextPitStop = 0;
  }
  
  // Save state after calculation
  savePlannerState();
}

// Update the UI with current values
function updateUI() {
  // Update race info
  document.getElementById('countdown-timer').textContent = formatTime(raceTimeRemaining);
  document.getElementById('next-pitstop-time').textContent = formatTime(nextPitStop);
  document.getElementById('current-stint-display').textContent = currentStintNumber;
  document.getElementById('live-stint-duration-display').textContent = formatTime(stintDuration);
  document.getElementById('live-laps-per-stint-display').textContent = lapsPerStint;
  document.getElementById('live-pit-stops-display').textContent = Math.max(0, stintData.filter(s => String(s.stintNumber).startsWith('PIT')).length);
  
  // Update calculation variables
  document.getElementById('fuel-per-lap').textContent = fuelPerLap.toFixed(2) + " L";
  document.getElementById('avg-lap-time').textContent = formatTime(avgLapTime);
  document.getElementById('max-fuel').textContent = tankCapacity.toFixed(1) + " L";
  document.getElementById('current-fuel').textContent = currentFuelLevel.toFixed(1) + " L";
  document.getElementById('pit-stop-time').textContent = formatTime(pitStopTime);
  document.getElementById('safety-margin-display').textContent = "5% (" + (tankCapacity * 0.05).toFixed(1) + " L)";
  
  // Update additional info if available from telemetryDashboard
  if (window.telemetryDashboard) {
    if (window.telemetryDashboard.getRaceData) {
      const raceData = window.telemetryDashboard.getRaceData();
      if (raceData.sessionType) {
        document.getElementById('session-type').textContent = raceData.sessionType;
      }
      if (raceData.trackName) {
        document.getElementById('track-name').textContent = raceData.trackName;
      }
    }
    
    if (window.telemetryDashboard.getDriverData) {
      const driverData = window.telemetryDashboard.getDriverData();
      if (driverData.driverName) {
        document.getElementById('driver-name').textContent = driverData.driverName;
      }
    }
  }
  
  // Update trend indicators for fuel and lap time
  updateTrendIndicator('fuel-trend', window.lastFuelPerLap, fuelPerLap);
  updateTrendIndicator('laptime-trend', window.lastAvgLapTime, avgLapTime);
  
  // Store current values for next trend calculation
  window.lastFuelPerLap = fuelPerLap;
  window.lastAvgLapTime = avgLapTime;

  // Update stint table
  const tbody = document.getElementById('live-stint-table-body');
  tbody.innerHTML = '';
  
  if (stintData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No stint data available</td></tr>';
  } else {
    stintData.forEach(stint => {
      const stintRow = document.createElement('tr');
      const isPitRow = String(stint.stintNumber).startsWith('PIT');

      // Apply appropriate classes based on stint type and status
      if (isPitRow) {
        stintRow.classList.add('pit-row');
        if (isPitting && stint.stintNumber === `PIT ${currentStintNumber}`) {
          stintRow.classList.add('current-pit');
        }
      } else {
        stintRow.classList.add('stint-row');
        if (!isPitting && stint.stintNumber === currentStintNumber) {
          stintRow.classList.add('current-stint');
        }
      }

      stintRow.innerHTML = `
          <td>${stint.stintNumber}</td>
          <td>${formatTime(stint.startTime)}</td>
          <td>${formatTime(stint.endTime)}</td>
          <td>${formatTime(stint.stintDuration)}</td>
          <td>${stint.laps}</td>
          <td>${stint.fuel}</td>
      `;
      tbody.appendChild(stintRow);
    });
  }
  
  // Save state after UI update
  savePlannerState();
}

// Update the refresh rate display (copied from other pages for consistency)
let lastTelemetryTime = null;
function updateRefreshRate() {
  const now = Date.now();
  const refreshRateDisplay = document.getElementById('refreshRate');
  
  if (lastTelemetryTime && refreshRateDisplay) {
    const interval = now - lastTelemetryTime;
    const hz = (1000 / interval).toFixed(1);
    refreshRateDisplay.textContent = `Refresh Rate: ${hz} Hz (${interval} ms)`;
  }
  
  lastTelemetryTime = now;
}

// Function to update trend indicators (up, down, stable)
function updateTrendIndicator(elementId, previousValue, currentValue) {
  const element = document.getElementById(elementId);
  if (!element || previousValue === undefined || currentValue === undefined) {
    return;
  }
  
  // Remove existing classes
  element.classList.remove('trend-up', 'trend-down', 'trend-stable');
  
  // Determine trend direction
  const difference = currentValue - previousValue;
  const threshold = (previousValue * 0.02); // 2% change threshold
  
  if (Math.abs(difference) < threshold) {
    // Stable
    element.innerHTML = "━";
    element.classList.add('trend-stable');
    element.title = "Value is stable";
  } else if (difference > 0) {
    // Increasing (showing up arrow)
    element.innerHTML = "▲";
    element.classList.add('trend-up');
    element.title = `Increased by ${Math.abs(difference).toFixed(2)}`;
  } else {
    // Decreasing (showing down arrow)
    element.innerHTML = "▼";
    element.classList.add('trend-down');
    element.title = `Decreased by ${Math.abs(difference).toFixed(2)}`;
  }
}
