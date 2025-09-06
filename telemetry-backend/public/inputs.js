// inputs.js - Handles the inputs visualization and data display

// Socket connection is already initialized in telemetry.js
// const socket = io('https://radianapp.onrender.com'); // Removed to avoid duplicate declaration

// DOM elements cache for inputs page
const inputsElements = {};

// Time formatting function
function formatTimeHMS(timeInSeconds) {
  // Debug logging to see what value we're getting
  console.log('formatTimeHMS received:', timeInSeconds, 'type:', typeof timeInSeconds);
  
  if (isNaN(timeInSeconds) || timeInSeconds == null || timeInSeconds === undefined) {
    console.log('formatTimeHMS returning fallback for invalid value');
    return '--:--:--';
  }
  
  // Round to nearest second to handle decimal precision
  const totalSeconds = Math.round(timeInSeconds);
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const result = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  console.log('formatTimeHMS result:', result);
  
  return result;
}

// Initialization function
function initInputsPage() {
  // Cache DOM elements for better performance
  cacheElements();
  
  // Check if socket is available before initializing components
  if (typeof socket !== 'undefined' && socket) {
    // Initialize components
    initializeComponents();
    
    // Set up event listeners
    setupEventListeners();
  } else {
    // Retry initialization after a delay if socket not ready
    console.warn('Socket not ready, retrying inputs initialization...');
    setTimeout(initInputsPage, 500);
  }
}

// Cache all DOM elements we'll need to update
function cacheElements() {
  // Status elements
  ['SessionTimeRemain', 'IsOnTrack', 'IsInGarage', 'PlayerCarPosition', 
   'PlayerCarClassPosition', 'PlayerTrackSurface',
   'PlayerCarTeamIncidentCount', 
   'PlayerCarDriverIncidentCount', 'LapDistPct', 'RaceLaps',
   'CarDistAhead', 'CarDistBehind'].forEach(id => {
    inputsElements[id] = document.getElementById(id);
  });

  // Driver input elements
  ['Throttle', 'Brake', 'Clutch', 'Gear', 'RPM', 'Speed', 'Steering'].forEach(id => {
    inputsElements[id] = document.getElementById(id);
  });

  // Driver control elements
  ['dcPitSpeedLimiterToggle', 'dpFuelAutoFillEnabled', 'dpFuelAutoFillActive',
   'dcBrakeBias', 'dcTractionControl', 'dcABS', 'FuelLevel',
   'dpFuelFill', 'dpFuelAddKg', 'dpLFTireChange', 'dpRFTireChange',
   'dpLRTireChange', 'dpRRTireChange', 'dpFastRepair', 'dpWindshieldTearoff'].forEach(id => {
    inputsElements[id] = document.getElementById(id);
  });

  // Other UI elements
  inputsElements.refreshRate = document.getElementById('refreshRate');
}

// Initialize visualization components
function initializeComponents() {
  // TrackMap is now on its own page (track.html)
  
  // Check if socket is available and PedalTrace class exists
  if (typeof socket !== 'undefined' && typeof PedalTrace !== 'undefined') {
    try {
      // Initialize pedal trace
      window.pedalTrace = new PedalTrace(socket, 'pedalCanvas', {
        maxPoints: 300,
        maxRpm: 10000
      });
      console.log('PedalTrace initialized successfully');
    } catch (error) {
      console.error('Error initializing PedalTrace:', error);
    }
  } else {
    console.warn('Socket or PedalTrace not available for inputs initialization');
  }
}

// Set up socket event listeners
function setupEventListeners() {
  if (typeof socket === 'undefined' || !socket) {
    console.error('Socket not available for inputs event listeners');
    return;
  }

  let lastTelemetryTime = null;
  
  socket.on('telemetry', (data) => {
    try {
      const values = data?.values;
      if (!values) return;
      
      // Update refresh rate display
      updateRefreshRate();
      
      // Update all UI elements with latest values
      updateStatusElements(values);
      updateDriverInputElements(values);
      updateDriverControlElements(values);
      updateDriverIndicators(values);
      
      // Track telemetry timestamp for refresh rate calculation
      function updateRefreshRate() {
        const now = Date.now();
        if (lastTelemetryTime && inputsElements.refreshRate) {
          const interval = now - lastTelemetryTime;
          const hz = (1000 / interval).toFixed(1);
          inputsElements.refreshRate.textContent = `Refresh Rate: ${hz} Hz (${interval} ms)`;
        }
        lastTelemetryTime = now;
      }
    } catch (error) {
      console.error('Error processing telemetry data:', error);
    }
  });
}

// Update status elements with current values
function updateStatusElements(values) {
  if (!values) return;
  
  // Debug logging for SessionTimeRemain specifically
  console.log('updateStatusElements - SessionTimeRemain value:', values.SessionTimeRemain, 'type:', typeof values.SessionTimeRemain);
  
  // Race Info
  safeUpdateElement('SessionTimeRemain', formatTimeHMS(values.SessionTimeRemain));
  
  // Track Status
  safeUpdateElement('IsOnTrack', values.IsOnTrack);
  safeUpdateElement('IsInGarage', values.IsInGarage);
  safeUpdateElement('PlayerCarPosition', values.PlayerCarPosition);
  safeUpdateElement('PlayerCarClassPosition', values.PlayerCarClassPosition);
  safeUpdateElement('PlayerTrackSurface', values.PlayerTrackSurface);
  safeUpdateElement('PlayerCarTeamIncidentCount', values.PlayerCarTeamIncidentCount);
  safeUpdateElement('PlayerCarDriverIncidentCount', values.PlayerCarDriverIncidentCount);
  safeUpdateElement('LapDistPct', values.LapDistPct?.toFixed(3));
  safeUpdateElement('RaceLaps', values.RaceLaps);
  safeUpdateElement('CarDistAhead', values.CarDistAhead?.toFixed(2));
  safeUpdateElement('CarDistBehind', values.CarDistBehind?.toFixed(2));
}

// Update driver input elements
function updateDriverInputElements(values) {
  if (!values) return;
  
  safeUpdateElement('Throttle', formatValue(values.Throttle, 'percent'));
  safeUpdateElement('Brake', formatValue(values.Brake, 'percent'));
  safeUpdateElement('Clutch', formatValue(values.Clutch, 'percent'));
  safeUpdateElement('Gear', values.Gear);
  safeUpdateElement('RPM', formatValue(values.RPM, 'rpm'));
  safeUpdateElement('Speed', formatValue(values.Speed, 'speed'));
  safeUpdateElement('Steering', formatValue(values.SteeringWheelAngle, 'angle'));
}

// Update coasting and overlap indicators
function updateDriverIndicators(values) {
  const coastEl = document.getElementById('coastingStatus');
  const overlapEl = document.getElementById('overlapStatus');
  if (!coastEl && !overlapEl) return;

  // Definitions:
  // Coasting: no brake and no throttle input
  const isCoasting = (values.Brake ?? 0) < 0.02 && (values.Throttle ?? values.ThrottleRaw ?? 0) < 0.02;

  // Overlap: brake pressed while throttle held down significantly
  const throttleVal = (values.Throttle ?? values.ThrottleRaw ?? 0);
  const isOverlap = throttleVal > 0.20 && (values.Brake ?? 0) > 0.05; // sensible thresholds

  if (coastEl) {
    coastEl.textContent = isCoasting ? 'Yes' : 'No';
    coastEl.classList.toggle('coasting-active', isCoasting);
  }
  if (overlapEl) {
    overlapEl.textContent = isOverlap ? 'Yes' : 'No';
    overlapEl.classList.toggle('overlap-active', isOverlap);
  }
}

// Update driver control elements
function updateDriverControlElements(values) {
  if (!values) return;
  
  safeUpdateElement('dcPitSpeedLimiterToggle', values.dcPitSpeedLimiterToggle);
  safeUpdateElement('dpFuelAutoFillEnabled', values.dpFuelAutoFillEnabled);
  safeUpdateElement('dpFuelAutoFillActive', values.dpFuelAutoFillActive);
  safeUpdateElement('dcBrakeBias', values.dcBrakeBias?.toFixed(2));
  safeUpdateElement('dcTractionControl', values.dcTractionControl);
  safeUpdateElement('dcABS', values.dcABS);
  safeUpdateElement('FuelLevel', values.FuelLevel?.toFixed(2));
  
  // Pitstop fuel controls
  safeUpdateElement('dpFuelFill', values.dpFuelFill);
  safeUpdateElement('dpFuelAddKg', values.dpFuelAddKg?.toFixed(2));
  
  // Tire change requests
  safeUpdateElement('dpLFTireChange', values.dpLFTireChange);
  safeUpdateElement('dpRFTireChange', values.dpRFTireChange);
  safeUpdateElement('dpLRTireChange', values.dpLRTireChange);
  safeUpdateElement('dpRRTireChange', values.dpRRTireChange);
  
  // Pitstop services
  safeUpdateElement('dpFastRepair', values.dpFastRepair);
  safeUpdateElement('dpWindshieldTearoff', values.dpWindshieldTearoff);
}

// Safely update an element's text content
function safeUpdateElement(id, value) {
  const element = inputsElements[id];
  
  // Debug logging for SessionTimeRemain specifically
  if (id === 'SessionTimeRemain') {
    console.log('safeUpdateElement - ID:', id, 'Value:', value, 'Element found:', !!element);
    if (element) {
      console.log('Element before update:', element.textContent);
    }
  }
  
  if (element && value !== undefined) {
    element.textContent = value;
    
    // Debug logging after update for SessionTimeRemain
    if (id === 'SessionTimeRemain') {
      console.log('Element after update:', element.textContent);
    }
  } else if (id === 'SessionTimeRemain') {
    console.log('safeUpdateElement failed - Element:', !!element, 'Value defined:', value !== undefined);
  }
}

// Format values with appropriate units
function formatValue(value, type) {
  if (value === undefined || value === null) return '--';
  
  switch(type) {
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    case 'rpm':
      return `${value.toFixed(0)} RPM`;
    case 'speed':
      return `${value.toFixed(1)} km/h`;
    case 'angle':
      return `${value.toFixed(2)}°`;
    case 'temperature':
      return `${value.toFixed(1)}°C`;
    case 'pressure':
      return `${value.toFixed(1)} kPa`;
    default:
      return value.toString();
  }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure telemetry.js has initialized first
  setTimeout(initInputsPage, 100);
});

// Export public interface
window.inputsPage = {
  initInputsPage
};
