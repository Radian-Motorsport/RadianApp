// telemetry.js - Handles all telemetry data processing and display updates
// VERSION: 2025-10-25-fuel-fix v4 (Built: 2025-10-25T14:30:00Z)
console.log('%c 📊 TELEMETRY.JS LOADED - Fuel Fix v4 - Built 14:30 UTC', 'background: #2a2a2a; color: #00ff00; font-weight: bold; padding: 8px; border-radius: 4px;');
console.log('If you see this message, telemetry.js is the LATEST version');

// Socket.io connection to production server
const socket = io('https://radianapp.onrender.com');

// Make socket globally accessible immediately
window.socket = socket;

// Add immediate socket connection debugging
socket.on('connect', () => {
  console.log('🔗 SOCKET CONNECTED to server!');
  console.log('🔗 Socket ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ SOCKET DISCONNECTED from server!');
});

socket.on('connect_error', (error) => {
  console.error('❌ SOCKET CONNECTION ERROR:', error);
});

// Test if we're receiving ANY events from server
socket.onAny((eventName, ...args) => {
  console.log(`📡 RECEIVED EVENT: ${eventName}`, args);
});

// Add a simple test listener
socket.on('sessionInfo', (data) => {
  console.log('🚨 BASIC sessionInfo listener triggered!', data);
});

// Make elements globally accessible and ensure it's always an object
window.elements = window.elements || {};
let elements = window.elements;

// State Variables - Initialize with default values
let lastLapCompleted = -1;
let fuelAtLapStart = null;
let fuelUsageHistory = [];
let lapTimeHistory = [];
let lastLapStartTime = null;
let currentLap = 0;
let lastTeamLap = null;
let bufferedData = null;
let lapEntryPoint = null;
let bufferFrozen = true;
let driverWasOnTrack = false;
let lastTelemetryTime = null;
let stintStartTime = null;
let lastPitStopTimeValue = null;
let lastSessionId = null;
let lastSessionDate = new Date().toDateString();
let tankCapacity = 104; // Default tank capacity in liters
let avgFuelPerLap = 0; // Average fuel used per lap
let wasPitstopActive = false; // Track previous pit stop state

// Stint duration tracking (global for use across pages)
let lastStintStartSessionTime = null; // Track when current stint started using SessionTimeRemain
let actualStintDuration = 0; // Last completed stint duration in seconds
let stintDurations = []; // History of actual stint durations

// Stint lap count tracking (global for use across pages)
let lastStintStartLap = null; // Track lap number when current stint started
let actualStintLapCount = 0; // Last completed stint lap count
let stintLapCounts = []; // History of actual stint lap counts

// Stint fuel tracking
let fuelAtStintStart = null; // Fuel level when stint started
let actualStintFuelUsed = 0; // Last completed stint fuel usage

// Previous value tracking for color coding
let previousValues = {
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
  stintAvgLapTime: null,
  lastStintTireWear: null
};
let stintIncidentCount = 0;

// Server sync flag to prevent loops
let isSyncingFromServer = false;

// Telemetry state persistence functions
function saveTelemetryState() {
  if (!window.storageManager) {
    console.warn('Telemetry: StorageManager not available');
    return;
  }
  
  const stateToSave = {
    lastLapCompleted,
    // DO NOT save fuelAtLapStart - it's a live tracking variable
    // fuelAtLapStart,
    fuelUsageHistory,
    lapTimeHistory,
    lastLapStartTime,
    currentLap,
    lastTeamLap,
    bufferedData,
    lapEntryPoint,
    bufferFrozen,
    driverWasOnTrack,
    lastTelemetryTime,
    stintStartTime,
    lastPitStopTimeValue,
    lastSessionId,
    lastSessionDate,
    previousValues,
    stintIncidentCount,
    wasPitstopActive,
    lastStintStartSessionTime,
    actualStintDuration,
    stintDurations,
    lastStintStartLap,
    actualStintLapCount,
    stintLapCounts,
    fuelAtStintStart,
    actualStintFuelUsed
  };
  
  window.storageManager.saveTelemetryState(stateToSave);
}

function loadTelemetryState() {
  if (!window.storageManager) {
    console.warn('Telemetry: StorageManager not available');
    return;
  }
  
  const savedState = window.storageManager.loadTelemetryState();
  if (savedState) {
    // Restore state variables
    lastLapCompleted = savedState.lastLapCompleted ?? -1;
    // DO NOT restore fuelAtLapStart - it should only be set when a new lap starts
    // fuelAtLapStart = savedState.fuelAtLapStart ?? null;
    fuelUsageHistory = savedState.fuelUsageHistory ?? [];
    lapTimeHistory = savedState.lapTimeHistory ?? [];
    lastLapStartTime = savedState.lastLapStartTime ?? null;
    currentLap = savedState.currentLap ?? 0;
    lastTeamLap = savedState.lastTeamLap ?? null;
    bufferedData = savedState.bufferedData ?? null;
    lapEntryPoint = savedState.lapEntryPoint ?? null;
    bufferFrozen = savedState.bufferFrozen ?? true;
    driverWasOnTrack = savedState.driverWasOnTrack ?? false;
    lastTelemetryTime = savedState.lastTelemetryTime ?? null;
    stintStartTime = savedState.stintStartTime ?? null;
    lastPitStopTimeValue = savedState.lastPitStopTimeValue ?? null;
    lastSessionId = savedState.lastSessionId ?? null;
    lastSessionDate = savedState.lastSessionDate ?? new Date().toDateString();
    previousValues = savedState.previousValues ?? {
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
      stintAvgLapTime: null,
      lastStintTireWear: null
    };
    stintIncidentCount = savedState.stintIncidentCount ?? 0;
    wasPitstopActive = savedState.wasPitstopActive ?? false;
    lastStintStartSessionTime = savedState.lastStintStartSessionTime ?? null;
    actualStintDuration = savedState.actualStintDuration ?? 0;
    stintDurations = savedState.stintDurations ?? [];
    lastStintStartLap = savedState.lastStintStartLap ?? null;
    actualStintLapCount = savedState.actualStintLapCount ?? 0;
    stintLapCounts = savedState.stintLapCounts ?? [];
    fuelAtStintStart = savedState.fuelAtStintStart ?? null;
    actualStintFuelUsed = savedState.actualStintFuelUsed ?? 0;
    
    console.log('Telemetry: Restored state from storage');
    
    // Update UI with restored state
    setTimeout(() => updateUIFromState(), 100);
  }
}

// Auto-save telemetry state periodically
function setupTelemetryAutoSave() {
  // Save every 10 seconds
  setInterval(saveTelemetryState, 10000);
  
  // Save when page is about to unload
  window.addEventListener('beforeunload', saveTelemetryState);
  window.addEventListener('pagehide', saveTelemetryState);
}

// Functions to handle server state synchronization
function syncToServer() {
  // Only sync if not currently receiving updates from server
  if (isSyncingFromServer) return;
  
  // Create state object
  const stateToSync = {
    lastLapCompleted,
    // DO NOT sync fuelAtLapStart - it's a live tracking variable
    // fuelAtLapStart,
    fuelUsageHistory,
    lapTimeHistory,
    lastLapStartTime,
    currentLap,
    lastTeamLap,
    // Don't sync bufferedData as it's too large
    lapEntryPoint,
    bufferFrozen,
    driverWasOnTrack,
    lastTelemetryTime,
    stintStartTime,
    lastPitStopTimeValue,
    previousValues,
    stintIncidentCount,
    lastSessionId,
    lastSessionDate
  };
  
  // Send to server
  socket.emit('updateTelemetryState', stateToSync);
  
  // Also save to localStorage
  saveTelemetryState();
}

function applyServerState(serverState) {
  // Set syncing flag to prevent loopback
  isSyncingFromServer = true;
  
  // Apply state from server
  lastLapCompleted = serverState.lastLapCompleted;
  // DO NOT restore fuelAtLapStart - it should only be set when a new lap starts
  // fuelAtLapStart = serverState.fuelAtLapStart;
  fuelUsageHistory = serverState.fuelUsageHistory;
  lapTimeHistory = serverState.lapTimeHistory;
  lastLapStartTime = serverState.lastLapStartTime;
  currentLap = serverState.currentLap;
  lastTeamLap = serverState.lastTeamLap;
  // Don't sync bufferedData as it's handled by realtime updates
  lapEntryPoint = serverState.lapEntryPoint;
  bufferFrozen = serverState.bufferFrozen;
  driverWasOnTrack = serverState.driverWasOnTrack;
  lastTelemetryTime = serverState.lastTelemetryTime;
  stintStartTime = serverState.stintStartTime;
  lastPitStopTimeValue = serverState.lastPitStopTimeValue;
  previousValues = serverState.previousValues;
  stintIncidentCount = serverState.stintIncidentCount;
  lastSessionId = serverState.lastSessionId;
  lastSessionDate = serverState.lastSessionDate;
  
  // Global stint tracking variables
  if (serverState.wasPitstopActive !== undefined) wasPitstopActive = serverState.wasPitstopActive;
  if (serverState.lastStintStartSessionTime !== undefined) lastStintStartSessionTime = serverState.lastStintStartSessionTime;
  if (serverState.actualStintDuration !== undefined) actualStintDuration = serverState.actualStintDuration;
  if (serverState.stintDurations !== undefined) stintDurations = serverState.stintDurations;
  if (serverState.lastStintStartLap !== undefined) lastStintStartLap = serverState.lastStintStartLap;
  if (serverState.actualStintLapCount !== undefined) actualStintLapCount = serverState.actualStintLapCount;
  if (serverState.stintLapCounts !== undefined) stintLapCounts = serverState.stintLapCounts;
  if (serverState.fuelAtStintStart !== undefined) fuelAtStintStart = serverState.fuelAtStintStart;
  if (serverState.actualStintFuelUsed !== undefined) actualStintFuelUsed = serverState.actualStintFuelUsed;
  
  // Update UI with new state
  updateUIFromState();
  
  // Reset syncing flag
  setTimeout(() => {
    isSyncingFromServer = false;
  }, 100);
}

// Function to update UI elements from state
function updateUIFromState() {
  // Update fuel stats
  if (elements.fuelPerLap && previousValues.fuelPerLap !== null && previousValues.fuelPerLap !== undefined) {
    updateValueWithColor(elements.fuelPerLap, `${previousValues.fuelPerLap?.toFixed(2) ?? '--'} L`, previousValues.fuelPerLap, 'fuel', 'fuelPerLap');
  }
  
  if (elements.fuelAvg && previousValues.fuelAvg !== null && previousValues.fuelAvg !== undefined) {
    updateValueWithColor(elements.fuelAvg, `${previousValues.fuelAvg?.toFixed(2) ?? '--'} L`, previousValues.fuelAvg, 'fuel', 'fuelAvg');
    console.log('Restored fuelAvg from state:', previousValues.fuelAvg);
  } else {
    console.log('fuelAvg not restored - element exists:', !!elements.fuelAvg, 'value:', previousValues.fuelAvg);
  }
  
  if (elements.fuelAvg5 && previousValues.fuelAvg5 !== null && previousValues.fuelAvg5 !== undefined) {
    updateValueWithColor(elements.fuelAvg5, `${previousValues.fuelAvg5?.toFixed(2) ?? '--'} L`, previousValues.fuelAvg5, 'fuel', 'fuelAvg5');
  }
  
  // Update lap times
  if (elements.lastLapTime && previousValues.lastLapTime !== null && previousValues.lastLapTime !== undefined) {
    updateValueWithColor(elements.lastLapTime, formatTimeMS(previousValues.lastLapTime), previousValues.lastLapTime, 'lapTime', 'lastLapTime');
  }
  
  if (elements.lapAvg3 && previousValues.lapAvg3 !== null && previousValues.lapAvg3 !== undefined) {
    updateValueWithColor(elements.lapAvg3, formatTimeMS(previousValues.lapAvg3), previousValues.lapAvg3, 'lapTime', 'lapAvg3');
  }
  
  if (elements.lapAvg5 && previousValues.lapAvg5 !== null && previousValues.lapAvg5 !== undefined) {
    updateValueWithColor(elements.lapAvg5, formatTimeMS(previousValues.lapAvg5), previousValues.lapAvg5, 'lapTime', 'lapAvg5');
  }
  
  // Update projected values
  if (elements.fuelProjectedLaps && previousValues.projectedLaps !== null && previousValues.projectedLaps !== undefined) {
    updateValueWithColor(elements.fuelProjectedLaps, `${previousValues.projectedLaps?.toFixed(2) ?? '--'}`, previousValues.projectedLaps, 'projection');
  }
  
  if (elements.fuelProjectedTime && previousValues.projectedTime !== null && previousValues.projectedTime !== undefined) {
    updateValueWithColor(elements.fuelProjectedTime, formatTimeMS(previousValues.projectedTime), previousValues.projectedTime, 'projection');
  }
  
  // Update stint values
  if (elements.stintLapCount && previousValues.stintLapCount !== null && previousValues.stintLapCount !== undefined) {
    elements.stintLapCount.textContent = previousValues.stintLapCount?.toString() ?? '--';
    console.log('Updated stintLapCount:', previousValues.stintLapCount);
  }
  
  if (elements.stintFuelAvg && previousValues.stintFuelAvg !== null && previousValues.stintFuelAvg !== undefined) {
    elements.stintFuelAvg.textContent = `${previousValues.stintFuelAvg?.toFixed(2) ?? '--'} L`;
    console.log('Updated stintFuelAvg:', previousValues.stintFuelAvg);
  }
  
  if (elements.stintTotalTime && previousValues.stintTotalTime !== null && previousValues.stintTotalTime !== undefined) {
    elements.stintTotalTime.textContent = formatTimeHMS(previousValues.stintTotalTime);
    console.log('Updated stintTotalTime:', previousValues.stintTotalTime);
  }
  
  if (elements.stintAvgLapTime && previousValues.stintAvgLapTime !== null && previousValues.stintAvgLapTime !== undefined) {
    elements.stintAvgLapTime.textContent = formatTimeMS(previousValues.stintAvgLapTime);
    console.log('Updated stintAvgLapTime:', previousValues.stintAvgLapTime);
  }
  
  // Update tire wear from last stint
  if (previousValues.lastStintTireWear !== null && previousValues.lastStintTireWear !== undefined) {
    updateTireWear(previousValues.lastStintTireWear);
    console.log('Updated tire wear from last stint');
  }
  
  // Update last pit stop time
  if (elements.lastPitStopTime && lastPitStopTimeValue !== null && lastPitStopTimeValue !== undefined) {
    elements.lastPitStopTime.textContent = lastPitStopTimeValue;
  }
  
  // Update buffer status
  if (elements.bufferStatus) {
    if (bufferFrozen && !driverWasOnTrack) {
      elements.bufferStatus.textContent = 'Waiting for driver…';
    } else if (bufferFrozen && driverWasOnTrack) {
      elements.bufferStatus.textContent = 'Waiting for next lap…';
    } else {
      elements.bufferStatus.textContent = 'Live telemetry';
    }
  }
}

const MIN_LAPS_FOR_VALID_DATA = 2;

// Initialize dashboard elements
function initDashboard() {
  // Cache DOM elements for better performance
  elements = {
    refreshRate: document.getElementById('refreshRate'),
  // Coasting/overlap moved to Inputs page
    streamingStatus: document.getElementById('streamingStatus'),
    fuelPerLap: document.getElementById('fuelPerLap'),
    fuelAvg: document.getElementById('fuelAvg'),
    fuelAvg5: document.getElementById('fuelAvg5'),
    lastLapTime: document.getElementById('lastLapTime'),
    lapAvg3: document.getElementById('lapAvg3'),
    lapAvg5: document.getElementById('lapAvg5'),
    fuelProjectedLaps: document.getElementById('fuelProjectedLaps'),
    fuelProjectedTime: document.getElementById('fuelProjectedTime'),
    fuelGauge: document.getElementById('fuelGauge'),
    fuelValue: document.getElementById('fuelValue'),
    teamLapDisplay: document.getElementById('teamLapDisplay'),
    bufferStatus: document.getElementById('bufferStatus'),
    stintLapCount: document.getElementById('stintLapCount'),
    stintFuelAvg: document.getElementById('stintFuelAvg'),
    stintTotalTime: document.getElementById('stintTotalTime'),
    stintAvgLapTime: document.getElementById('stintAvgLapTime'),
    lastPitStopTime: document.getElementById('lastPitStopTime'),
    stintIncidents: document.getElementById('stintIncidents'),
    // Tire elements
    tireRF: document.getElementById('tireRF'),
    tireLF: document.getElementById('tireLF'),
    tireRR: document.getElementById('tireRR'),
    tireLR: document.getElementById('tireLR'),
    panel: document.getElementById('fuelGaugeContainer'),
    // Weather elements
    trackTemp: document.getElementById('TrackTemp'),
    airTemp: document.getElementById('AirTemp'),
    airDensity: document.getElementById('AirDensity'),
    airPressure: document.getElementById('AirPressure'),
    windVel: document.getElementById('WindVel'),
    windDir: document.getElementById('WindDir'),
    skies: document.getElementById('Skies'),
    relativeHumidity: document.getElementById('RelativeHumidity'),
    precipitation: document.getElementById('Precipitation'),
    trackWetness: document.getElementById('TrackWetness'),
    fogLevel: document.getElementById('FogLevel')
  };

  // Set up socket listeners
  setupSocketListeners();
  
  // Load saved telemetry state
  loadTelemetryState();
  
  // Set up auto-save
  setupTelemetryAutoSave();
}

// Update fuel gauge display
function updateFuelGauge(level) {
  if (!elements.fuelGauge || !elements.fuelValue) return;
  
  // level is the absolute fuel amount in liters (from FuelLevel)
  // Calculate percentage for the progress bar
  const fuelPercentage = tankCapacity > 0 ? (level / tankCapacity) * 100 : 0;
  const constrainedPercentage = Math.min(100, Math.max(0, fuelPercentage));
  
  elements.fuelGauge.value = constrainedPercentage;
  elements.fuelValue.textContent = `${level.toFixed(1)} L`;
}

// Update weather data display (only for non-weather pages)
function updateWeatherData(values) {
  if (!values) return;

  // Check if we're on the weather page - if so, let weather.js handle updates
  if (typeof window.weatherPageUpdateWeatherData === 'function') {
    window.weatherPageUpdateWeatherData(values);
    return;
  }

  // Temperature & Pressure
  if (elements.trackTemp) elements.trackTemp.textContent = values.TrackTemp ? `${values.TrackTemp.toFixed(1)}°C` : '--';
  if (elements.airTemp) elements.airTemp.textContent = values.AirTemp ? `${values.AirTemp.toFixed(1)}°C` : '--';
  if (elements.airDensity) elements.airDensity.textContent = values.AirDensity ? `${values.AirDensity.toFixed(3)} kg/m³` : '--';
  if (elements.airPressure) elements.airPressure.textContent = values.AirPressure ? `${(values.AirPressure / 1000).toFixed(1)} mbar` : '--';

  // Wind & Weather Conditions
  if (elements.windVel) elements.windVel.textContent = values.WindVel ? `${(values.WindVel * 3.6).toFixed(1)} kph` : '--';
  if (elements.windDir) elements.windDir.textContent = values.WindDir ? `${values.WindDir.toFixed(0)}°` : '--';
  if (elements.skies) {
    const skiesMap = {0: 'Clear', 1: 'Partly Cloudy', 2: 'Mostly Cloudy', 3: 'Overcast'};
    elements.skies.textContent = skiesMap[values.Skies] || '--';
  }

  // Humidity & Precipitation
  if (elements.relativeHumidity) elements.relativeHumidity.textContent = values.RelativeHumidity ? `${(values.RelativeHumidity * 100).toFixed(1)}%` : '--';
  if (elements.precipitation) elements.precipitation.textContent = values.Precipitation ? `${(values.Precipitation * 100).toFixed(1)}%` : '--';
  if (elements.trackWetness) {
    const wetnessMap = {0: 'Dry', 1: 'Mostly Dry', 2: 'Very Lightly Wet', 3: 'Lightly Wet', 4: 'Moderately Wet', 5: 'Very Wet', 6: 'Extremely Wet'};
    elements.trackWetness.textContent = wetnessMap[values.TrackWetness] || '--';
  }
  if (elements.fogLevel) elements.fogLevel.textContent = values.FogLevel ? `${(values.FogLevel * 100).toFixed(1)}%` : '--';
}

// Calculate and display tire wear percentages
function updateTireWear(tireData) {
  if (!tireData) return;
  
  // Update tire wear visuals and values for each tire
  updateTireVisual('RF', tireData.RF);
  updateTireVisual('LF', tireData.LF);
  updateTireVisual('RR', tireData.RR);
  updateTireVisual('LR', tireData.LR);
}

// Update visual representation and values for a single tire
function updateTireVisual(position, tire) {
  if (!tire) return;
  
  // Get percentage values (0-100)
  const leftWear = Math.round(tire.L * 100);
  const middleWear = Math.round(tire.M * 100);
  const rightWear = Math.round(tire.R * 100);
  
  // Update the band colors based on wear percentages
  updateTireBandColor(`tire${position}L`, leftWear);
  updateTireBandColor(`tire${position}M`, middleWear);
  updateTireBandColor(`tire${position}R`, rightWear);
  
  // Update the span with individual values
  const spanElement = elements[`tire${position}`];
  if (spanElement) {
    spanElement.innerHTML = `
      <span class="tire-value">${leftWear}</span>
      <span class="tire-value">${middleWear}</span>
      <span class="tire-value">${rightWear}</span>
    `;
  }
}

// Update a single tire band's color based on wear percentage
// Helper function to update value with color based on context
function updateValueWithColor(element, text, value, type, id) {
  if (!element) return;
  
  // Remove any existing value classes
  element.classList.remove('value-good', 'value-warn', 'value-bad');
  element.textContent = text;
  
  if (value === null || value === undefined) return;
  
  // Default threshold for considering values "the same"
  const THRESHOLD = 0.05; // 5% threshold
  
  if (type === 'projection') {
    // For projections - use fixed thresholds
    if (value > 10) element.classList.add('value-good');       // Lots of laps/time left
    else if (value > 5) element.classList.add('value-warn');   // Getting low
    else element.classList.add('value-bad');                   // Critical
  } 
  else if (id && previousValues[id] !== null) {
    // Compare with previous value
    const prevValue = previousValues[id];
    const percentDiff = Math.abs(value - prevValue) / prevValue;
    
    if (type === 'fuel') {
      // For fuel - lower is better
      if (percentDiff < THRESHOLD) {
        // Values are similar (within threshold)
        element.classList.add('value-warn');
      } else if (value < prevValue) {
        // Using less fuel than before - good
        element.classList.add('value-good');
      } else {
        // Using more fuel than before - bad
        element.classList.add('value-bad');
      }
    } 
    else if (type === 'lapTime') {
      // For lap time - lower is better
      if (percentDiff < THRESHOLD) {
        // Times are similar (within threshold)
        element.classList.add('value-warn');
      } else if (value < prevValue) {
        // Faster lap than before - good
        element.classList.add('value-good');
      } else {
        // Slower lap than before - bad
        element.classList.add('value-bad');
      }
    }
  } else {
    // First value, no comparison possible - use neutral color
    element.classList.add('value-warn');
  }
  
  // Store current value for next comparison
  if (id) {
    previousValues[id] = value;
  }
}

function updateTireBandColor(elementId, wearPercentage) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Remove all existing wear classes
  element.classList.remove(
    'wear-100', 'wear-97', 'wear-95', 'wear-92', 'wear-90', 
    'wear-87', 'wear-85', 'wear-82', 'wear-80', 'wear-77', 
    'wear-60', 'wear-50'
  );
  
  // Set height based on wear percentage (0-100%)
  element.style.height = `${Math.min(100, Math.max(0, wearPercentage))}%`;
  
  // Add the appropriate wear class based on percentage
  if (wearPercentage >= 97.5) element.classList.add('wear-100');
  else if (wearPercentage >= 95) element.classList.add('wear-97');
  else if (wearPercentage >= 92.5) element.classList.add('wear-95');
  else if (wearPercentage >= 90) element.classList.add('wear-92');
  else if (wearPercentage >= 87.5) element.classList.add('wear-90');
  else if (wearPercentage >= 85) element.classList.add('wear-87');
  else if (wearPercentage >= 82.5) element.classList.add('wear-85');
  else if (wearPercentage >= 80) element.classList.add('wear-82');
  else if (wearPercentage >= 77.5) element.classList.add('wear-80');
  else if (wearPercentage >= 75) element.classList.add('wear-77');
  else if (wearPercentage >= 60) element.classList.add('wear-60');
  else element.classList.add('wear-50');
}

// Handle pit stop completion and update tire wear
function handlePitStopCompletion(values) {
  console.log('Pit stop completed - updating tire wear and stint summary data');
  
  // Use the actual stint lap count from global tracking (calculated via OnPitRoad)
  const stintLapCount = actualStintLapCount > 0 ? actualStintLapCount : 0;
  
  // Calculate stint average fuel usage using actual fuel consumed during stint
  const avgFuelUsed = (stintLapCount > 0 && actualStintFuelUsed > 0) 
    ? actualStintFuelUsed / stintLapCount 
    : null;
  
  // Use the actual stint duration from global tracking (calculated via SessionTimeRemain)
  const stintTotalTimeSeconds = actualStintDuration > 0 ? actualStintDuration : null;
  const stintAvgLapTimeSeconds = (stintLapCount > 0 && stintTotalTimeSeconds) 
    ? stintTotalTimeSeconds / stintLapCount 
    : null;
  
  // Store stint values for persistence
  previousValues.stintLapCount = stintLapCount;
  previousValues.stintFuelAvg = avgFuelUsed;
  previousValues.stintTotalTime = stintTotalTimeSeconds;
  previousValues.stintAvgLapTime = stintAvgLapTimeSeconds;
  
  console.log('Stint summary calculations:', {
    stintLapCount,
    avgFuelUsed,
    stintTotalTimeSeconds,
    stintAvgLapTimeSeconds,
    actualStintDuration,
    actualStintFuelUsed
  });
  
  // Update stint summary UI
  if (elements.stintLapCount) elements.stintLapCount.textContent = stintLapCount ?? '--';
  if (elements.stintFuelAvg) elements.stintFuelAvg.textContent = avgFuelUsed ? `${avgFuelUsed.toFixed(2)} L` : '--';
  if (elements.stintTotalTime) elements.stintTotalTime.textContent = stintTotalTimeSeconds ? formatTimeHMS(stintTotalTimeSeconds) : '--:--:--';
  if (elements.stintAvgLapTime) elements.stintAvgLapTime.textContent = stintAvgLapTimeSeconds ? formatTimeMS(stintAvgLapTimeSeconds) : '--:--';
  if (elements.stintIncidents) elements.stintIncidents.textContent = values?.PlayerCarDriverIncidentCount?.toString() ?? '--';
  
  // Display tire wear from the previous stint (stored when entering pit road)
  if (previousValues.lastStintTireWear) {
    updateTireWear(previousValues.lastStintTireWear);
  }
  
  // Update last pit stop time with actual completion timestamp
  if (elements.lastPitStopTime) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    elements.lastPitStopTime.textContent = timeStr;
    lastPitStopTimeValue = timeStr;
  }
  
  // Reset stint tracking for next stint
  lapEntryPoint = currentTeamLap; // Next stint starts from current lap
  stintStartTime = Date.now(); // Reset stint timer
  
  console.log(`Stint completed: ${stintLapCount} laps, ${stintTotalTimeSeconds?.toFixed(1)}s total`);
}

// Handle driver exiting the track
function handleDriverExit(values, teamLap) {
  bufferFrozen = true;

  // Calculate post-stint values
  const lastFuelUsed = fuelUsageHistory.at(-1);
  const avgFuelUsed = fuelUsageHistory.length > 0
    ? fuelUsageHistory.reduce((a, b) => a + b, 0) / fuelUsageHistory.length
    : null;

  // Stint lap count
  const stintLapCount = teamLap - lapEntryPoint;
  lapEntryPoint = null;
  lastTeamLap = null;

  // Calculate stint time and average lap time
  const stintEndTime = Date.now();
  const stintTotalTimeSeconds = stintStartTime ? (stintEndTime - stintStartTime) / 1000 : null;
  
  // Average lap time calculation (only if we have laps)
  const stintAvgLapTimeSeconds = (stintLapCount > 0 && stintTotalTimeSeconds) 
    ? stintTotalTimeSeconds / stintLapCount 
    : null;
  
  // Update last pit stop time
  lastPitStopTimeValue = stintTotalTimeSeconds ? formatTimeMS(stintTotalTimeSeconds) : '--:--';

  // Store stint values for persistence
  previousValues.stintLapCount = stintLapCount;
  previousValues.stintFuelAvg = avgFuelUsed;
  previousValues.stintTotalTime = stintTotalTimeSeconds;
  previousValues.stintAvgLapTime = stintAvgLapTimeSeconds;

  // Tire wear snapshot - use stored data from previous stint if available
  if (previousValues.lastStintTireWear) {
    updateTireWear(previousValues.lastStintTireWear);
  } else {
    // Fallback: create tire wear from current values (legacy support)
    const lastStintTireWear = {
      RF: { L: values.RFwearL, M: values.RFwearM, R: values.RFwearR },
      LF: { L: values.LFwearL, M: values.LFwearM, R: values.LFwearR },
      RR: { L: values.RRwearL, M: values.RRwearM, R: values.RRwearR },
      LR: { L: values.LRwearL, M: values.LRwearM, R: values.LRwearR }
    };
    updateTireWear(lastStintTireWear);
  }

  // Update UI with null checks
  if (elements.stintLapCount) elements.stintLapCount.textContent = stintLapCount ?? '--';
  if (elements.stintFuelAvg) elements.stintFuelAvg.textContent = avgFuelUsed ? `${avgFuelUsed.toFixed(2)} L` : '--';
  if (elements.stintTotalTime) elements.stintTotalTime.textContent = stintTotalTimeSeconds ? formatTimeHMS(stintTotalTimeSeconds) : '--:--:--';
  if (elements.stintAvgLapTime) elements.stintAvgLapTime.textContent = stintAvgLapTimeSeconds ? formatTimeMS(stintAvgLapTimeSeconds) : '--:--';
  if (elements.lastPitStopTime) elements.lastPitStopTime.textContent = lastPitStopTimeValue;
  if (elements.stintIncidents) elements.stintIncidents.textContent = values?.PlayerCarDriverIncidentCount?.toString() ?? '--';

  if (elements.fuelPerLap) {
    updateValueWithColor(elements.fuelPerLap, `${lastFuelUsed?.toFixed(2) ?? '--'} L`, lastFuelUsed, 'fuel', 'fuelPerLap');
  }
  if (elements.fuelAvg) {
    updateValueWithColor(elements.fuelAvg, `${avgFuelUsed?.toFixed(2) ?? '--'} L`, avgFuelUsed, 'fuel', 'fuelAvg');
  }

  driverWasOnTrack = false;
  if (elements.bufferStatus) elements.bufferStatus.textContent = 'Waiting for driver…';
  if (elements.panel) elements.panel.classList.add('dimmed');
  
  // Sync state to server after driver exit
  syncToServer();
}

// Format time in minutes:seconds:milliseconds (MM:SS:mmm)
function formatTimeMS(timeInSeconds) {
  if (isNaN(timeInSeconds)) return '--:--:---';
  
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;
}

function formatTimeHMS(timeInSeconds) {
  if (isNaN(timeInSeconds)) return '--:--:--';
  
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function handleDriverEntry(teamLap) {
  lapEntryPoint = teamLap;
  bufferFrozen = true;
  if (elements.bufferStatus) {
    elements.bufferStatus.textContent = 'Waiting for next lap…';
  }
  if (elements.panel) {
    elements.panel.classList.add('dimmed');
  }
  driverWasOnTrack = true;
  stintStartTime = Date.now();
  stintIncidentCount = 0;
  
  // Initialize fuel tracking for first lap
  console.log(`🚦 DRIVER ENTRY DEBUG:`, {
    bufferedDataExists: !!bufferedData,
    valuesExists: !!bufferedData?.values,
    fuelLevelValue: bufferedData?.values?.FuelLevel,
    fuelLevelType: typeof bufferedData?.values?.FuelLevel,
    teamLap: teamLap,
    fullBufferedData: bufferedData
  });
  
  if (bufferedData?.values?.FuelLevel) {
    fuelAtLapStart = bufferedData.values.FuelLevel;
    console.log(`✅ Driver entered - initialized fuelAtLapStart to ${fuelAtLapStart?.toFixed(2)}L for first lap tracking`);
  } else {
    console.log(`❌ PROBLEM: FuelLevel not found in bufferedData. fuelAtLapStart remains null`);
  }
  
  // Initialize first stint if not already tracking
  if (lastStintStartSessionTime === null && bufferedData?.values?.SessionTimeRemain) {
    lastStintStartSessionTime = bufferedData.values.SessionTimeRemain;
    lastStintStartLap = teamLap;
    fuelAtStintStart = bufferedData.values.FuelLevel;
    console.log(`First stint started - SessionTimeRemain: ${lastStintStartSessionTime}s, Lap: ${teamLap}, Fuel: ${fuelAtStintStart?.toFixed(2)}L`);
  }
  
  // Sync state to server after driver entry
  syncToServer();
}

// Process lap completion data
function processLapCompletion(lapCompleted, fuel, lapTime = null) {
  const now = Date.now();

  // Lap Time Tracking - use actual iRacing lap time if available
  if (lapTime !== null && lapTime > 0) {
    // Use actual iRacing lap time data
    lapTimeHistory.push(lapTime);
    
    // PRE-FILL STRATEGY: On first lap we see, duplicate the value to give immediate 3-lap average
    if (lapTimeHistory.length === 1) {
      console.log(`📊 FIRST LAP SEEN (lap ${lapCompleted}) - pre-filling lap time history for immediate projections`);
      lapTimeHistory.push(lapTime); // Duplicate lap 1 time for lap 2 estimate
      lapTimeHistory.push(lapTime); // Duplicate lap 1 time for lap 3 estimate
      console.log(`📊 Lap time pre-filled to:`, lapTimeHistory.map(t => formatTimeMS(t)));
    }
    
    if (lapTimeHistory.length > 5) lapTimeHistory.shift();

    // Store and display last lap time
    previousValues.lastLapTime = lapTime;
    if (elements.lastLapTime) {
      updateValueWithColor(elements.lastLapTime, formatTimeMS(lapTime), lapTime, 'lapTime', 'lastLapTime');
    }

    // 3-Lap Time Average
    previousValues.lapAvg3 = lapTimeHistory.length >= 3
      ? lapTimeHistory.slice(-3).reduce((a, b) => a + b, 0) / 3
      : null;

    updateValueWithColor(elements.lapAvg3, previousValues.lapAvg3 ? formatTimeMS(previousValues.lapAvg3) : '--:--', previousValues.lapAvg3, 'lapTime', 'lapAvg3');

    // 5-Lap Time Average - FIXED: use >= instead of === and store in previousValues
    previousValues.lapAvg5 = lapTimeHistory.length >= 5
      ? lapTimeHistory.slice(-5).reduce((a, b) => a + b, 0) / 5
      : null;

    updateValueWithColor(elements.lapAvg5, previousValues.lapAvg5 ? formatTimeMS(previousValues.lapAvg5) : '--:--', previousValues.lapAvg5, 'lapTime', 'lapAvg5');
  } else if (lastLapStartTime !== null) {
    // Fallback to wall-clock time if no iRacing lap time available
    const wallClockLapTime = (now - lastLapStartTime) / 1000; // seconds
    lapTimeHistory.push(wallClockLapTime);
    
    // PRE-FILL STRATEGY: On first lap we see, duplicate the value to give immediate 3-lap average
    if (lapTimeHistory.length === 1) {
      console.log(`📊 FIRST LAP SEEN (lap ${lapCompleted}, wall-clock) - pre-filling lap time history for immediate projections`);
      lapTimeHistory.push(wallClockLapTime); // Duplicate lap 1 time for lap 2 estimate
      lapTimeHistory.push(wallClockLapTime); // Duplicate lap 1 time for lap 3 estimate
      console.log(`📊 Lap time pre-filled to:`, lapTimeHistory.map(t => formatTimeMS(t)));
    }
    
    if (lapTimeHistory.length > 5) lapTimeHistory.shift();

    // Store and display last lap time
    previousValues.lastLapTime = wallClockLapTime;
    if (elements.lastLapTime) {
      updateValueWithColor(elements.lastLapTime, formatTimeMS(wallClockLapTime), wallClockLapTime, 'lapTime', 'lastLapTime');
    }

    // 3-Lap Time Average
    previousValues.lapAvg3 = lapTimeHistory.length >= 3
      ? lapTimeHistory.slice(-3).reduce((a, b) => a + b, 0) / 3
      : null;

    updateValueWithColor(elements.lapAvg3, previousValues.lapAvg3 ? formatTimeMS(previousValues.lapAvg3) : '--:--', previousValues.lapAvg3, 'lapTime', 'lapAvg3');

    // 5-Lap Time Average - FIXED: use >= instead of === and store in previousValues
    previousValues.lapAvg5 = lapTimeHistory.length >= 5
      ? lapTimeHistory.slice(-5).reduce((a, b) => a + b, 0) / 5
      : null;

    updateValueWithColor(elements.lapAvg5, previousValues.lapAvg5 ? formatTimeMS(previousValues.lapAvg5) : '--:--', previousValues.lapAvg5, 'lapTime', 'lapAvg5');
  }
  lastLapStartTime = now;

  // Fuel Usage Tracking
  console.log(`\n🔴 LAP ${lapCompleted} FUEL CALCULATION:`, {
    fuelAtLapStart: fuelAtLapStart?.toFixed(2) ?? 'NULL',
    currentFuel: fuel?.toFixed(2) ?? 'NULL',
    tankCapacity: tankCapacity?.toFixed(2) ?? 'NULL',
    fuelLevelPct: bufferedData?.values?.FuelLevelPct?.toFixed(2) ?? 'NULL',
    fuelParameter: fuel,
    fuelType: typeof fuel,
    lastLapCompleted: lastLapCompleted
  });
  
  // CRITICAL: If fuelAtLapStart is still null (no driver entry event), initialize it NOW
  // This handles cases where driver is already in car at session start
  if (fuelAtLapStart === null && fuel > 0) {
    // Estimate fuel used for this lap based on tank capacity
    const estimatedFuelUsed = Math.max(0.5, tankCapacity > 0 ? tankCapacity - fuel : 2.0);
    console.log(`⚠️ FIRST LAP SEEN (lap ${lapCompleted}) - fuelAtLapStart was null. Tank: ${tankCapacity?.toFixed(2)}L, current fuel: ${fuel?.toFixed(2)}L, estimated used: ${estimatedFuelUsed?.toFixed(2)}L`);
    console.log(`  Calculation: ${tankCapacity?.toFixed(2)} - ${fuel?.toFixed(2)} = ${estimatedFuelUsed?.toFixed(2)}L`);
    
    fuelUsageHistory.push(estimatedFuelUsed);
    
    // PRE-FILL for immediate 3-lap average
    fuelUsageHistory.push(estimatedFuelUsed);
    fuelUsageHistory.push(estimatedFuelUsed);
    console.log(`📊 Pre-filled with ${estimatedFuelUsed?.toFixed(2)}L for immediate 3-lap average`);
    
    // Set baseline for next lap
    fuelAtLapStart = fuel;
    console.log(`✅ Set fuelAtLapStart to ${fuel?.toFixed(2)}L for next lap tracking`);
  }
  
  if (fuelAtLapStart !== null) {
    const fuelUsed = fuelAtLapStart - fuel;
    console.log(`✅ Fuel tracking (lap ${lapCompleted}): fuelAtLapStart=${fuelAtLapStart?.toFixed(2)}L, currentFuel=${fuel?.toFixed(2)}L, calculated fuelUsed=${fuelUsed?.toFixed(2)}L`);
    
    if (fuelUsed >= 0 && isFinite(fuelUsed)) {
      console.log(`✅ fuelUsed is valid (${fuelUsed?.toFixed(2)}L) - adding to history`);
      fuelUsageHistory.push(fuelUsed);
      
      // PRE-FILL STRATEGY: On first "normal" lap (lap 2+), skip pre-fill since we already did it for lap 1
      if (fuelUsageHistory.length === 4 && lapCompleted === 2) {
        console.log(`📊 Lap 2 complete - fuel history now has real data: `, fuelUsageHistory.map(f => f.toFixed(2)));
      }
      
      if (fuelUsageHistory.length > 5) fuelUsageHistory.shift();
      
      console.log(`Fuel usage history (${fuelUsageHistory.length} laps):`, fuelUsageHistory.map(f => f.toFixed(2)));

      // 3-Lap Fuel Average - store in global previousValues
      previousValues.fuelAvg = fuelUsageHistory.length >= 3
        ? fuelUsageHistory.slice(-3).reduce((a, b) => a + b, 0) / 3
        : null;
      
      console.log(`3-lap fuel average: ${previousValues.fuelAvg?.toFixed(2) ?? 'null'}`);
      
      // Update avgFuelPerLap for general usage
      avgFuelPerLap = previousValues.fuelAvg || (fuelUsageHistory.length > 0 
        ? fuelUsageHistory.reduce((a, b) => a + b, 0) / fuelUsageHistory.length 
        : 0);

      if (elements.fuelAvg) {
        updateValueWithColor(elements.fuelAvg, `${previousValues.fuelAvg?.toFixed(2) ?? '--'} L`, previousValues.fuelAvg, 'fuel', 'fuelAvg');
      }

      // 5-Lap Fuel Average - FIXED: use >= instead of === and store in previousValues
      previousValues.fuelAvg5 = fuelUsageHistory.length >= 5
        ? fuelUsageHistory.slice(-5).reduce((a, b) => a + b, 0) / 5
        : null;

      if (elements.fuelAvg5) {
        updateValueWithColor(elements.fuelAvg5, `${previousValues.fuelAvg5?.toFixed(2) ?? '--'} L`, previousValues.fuelAvg5, 'fuel', 'fuelAvg5');
      }

      // Display last lap fuel
      if (elements.fuelPerLap) {
        console.log(`🔥 DISPLAYING FUEL USED: fuelUsed=${fuelUsed?.toFixed(4)}, previousValues.fuelPerLap=${previousValues.fuelPerLap?.toFixed(4) ?? 'null'}`);
        updateValueWithColor(elements.fuelPerLap, `${fuelUsed.toFixed(2)} L`, fuelUsed, 'fuel', 'fuelPerLap');
      }
    } else {
      console.log(`❌ REJECTED fuelUsed: value=${fuelUsed}, isFinite=${isFinite(fuelUsed)}, fuelUsed >= 0: ${fuelUsed >= 0}`);
    }
  }

  // Fuel Projection - now using global variables
  const projectedLaps = (previousValues.fuelAvg !== null && previousValues.fuelAvg > 0)
    ? fuel / previousValues.fuelAvg
    : null;

  const projectedTimeSec = (projectedLaps !== null && previousValues.lapAvg3 !== null)
    ? projectedLaps * previousValues.lapAvg3
    : null;

  // Debug logging for projection calculation
  if (previousValues.fuelAvg === null || previousValues.lapAvg3 === null) {
    console.log(`🔢 Projection calculation info:`, {
      currentFuel: fuel?.toFixed(2),
      fuelUsageHistory: fuelUsageHistory.map(f => f.toFixed(2)),
      fuelAvg: previousValues.fuelAvg?.toFixed(2) ?? 'null (need 3+ laps)',
      lapTimeHistory: lapTimeHistory.map(t => t.toFixed(2)),
      lapAvg3: previousValues.lapAvg3?.toFixed(2) ?? 'null (need 3+ laps)',
      projectedLaps: projectedLaps?.toFixed(2) ?? 'null',
      projectedTime: projectedTimeSec?.toFixed(2) ?? 'null'
    });
  }

  // Store projected values for persistence
  previousValues.projectedLaps = projectedLaps;
  previousValues.projectedTime = projectedTimeSec;

  if (elements.fuelProjectedLaps) {
    updateValueWithColor(elements.fuelProjectedLaps, `${projectedLaps?.toFixed(2) ?? '--'}`, projectedLaps, 'projection');
  }

  if (projectedTimeSec && elements.fuelProjectedTime) {
    updateValueWithColor(elements.fuelProjectedTime, formatTimeMS(projectedTimeSec), projectedTimeSec, 'projection');
  } else if (elements.fuelProjectedTime) {
    elements.fuelProjectedTime.textContent = '--:--';
  }

  fuelAtLapStart = fuel;
  lastLapCompleted = lapCompleted;
  
  console.log(`Lap ${lapCompleted} completed - setting fuelAtLapStart to ${fuel?.toFixed(2)}L for next lap`);
  
  // Sync state to server after lap completion
  syncToServer();
}

// Set up socket event listeners
function setupSocketListeners() {
  // Refresh rate monitor
  socket.on('telemetry', () => {
    const now = Date.now();
    if (lastTelemetryTime && elements.refreshRate) {
      const interval = now - lastTelemetryTime;
      const hz = (1000 / interval).toFixed(1);
      elements.refreshRate.textContent = `Refresh Rate: ${hz} Hz (${interval} ms)`;
    }
    lastTelemetryTime = now;
  });

  // Server state synchronization
  socket.on('telemetryStateInit', (serverState) => {
    console.log('Received initial state from server');
    applyServerState(serverState);
  });
  
  socket.on('telemetryStateUpdate', (updates) => {
    console.log('Received state update from server');
    applyServerState(updates);
  });
  
  socket.on('telemetryStateReset', (newState) => {
    console.log('Received state reset from server');
    applyServerState(newState);
    
    // Show notification
    alert('Telemetry data has been reset by another team member.');
  });

  // Session info processing
  socket.on('sessionInfo', (data) => {
    console.log('📋 Received sessionInfo in telemetry.js:', data);
    console.log('📋 Current bufferedData before update:', bufferedData);
    
    // Store session info in bufferedData for trackmap and other components
    if (!bufferedData) {
      bufferedData = { values: null, sessionInfo: null };
      console.log('📋 Created new bufferedData object');
    }
    bufferedData.sessionInfo = data;
    
    console.log('📋 BufferedData after sessionInfo update:', bufferedData);
    console.log('📋 SessionInfo stored - structure check:');
    console.log('  - WeekendInfo exists:', !!bufferedData.sessionInfo?.WeekendInfo);
    console.log('  - SessionInfo exists:', !!bufferedData.sessionInfo?.SessionInfo);
    
    // Save to storage for persistence
    saveTelemetryState();
    console.log('📋 Telemetry state saved to storage');
    
    // Make bufferedData globally accessible
    window.bufferedData = bufferedData;
    console.log('📋 BufferedData made globally accessible');
    
    console.log('📋 SessionInfo stored in bufferedData successfully');
  });

  // Main telemetry processing
  socket.on('telemetry', (data) => {
    try {
      if (!data || !data.values) return;
      
      const values = data.values;
      
      // 🔧 WORKAROUND: Extract session data from telemetry since sessionInfo isn't working
      if (values && !bufferedData?.sessionInfo) {
        console.log('🔧 WORKAROUND: Attempting to extract session data from telemetry');
        
        // Create mock session data from available telemetry fields
        const mockSessionData = {
          WeekendInfo: {
            TrackDisplayName: values.TrackDisplayName || values.TrackName || "Unknown Track",
            TrackLength: values.TrackLength || "Unknown",
            TrackDisplayShortName: values.TrackDisplayShortName || "UNK"
          },
          SessionInfo: {
            Sessions: [{
              SessionType: values.SessionType || "Practice",
              SessionLaps: values.SessionLaps || "Unlimited", 
              SessionTime: values.SessionTime || "Unlimited",
              SessionName: values.SessionName || "Session"
            }]
          },
          DriverInfo: {
            DriverCarIdx: values.PlayerCarIdx || 0
          }
        };
        
        console.log('🔧 WORKAROUND: Created mock session data:', mockSessionData);
        
        // Store in bufferedData
        if (!bufferedData) {
          bufferedData = { values: null, sessionInfo: null };
        }
        bufferedData.sessionInfo = mockSessionData;
        window.bufferedData = bufferedData;
        
        // Trigger trackmap update directly
        if (window.trackMap && window.trackMap.updateSessionDisplay) {
          console.log('🔧 WORKAROUND: Triggering trackMap update with mock data');
          window.trackMap.updateSessionDisplay(mockSessionData);
        }
        
        console.log('🔧 WORKAROUND: Session data extraction complete');
      }
      
      const carIdx = values?.PlayerCarIdx;
      const teamLap = values?.CarIdxLapCompleted?.[carIdx];
      const isOnTrack = values?.IsOnTrack;
      
      // Track incidents if available in telemetry
      if (driverWasOnTrack && values.PlayerCarDriverIncidentCount !== undefined) {
        // Check if incident count increased
        const currentIncidents = values.PlayerCarDriverIncidentCount;
        if (bufferedData && bufferedData.values && currentIncidents > bufferedData.values.PlayerCarDriverIncidentCount) {
          stintIncidentCount += (currentIncidents - bufferedData.values.PlayerCarDriverIncidentCount);
        }
      }
      
      // Track stint duration and lap count using OnPitRoad and SessionTimeRemain
      const onPitRoad = values.OnPitRoad;
      const currentSessionTimeRemain = values.SessionTimeRemain;
      const currentTeamLap = values?.CarIdxLapCompleted?.[values?.PlayerCarIdx];
      
      if (onPitRoad && !wasPitstopActive) {
        // Pit entry detected - end of stint
        wasPitstopActive = true;
        
        // Calculate actual stint duration if we have a previous stint start time
        if (lastStintStartSessionTime !== null && currentSessionTimeRemain !== null) {
          const calculatedStintDuration = lastStintStartSessionTime - currentSessionTimeRemain;
          if (calculatedStintDuration > 0) {
            actualStintDuration = calculatedStintDuration;
            stintDurations.push(calculatedStintDuration);
            
            // Keep only recent stint durations (last 10)
            if (stintDurations.length > 10) {
              stintDurations.shift();
            }
            
            console.log(`Actual stint duration: ${calculatedStintDuration}s (${formatTimeMS(calculatedStintDuration * 1000)})`);
          }
        }
        
        // Calculate actual stint lap count if we have a previous stint start lap
        if (lastStintStartLap !== null && currentTeamLap !== null) {
          const calculatedStintLapCount = currentTeamLap - lastStintStartLap;
          if (calculatedStintLapCount > 0) {
            actualStintLapCount = calculatedStintLapCount;
            stintLapCounts.push(calculatedStintLapCount);
            
            // Keep only recent stint lap counts (last 10)
            if (stintLapCounts.length > 10) {
              stintLapCounts.shift();
            }
            
            console.log(`Actual stint lap count: ${calculatedStintLapCount} laps`);
          }
        }
        
        // Calculate actual stint fuel usage if we have a previous stint start fuel level
        if (fuelAtStintStart !== null && values.FuelLevel !== null) {
          const calculatedStintFuelUsed = fuelAtStintStart - values.FuelLevel;
          if (calculatedStintFuelUsed > 0) {
            actualStintFuelUsed = calculatedStintFuelUsed;
            console.log(`Actual stint fuel used: ${calculatedStintFuelUsed.toFixed(2)}L`);
          }
        }
        
        // Capture tire wear at end of stint (before pit entry)
        const lastStintTireWear = {
          RF: { L: values.RFwearL, M: values.RFwearM, R: values.RFwearR },
          LF: { L: values.LFwearL, M: values.LFwearM, R: values.LFwearR },
          RR: { L: values.RRwearL, M: values.RRwearM, R: values.RRwearR },
          LR: { L: values.LRwearL, M: values.LRwearM, R: values.LRwearR }
        };
        
        // Store tire wear data for persistence
        previousValues.lastStintTireWear = lastStintTireWear;
        console.log('Captured tire wear at end of stint:', lastStintTireWear);
        
      } else if (!onPitRoad && wasPitstopActive) {
        // Pit exit detected - new stint starts
        wasPitstopActive = false;
        lastStintStartSessionTime = currentSessionTimeRemain;
        lastStintStartLap = currentTeamLap;
        fuelAtStintStart = values.FuelLevel; // Track fuel level at stint start
        console.log(`New stint started - SessionTimeRemain: ${currentSessionTimeRemain}s, Lap: ${currentTeamLap}, Fuel: ${values.FuelLevel?.toFixed(2)}L`);
      }
      
  // Coasting/overlap indicators moved to Inputs page
      
      if (elements.teamLapDisplay) {
        elements.teamLapDisplay.textContent = `Team Car Lap: ${teamLap}`;
      }

      // Handle driver exit
      if (!isOnTrack && driverWasOnTrack) {
        handleDriverExit(values, teamLap);
        return;
      }

      // Handle driver entry
      if (isOnTrack && !driverWasOnTrack) {
        handleDriverEntry(teamLap);
        return;
      }

      // Handle pit stop completion (PitstopActive goes from true to false)
      const currentPitstopActive = values?.PitstopActive || false;
      if (wasPitstopActive && !currentPitstopActive) {
        handlePitStopCompletion(values);
      }
      wasPitstopActive = currentPitstopActive;

      // Lap-Based Buffer Unlock
      if (isOnTrack && bufferFrozen && lapEntryPoint !== null && teamLap >= lapEntryPoint + 2) {
        bufferFrozen = false;
        lastTeamLap = teamLap;
        bufferedData = data;
        if (elements.bufferStatus) {
          elements.bufferStatus.textContent = 'Live telemetry';
        }
      }

      // Buffer Update on New Lap
      if (isOnTrack && !bufferFrozen && teamLap > lastTeamLap) {
        lastTeamLap = teamLap;
        bufferedData = data;
      }

      // Update stint stats in real-time if we have a start time
      if (isOnTrack && stintStartTime && !bufferFrozen) {
        const currentStintTime = (Date.now() - stintStartTime) / 1000;
        if (elements.stintTotalTime) {
          elements.stintTotalTime.textContent = formatTimeHMS(currentStintTime);
        }
        
        // Calculate current stint lap count using new global tracking
        const currentStintLapCount = (lastStintStartLap !== null && teamLap !== null) 
          ? teamLap - lastStintStartLap 
          : 0;
        if (currentStintLapCount > 0) {
          const currentAvgLapTime = currentStintTime / currentStintLapCount;
          if (elements.stintAvgLapTime) {
            elements.stintAvgLapTime.textContent = formatTimeMS(currentAvgLapTime);
          }
        }
        
        if (elements.stintIncidents) {
          elements.stintIncidents.textContent = values?.PlayerCarDriverIncidentCount?.toString() ?? '--';
        }
      }

      // Update fuel gauge with live data
      const liveFuelLevel = values?.FuelLevel ?? 0;
      const fuelLevelPct = values?.FuelLevelPct ?? 0;
      
      // Update tank capacity if we have both absolute and percentage values
      if (liveFuelLevel > 0 && fuelLevelPct > 0) {
        const calculatedCapacity = liveFuelLevel / fuelLevelPct;
        if (calculatedCapacity > 50 && calculatedCapacity < 200) { // Reasonable range
          tankCapacity = calculatedCapacity;
        }
      }
      
      updateFuelGauge(liveFuelLevel);

      // Update weather data
      updateWeatherData(values);
      
      // Update tire wear in real-time
      const currentTireWear = {
        RF: { L: values.RFwearL, M: values.RFwearM, R: values.RFwearR },
        LF: { L: values.LFwearL, M: values.LFwearM, R: values.LFwearR },
        RR: { L: values.RRwearL, M: values.RRwearM, R: values.RRwearR },
        LR: { L: values.LRwearL, M: values.LRwearM, R: values.LRwearR }
      };
      updateTireWear(currentTireWear);

      // Display Logic
      const safeValues = bufferedData?.values;
      if (!safeValues) return;

      // Calculated Values
      const lapCompleted = safeValues?.CarIdxLapCompleted?.[safeValues?.PlayerCarIdx] || safeValues.LapCompleted;
      const fuel = safeValues.FuelLevel;
      currentLap = lapCompleted;
      const driverReady = currentLap >= MIN_LAPS_FOR_VALID_DATA;

      if (driverReady && isOnTrack && elements.panel) {
        elements.panel.classList.remove('dimmed');
      } else if (elements.panel) {
        elements.panel.classList.add('dimmed');
      }

      // Lap Completion Logic
      // NOTE: Process all laps (even lap 1) - driverReady is only for dimming the UI
      if (lapCompleted !== lastLapCompleted && lapCompleted !== -1) {
        const lapTime = safeValues?.LapLastLapTime; // Get actual iRacing lap time
        console.log(`🟢 LAP COMPLETED DETECTED: lapCompleted=${lapCompleted}, lastLapCompleted=${lastLapCompleted}, fuel=${fuel?.toFixed(2) ?? 'NULL'}, lapTime=${lapTime?.toFixed(2) ?? 'NULL'}`);
        processLapCompletion(lapCompleted, fuel, lapTime);
      }
    } catch (error) {
      console.error('Error processing telemetry data:', error);
    }
  });

  // Driver Info Display
  socket.on('currentBroadcaster', (info) => {
    try {
      if (elements.streamingStatus) {
        elements.streamingStatus.textContent = 
          `Live: ${info.driver} (Session ${info.sessionId})`;
      }
      
      // Check if this is a new session or a new day
      const currentDate = new Date().toDateString();
      if ((lastSessionId && info.sessionId !== lastSessionId) || 
          (lastSessionDate && currentDate !== lastSessionDate)) {
        
        // Update session tracking
        lastSessionId = info.sessionId;
        lastSessionDate = currentDate;
        
        // Sync session info to server
        syncToServer();
        
        // Ask user if they want to reset data for the new session
        setTimeout(() => {
          if (confirm("It looks like a new race session has started. Would you like to reset the telemetry data for all team members?")) {
            resetTelemetryData();
          }
        }, 2000); // Small delay to ensure the page is fully loaded
      }
    } catch (error) {
      console.error('Error updating broadcaster info:', error);
    }
  });

  // Handle driver offline
  socket.on('telemetry', (data) => {
    try {
      const isOnTrack = data?.values?.IsOnTrack;
      if (isOnTrack === false && elements.streamingStatus) {
        elements.streamingStatus.textContent = 'Live: —';
      }
    } catch (error) {
      console.error('Error updating offline status:', error);
    }
  });
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);

// Sync state to server periodically
setInterval(syncToServer, 5000); // Sync every 5 seconds

// Sync state when leaving the page
window.addEventListener('beforeunload', syncToServer);
window.addEventListener('pagehide', syncToServer);

// Function to reset all telemetry data
function resetTelemetryData() {
  if (confirm("Are you sure you want to reset all telemetry data? This will clear data for ALL team members.")) {
    // Send reset command to server (will be broadcast to all clients)
    socket.emit('resetTelemetryState');
    
    // Reset local state variables
    lastLapCompleted = -1;
    fuelAtLapStart = null;
    fuelUsageHistory = [];
    lapTimeHistory = [];
    lastLapStartTime = null;
    currentLap = 0;
    lastTeamLap = null;
    bufferedData = null;
    lapEntryPoint = null;
    bufferFrozen = true;
    driverWasOnTrack = false;
    lastTelemetryTime = null;
    stintStartTime = null;
    lastPitStopTimeValue = null;
    previousValues = {
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
    };
    stintIncidentCount = 0;
    
    // Keep session tracking
    lastSessionId = socket._lastSessionId; // Get from socket if available
    lastSessionDate = new Date().toDateString();
    
    // Reset display elements
    updateUIFromState();
    
    // Clear localStorage data
    if (window.storageManager) {
      window.storageManager.clearAll();
    }
    
    // Reset any UI elements that might not be covered by updateUIFromState
    if (elements.refreshRate) elements.refreshRate.textContent = 'Refresh Rate: -- Hz (-- ms)';
    if (elements.streamingStatus) elements.streamingStatus.textContent = 'Live: —';
    if (elements.teamLapDisplay) elements.teamLapDisplay.textContent = 'Team Car Lap: 0';
    if (elements.fuelValue) elements.fuelValue.textContent = '0.0 L';
    if (elements.fuelGauge) elements.fuelGauge.value = 0;
    
    // Notify local user
    alert('Telemetry data has been reset for all team members.');
  }
}

// Export public methods and data for other files to use
window.telemetryDashboard = {
  initDashboard,
  updateFuelGauge,
  // Expose fuel and lap time data for endurance planner
  getFuelData: () => ({
    fuelUsageHistory,
    avgFuelUsed3: fuelUsageHistory.length >= 3
      ? fuelUsageHistory.slice(-3).reduce((a, b) => a + b, 0) / 3
      : null,
    fuelAtLapStart,
    currentFuelLevel: bufferedData?.values?.FuelLevel || 0,
    maxFuel: tankCapacity,
    avgFuelPerLap: avgFuelPerLap
  }),
  getLapTimeData: () => ({
    lapTimeHistory,
    avgLapTime: lapTimeHistory.length >= 3
      ? lapTimeHistory.slice(-3).reduce((a, b) => a + b, 0) / 3
      : previousValues.lapAvg3,
    lastLapTime: previousValues.lastLapTime,
    bestLapTime: previousValues.lastLapTime // Using lastLapTime as fallback
  }),
  getRaceData: () => ({
    isRaceRunning: bufferedData?.values?.SessionTimeRemain < lastSessionTimeRemain,
    raceTimeRemaining: bufferedData?.values?.SessionTimeRemain || 0,
    currentLap,
    sessionInfo: bufferedData?.sessionInfo,
    sessionType: bufferedData?.sessionInfo?.SessionInfo?.Sessions?.[0]?.SessionType || '',
    trackName: bufferedData?.sessionInfo?.WeekendInfo?.TrackDisplayName || '',
    sessionLaps: bufferedData?.sessionInfo?.SessionInfo?.Sessions?.[0]?.SessionLaps || 0,
    sessionTime: bufferedData?.sessionInfo?.SessionInfo?.Sessions?.[0]?.SessionTime || 0
  }),
  // Stint duration data for endurance planning
  getStintData: () => ({
    lastStintStartSessionTime,
    actualStintDuration,
    stintDurations,
    averageStintDuration: stintDurations.length > 0 
      ? stintDurations.reduce((a, b) => a + b, 0) / stintDurations.length 
      : 0,
    currentStintElapsed: lastStintStartSessionTime && bufferedData?.values?.SessionTimeRemain
      ? lastStintStartSessionTime - bufferedData.values.SessionTimeRemain
      : 0,
    lastStintStartLap,
    actualStintLapCount,
    stintLapCounts,
    averageStintLapCount: stintLapCounts.length > 0 
      ? stintLapCounts.reduce((a, b) => a + b, 0) / stintLapCounts.length 
      : 0,
    currentStintLapCount: lastStintStartLap && bufferedData?.values?.CarIdxLapCompleted?.[bufferedData?.values?.PlayerCarIdx]
      ? bufferedData?.values?.CarIdxLapCompleted?.[bufferedData?.values?.PlayerCarIdx] - lastStintStartLap
      : 0
  }),
  // Export reset function for use in index.html
  resetTelemetryData
};
