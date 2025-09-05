// Weather and Environment data handler for weather.html page

// Weather data fields that need to be updated
const weatherFields = [
  'TrackTemp', 'AirTemp', 'TrackWetness', 'Skies', 'AirDensity',
  'AirPressure', 'WindVel', 'WindDir', 'RelativeHumidity',
  'Precipitation', 'FogLevel'
];

// Helper function to safely update DOM elements
function safeUpdateElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

// Lookup tables for weather conditions
const skiesMap = {0: 'Clear', 1: 'Partly Cloudy', 2: 'Mostly Cloudy', 3: 'Overcast'};
const wetnessMap = {0: 'Dry', 1: 'Mostly Dry', 2: 'Very Lightly Wet', 3: 'Lightly Wet', 4: 'Moderately Wet', 5: 'Very Wet', 6: 'Extremely Wet'};

// Format values for display
function formatValue(value, type) {
  if (value === null || value === undefined) return '--';
  
  switch (type) {
    case 'temperature':
      return `${value.toFixed(1)}°C`;
    case 'pressure':
      return `${(value / 1000).toFixed(1)} mbar`; // Convert Pa to millibar
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'velocity':
      return `${(value * 3.6).toFixed(1)} kph`; // Convert m/s to kph
    case 'direction':
      return `${value.toFixed(0)}°`;
    case 'density':
      return `${value.toFixed(3)} kg/m³`;
    case 'skies':
      return skiesMap[value] || '--';
    case 'wetness':
      return wetnessMap[value] || '--';
    default:
      return typeof value === 'number' ? value.toFixed(2) : value;
  }
}

// Update weather data elements
function updateWeatherData(values) {
  if (!values) return;

  // Temperature & Pressure
  safeUpdateElement('TrackTemp', formatValue(values.TrackTemp, 'temperature'));
  safeUpdateElement('AirTemp', formatValue(values.AirTemp, 'temperature'));
  safeUpdateElement('AirDensity', formatValue(values.AirDensity, 'density'));
  safeUpdateElement('AirPressure', formatValue(values.AirPressure, 'pressure'));

  // Weather
  safeUpdateElement('WindVel', formatValue(values.WindVel, 'velocity'));
  safeUpdateElement('WindDir', formatValue(values.WindDir, 'direction'));
  safeUpdateElement('Skies', formatValue(values.Skies, 'skies'));

  // Track Conditions
  safeUpdateElement('RelativeHumidity', formatValue(values.RelativeHumidity, 'percentage'));
  safeUpdateElement('Precipitation', formatValue(values.Precipitation, 'percentage'));
  safeUpdateElement('TrackWetness', formatValue(values.TrackWetness, 'wetness'));
  safeUpdateElement('FogLevel', formatValue(values.FogLevel, 'percentage'));
}

// Socket connection for receiving telemetry data
// Socket is already declared in telemetry.js, use the global socket variable
// const socket = io(); // Removed to avoid duplicate declaration

// Wait for socket to be available before setting up listeners
function setupWeatherSocketListeners() {
  if (typeof socket === 'undefined' || !socket) {
    console.warn('Socket not available yet, retrying in 500ms...');
    setTimeout(setupWeatherSocketListeners, 500);
    return;
  }

  socket.on('telemetry', (data) => {
    if (data && data.values) {
      updateWeatherData(data.values);
    }
  });

  socket.on('connect', () => {
    console.log('Weather page connected to telemetry server');
  });

  socket.on('disconnect', () => {
    console.log('Weather page disconnected from telemetry server');
  });
}

// Start trying to set up listeners
setupWeatherSocketListeners();

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  console.log('Weather page initialized');
  
  // Initialize all fields to show they're ready
  weatherFields.forEach(field => {
    safeUpdateElement(field, '--');
  });
  
  // Set up time range slider
  setupTimeRangeSlider();
  
  // Initialize the environment trace visualization
  // Wait for socket to be available from telemetry.js
  if (typeof socket !== 'undefined') {
    window.enviroTrace = new EnviroTrace(socket, 'envCanvas', { maxPoints: 3600 });
    console.log('EnviroTrace initialized');
  } else {
    // If socket not ready yet, wait a bit and try again
    setTimeout(() => {
      if (typeof socket !== 'undefined') {
        window.enviroTrace = new EnviroTrace(socket, 'envCanvas', { maxPoints: 3600 });
        console.log('EnviroTrace initialized (delayed)');
      } else {
        console.error('Socket not available for EnviroTrace initialization');
      }
    }, 1000);
  }
});

// Set up time range slider functionality
function setupTimeRangeSlider() {
  const slider = document.getElementById('timeRangeSlider');
  const valueDisplay = document.getElementById('timeRangeValue');
  
  if (!slider || !valueDisplay) {
    console.warn('Time range slider elements not found');
    return;
  }
  
  // Update display text
  function updateTimeDisplay(hours) {
    if (hours < 1) {
      valueDisplay.textContent = `${hours * 60} minutes`;
    } else if (hours === 1) {
      valueDisplay.textContent = '1 hour';
    } else {
      valueDisplay.textContent = `${hours} hours`;
    }
  }
  
  // Handle slider changes
  slider.addEventListener('input', (e) => {
    const hours = parseFloat(e.target.value);
    updateTimeDisplay(hours);
    
    // Update EnviroTrace if it exists
    if (window.enviroTrace) {
      const newMaxPoints = hours * 3600; // 3600 points per hour
      window.enviroTrace.updateTimeRange(newMaxPoints);
      console.log(`Updated trace time range to ${hours} hours (${newMaxPoints} points)`);
    }
  });
  
  // Set initial display
  updateTimeDisplay(parseFloat(slider.value));
}
