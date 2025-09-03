// inputs.js - Handles the inputs visualization and data display

// Initialize socket connection
const socket = io('https://radianapp.onrender.com');

// DOM elements cache
const elements = {};

// Initialization function
function initInputsPage() {
  // Cache DOM elements for better performance
  cacheElements();
  
  // Initialize components
  initializeComponents();
  
  // Set up event listeners
  setupEventListeners();
}

// Cache all DOM elements we'll need to update
function cacheElements() {
  // Status elements
  ['IsOnTrack', 'IsInGarage', 'PlayerCarPosition', 
   'PlayerCarClassPosition', 'PlayerTrackSurface',
   'PlayerCarTeamIncidentCount', 
   'PlayerCarDriverIncidentCount', 'LapDistPct', 'RaceLaps',
   'CarDistAhead', 'CarDistBehind'].forEach(id => {
    elements[id] = document.getElementById(id);
  });

  // Driver input elements
  ['Throttle', 'Brake', 'Clutch', 'Gear', 'RPM', 'Speed', 'Steering'].forEach(id => {
    elements[id] = document.getElementById(id);
  });

  // Driver control elements
  ['dcPitSpeedLimiterToggle', 'dpFuelAutoFillEnabled', 'dpFuelAutoFillActive',
   'dcBrakeBias', 'dcTractionControl', 'dcABS', 'FuelLevel',
   'dpFuelFill', 'dpFuelAddKg', 'dpLFTireChange', 'dpRFTireChange',
   'dpLRTireChange', 'dpRRTireChange', 'dpFastRepair', 'dpWindshieldTearoff'].forEach(id => {
    elements[id] = document.getElementById(id);
  });

  // Environment elements
  ['TrackTemp', 'AirTemp', 'TrackWetness', 'Skies', 'AirDensity',
   'AirPressure', 'WindVel', 'WindDir', 'RelativeHumidity',
   'FogLevel', 'Precipitation'].forEach(id => {
    elements[id] = document.getElementById(id);
  });

  // Other UI elements
  elements.refreshRate = document.getElementById('refreshRate');
}

// Initialize visualization components
function initializeComponents() {
  // Initialize track map
  window.trackMap = new TrackMap(socket, 'trackCanvas');
  
  // Initialize pedal trace
  window.pedalTrace = new PedalTrace(socket, 'pedalCanvas', {
    maxPoints: 300,
    maxRpm: 10000
  });
  
  // Initialize environment trace
  window.enviroTrace = new EnviroTrace(socket, 'envCanvas', {
    maxPoints: 600,
    tempScale: 2
  });
}

// Set up socket event listeners
function setupEventListeners() {
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
      updateEnvironmentElements(values);
  updateDriverIndicators(values);
      
      // Track telemetry timestamp for refresh rate calculation
      function updateRefreshRate() {
        const now = Date.now();
        if (lastTelemetryTime && elements.refreshRate) {
          const interval = now - lastTelemetryTime;
          const hz = (1000 / interval).toFixed(1);
          elements.refreshRate.textContent = `Refresh Rate: ${hz} Hz (${interval} ms)`;
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
  
  safeUpdateElement('IsOnTrack', values.IsOnTrack);
  safeUpdateElement('IsInGarage', values.IsInGarage);
  safeUpdateElement('PlayerCarPosition', values.PlayerCarPosition);
  safeUpdateElement('PlayerCarClassPosition', values.PlayerCarClassPosition);
  safeUpdateElement('PlayerTrackSurface', values.PlayerTrackSurface);
  safeUpdateElement('PlayerCarTeamIncidentCount', values.PlayerCarTeamIncidentCount);
  safeUpdateElement('PlayerCarDriverIncidentCount', values.PlayerCarDriverIncidentCount);
  safeUpdateElement('LapDistPct', values.LapDistPct?.toFixed(3));
  safeUpdateElement('RaceLaps', values.RaceLaps);
  safeUpdateElement('CarDistAhead', values.CarDistAhead);
  safeUpdateElement('CarDistBehind', values.CarDistBehind);
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

// Update environment elements
function updateEnvironmentElements(values) {
  if (!values) return;
  
  // Temperature & Pressure
  safeUpdateElement('TrackTemp', formatValue(values.TrackTemp, 'temperature'));
  safeUpdateElement('AirTemp', formatValue(values.AirTemp, 'temperature'));
  safeUpdateElement('AirDensity', `${values.AirDensity?.toFixed(3)} kg/m³`);
  safeUpdateElement('AirPressure', `${values.AirPressure?.toFixed(0)} Pa`);
  
  // Weather
  safeUpdateElement('WindVel', `${values.WindVel?.toFixed(1)} km/h`);
  safeUpdateElement('WindDir', `${values.WindDir?.toFixed(1)}°`);
  
  // Convert Skies number to description
  const skiesDescriptions = {
    0: 'Clear',
    1: 'Partly Cloudy', 
    2: 'Mostly Cloudy',
    3: 'Overcast'
  };
  const skiesText = skiesDescriptions[values.Skies] || `Unknown (${values.Skies})`;
  safeUpdateElement('Skies', skiesText);
  
  // Track Conditions
  safeUpdateElement('RelativeHumidity', formatValue(values.RelativeHumidity, 'percent'));
  safeUpdateElement('Precipitation', formatValue(values.Precipitation, 'percent'));
  safeUpdateElement('TrackWetness', formatValue(values.TrackWetness, 'percent'));
  safeUpdateElement('FogLevel', `${values.FogLevel?.toFixed(1)}%`);
}

// Safely update an element's text content
function safeUpdateElement(id, value) {
  const element = elements[id];
  if (element && value !== undefined) {
    element.textContent = value;
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
document.addEventListener('DOMContentLoaded', initInputsPage);

// Export public interface
window.inputsPage = {
  initInputsPage
};
