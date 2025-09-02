// telemetry.js - Handles all telemetry data processing and display updates

// Socket.io connection
const socket = io('https://radianapp.onrender.com');

// State Variables
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
let stintIncidentCount = 0;

const MIN_LAPS_FOR_VALID_DATA = 2;

// Elements cache
let elements = {};

// Initialize dashboard elements
function initDashboard() {
  // Cache DOM elements for better performance
  elements = {
    refreshRate: document.getElementById('refreshRate'),
    coastingStatus: document.getElementById('coastingStatus'),
    overlapStatus: document.getElementById('overlapStatus'),
    streamingStatus: document.getElementById('streamingStatus'),
    fuelPerLap: document.getElementById('fuelPerLap'),
    fuelAvg: document.getElementById('fuelAvg'),
    fuelAvg5: document.getElementById('fuelAvg5'),
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
    tireRF: document.getElementById('tireRF'),
    tireLF: document.getElementById('tireLF'),
    tireRR: document.getElementById('tireRR'),
    tireLR: document.getElementById('tireLR'),
    panel: document.getElementById('fuelGaugeContainer')
  };

  // Set up socket listeners
  setupSocketListeners();
}

// Update fuel gauge display
function updateFuelGauge(level) {
  if (!elements.fuelGauge || !elements.fuelValue) return;
  
  const fuel = Number(level).toFixed(1);
  elements.fuelGauge.value = fuel;
  elements.fuelValue.textContent = `${fuel}%`;
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
function updateTireBandColor(elementId, wearPercentage) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Remove all existing wear classes
  element.classList.remove(
    'wear-100', 'wear-97', 'wear-95', 'wear-92', 'wear-90', 
    'wear-87', 'wear-85', 'wear-82', 'wear-80', 'wear-77', 
    'wear-60', 'wear-50'
  );
  
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

  // Tire wear snapshot
  const lastStintTireWear = {
    RF: { L: values.RFwearL, M: values.RFwearM, R: values.RFwearR },
    LF: { L: values.LFwearL, M: values.LFwearM, R: values.LFwearR },
    RR: { L: values.RRwearL, M: values.RRwearM, R: values.RRwearR },
    LR: { L: values.LRwearL, M: values.LRwearM, R: values.LRwearR }
  };

  // Update UI
  elements.stintLapCount.textContent = stintLapCount ?? '--';
  elements.stintFuelAvg.textContent = avgFuelUsed ? `${avgFuelUsed.toFixed(2)} L` : '--';
  elements.stintTotalTime.textContent = stintTotalTimeSeconds ? formatTimeHMS(stintTotalTimeSeconds) : '--:--:--';
  elements.stintAvgLapTime.textContent = stintAvgLapTimeSeconds ? formatTimeMS(stintAvgLapTimeSeconds) : '--:--';
  elements.lastPitStopTime.textContent = lastPitStopTimeValue;
  elements.stintIncidents.textContent = stintIncidentCount.toString();
  
  updateTireWear(lastStintTireWear);

  elements.fuelPerLap.textContent = `Fuel Used Last Lap: ${lastFuelUsed?.toFixed(2) ?? '--'} L`;
  elements.fuelAvg.textContent = `3-Lap Avg: ${avgFuelUsed?.toFixed(2) ?? '--'} L`;

  driverWasOnTrack = false;
  elements.bufferStatus.textContent = 'Waiting for driver…';
  elements.panel.classList.add('dimmed');
}

// Handle driver entering the track
// Format time in minutes:seconds or hours:minutes:seconds
function formatTimeMS(timeInSeconds) {
  if (isNaN(timeInSeconds)) return '--:--';
  
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
  elements.bufferStatus.textContent = 'Waiting for next lap…';
  elements.panel.classList.add('dimmed');
  driverWasOnTrack = true;
  stintStartTime = Date.now();
  stintIncidentCount = 0;
}

// Process lap completion data
function processLapCompletion(lapCompleted, fuel) {
  let avgFuelUsed3 = null;
  let lapAvg3 = null;
  const now = Date.now();

  // Lap Time Tracking
  if (lastLapStartTime !== null) {
    const lapTime = (now - lastLapStartTime) / 1000; // seconds
    lapTimeHistory.push(lapTime);
    if (lapTimeHistory.length > 5) lapTimeHistory.shift();

    // 3-Lap Time Average
    lapAvg3 = lapTimeHistory.length >= 3
      ? lapTimeHistory.slice(-3).reduce((a, b) => a + b, 0) / 3
      : null;

    elements.lapAvg3.textContent = `3-Lap Avg Lap Time: ${lapAvg3?.toFixed(2) ?? '--'}s`;

    // 5-Lap Time Average
    const lapAvg5 = lapTimeHistory.length === 5
      ? lapTimeHistory.reduce((a, b) => a + b, 0) / 5
      : null;

    elements.lapAvg5.textContent = `5-Lap Avg Lap Time: ${lapAvg5?.toFixed(2) ?? '--'}s`;
  }
  lastLapStartTime = now;

  // Fuel Usage Tracking
  if (fuelAtLapStart !== null) {
    const fuelUsed = fuelAtLapStart - fuel;
    if (fuelUsed >= 0 && isFinite(fuelUsed)) {
      fuelUsageHistory.push(fuelUsed);
      if (fuelUsageHistory.length > 5) fuelUsageHistory.shift();

      // 3-Lap Fuel Average
      avgFuelUsed3 = fuelUsageHistory.length >= 3
        ? fuelUsageHistory.slice(-3).reduce((a, b) => a + b, 0) / 3
        : null;

      elements.fuelAvg.textContent = `3-Lap Avg: ${avgFuelUsed3?.toFixed(2) ?? '--'} L`;

      // 5-Lap Fuel Average
      const avgFuelUsed5 = fuelUsageHistory.length === 5
        ? fuelUsageHistory.reduce((a, b) => a + b, 0) / 5
        : null;

      elements.fuelAvg5.textContent = `5-Lap Avg Fuel: ${avgFuelUsed5?.toFixed(2) ?? '--'} L`;

      // Display last lap fuel
      elements.fuelPerLap.textContent = `Fuel Used Last Lap: ${fuelUsed.toFixed(2)} L`;
    }
  }

  // Fuel Projection
  const projectedLaps = avgFuelUsed3 > 0
    ? fuel / avgFuelUsed3
    : null;

  const projectedTimeSec = projectedLaps && lapAvg3
    ? projectedLaps * lapAvg3
    : null;

  elements.fuelProjectedLaps.textContent = `Projected Laps Remaining: ${projectedLaps?.toFixed(2) ?? '--'}`;

  if (projectedTimeSec) {
    const minutes = Math.floor(projectedTimeSec / 60);
    const seconds = Math.floor(projectedTimeSec % 60);
    elements.fuelProjectedTime.textContent = 
      `Projected Time Remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  } else {
    elements.fuelProjectedTime.textContent = 'Projected Time Remaining: --';
  }

  fuelAtLapStart = fuel;
  lastLapCompleted = lapCompleted;
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

  // Main telemetry processing
  socket.on('telemetry', (data) => {
    try {
      if (!data || !data.values) return;
      
      const values = data.values;
      const carIdx = values?.PlayerCarIdx;
      const teamLap = values?.CarIdxLapCompleted?.[carIdx];
      const isOnTrack = values?.IsOnTrack;
      
      // Track incidents if available in telemetry
      if (driverWasOnTrack && values.PlayerCarMyIncidentCount !== undefined) {
        // Check if incident count increased
        const currentIncidents = values.PlayerCarMyIncidentCount;
        if (bufferedData && currentIncidents > bufferedData.values.PlayerCarMyIncidentCount) {
          stintIncidentCount += (currentIncidents - bufferedData.values.PlayerCarMyIncidentCount);
        }
      }
      
      // Handle coasting and overlap indicators
      if (elements.coastingStatus && elements.overlapStatus) {
        const isCoasting = values.Brake < 0.02 && values.ThrottleRaw > 0.50;
        const isPedalOverlap = values.ThrottleRaw > 0.99 && values.Brake > 0.0005;

        elements.coastingStatus.classList.toggle('coasting-active', isCoasting);
        elements.overlapStatus.classList.toggle('overlap-active', isPedalOverlap);
      }
      
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

      // Lap-Based Buffer Unlock
      if (isOnTrack && bufferFrozen && lapEntryPoint !== null && teamLap >= lapEntryPoint + 2) {
        bufferFrozen = false;
        lastTeamLap = teamLap;
        bufferedData = data;
        elements.bufferStatus.textContent = 'Live telemetry';
      }

      // Buffer Update on New Lap
      if (isOnTrack && !bufferFrozen && teamLap > lastTeamLap) {
        lastTeamLap = teamLap;
        bufferedData = data;
      }

      // Update stint stats in real-time if we have a start time
      if (isOnTrack && stintStartTime && !bufferFrozen) {
        const currentStintTime = (Date.now() - stintStartTime) / 1000;
        elements.stintTotalTime.textContent = formatTimeHMS(currentStintTime);
        
        const currentStintLapCount = teamLap - lapEntryPoint;
        if (currentStintLapCount > 0) {
          const currentAvgLapTime = currentStintTime / currentStintLapCount;
          elements.stintAvgLapTime.textContent = formatTimeMS(currentAvgLapTime);
        }
        
        elements.stintIncidents.textContent = stintIncidentCount.toString();
      }

      // Update fuel gauge with live data
      const liveFuelLevel = values?.FuelLevel ?? 0;
      updateFuelGauge(liveFuelLevel);

      // Display Logic
      const safeValues = bufferedData?.values;
      if (!safeValues) return;

      // Calculated Values
      const lapCompleted = safeValues.LapCompleted;
      const fuel = safeValues.FuelLevel;
      currentLap = lapCompleted;
      const driverReady = currentLap >= MIN_LAPS_FOR_VALID_DATA;

      if (driverReady && isOnTrack) {
        elements.panel.classList.remove('dimmed');
      } else {
        elements.panel.classList.add('dimmed');
      }

      // Lap Completion Logic
      if (driverReady && lapCompleted !== lastLapCompleted && lapCompleted !== -1) {
        processLapCompletion(lapCompleted, fuel);
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
      : lapAvg3,
    lastLapTime,
    bestLapTime
  }),
  getRaceData: () => ({
    isRaceRunning: bufferedData?.values?.SessionTimeRemain < lastSessionTimeRemain,
    raceTimeRemaining: bufferedData?.values?.SessionTimeRemain || 0,
    currentLap,
    sessionInfo: bufferedData?.sessionInfo,
    sessionType,
    trackName,
    sessionLaps,
    sessionTime
  }),
  getDriverData: () => ({
    driverName,
    teamName,
    carNumber
  }),
  getTireData: () => ({
    tireWearFL,
    tireWearFR,
    tireWearRL,
    tireWearRR
  })
};
