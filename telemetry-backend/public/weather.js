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
    console.log(`Updated ${id} with value: ${value}`); // Debug log
  } else {
    console.warn(`Element with ID '${id}' not found!`);
  }
}

// Lookup tables for weather conditions
const skiesMap = {0: 'Clear', 1: 'Partly Cloudy', 2: 'Mostly Cloudy', 3: 'Overcast'};
const wetnessMap = {
  // Integer values (if they come as numbers)
  0: 'Dry', 1: 'Mostly Dry', 2: 'Very Lightly Wet', 3: 'Lightly Wet', 4: 'Moderately Wet', 5: 'Very Wet', 6: 'Extremely Wet',
  // String values (if they come as strings)
  'Dry': 'Dry', 'Mostly Dry': 'Mostly Dry', 'Very Lightly Wet': 'Very Lightly Wet', 
  'Lightly Wet': 'Lightly Wet', 'Moderately Wet': 'Moderately Wet', 'Very Wet': 'Very Wet', 'Extremely Wet': 'Extremely Wet'
};

// Format values for display
function formatValue(value, type) {
  if (value === null || value === undefined) return '--';
  
  switch (type) {
    case 'temperature':
      return `${value.toFixed(1)}°C`;
    case 'pressure':
      return `${(value / 100).toFixed(1)} mbar`; // Convert Pa to millibar (divide by 100, not 1000)
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
      // Handle both string and integer values
      if (typeof value === 'string') {
        return value; // If it's already a string like "Mostly Dry", return it directly
      } else {
        return wetnessMap[value] || '--'; // If it's a number, use the lookup table
      }
    default:
      return typeof value === 'number' ? value.toFixed(2) : value;
  }
}

// Update weather data elements
function updateWeatherData(values) {
  if (!values) return;

  // Debug: Log function call
  if (Math.random() < 0.05) { // 5% chance
    console.log('updateWeatherData called with TrackWetness:', values.TrackWetness);
  }

  // Debug: Log track wetness value and related fields (occasionally to avoid spam)
  if (Math.random() < 0.05) { // 5% chance
    console.log('Full weather telemetry sample:', {
      TrackWetness: values.TrackWetness,
      TrackSurfaceTemp: values.TrackSurfaceTemp,
      WeatherType: values.WeatherType,
      SessionFlags: values.SessionFlags,
      TrackTemp: values.TrackTemp,
      Precipitation: values.Precipitation
    });
    
    // Check for alternative wetness field names by looking for any field with "wet" in the name
    Object.keys(values).forEach(key => {
      if (key.toLowerCase().includes('wet') || key.toLowerCase().includes('moisture') || key.toLowerCase().includes('surface')) {
        console.log(`Potential wetness field ${key}:`, values[key]);
      }
    });
  }

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
  
  // Debug track wetness specifically
  const wetnessValue = formatValue(values.TrackWetness, 'wetness');
  console.log('Track wetness formatting:', {
    rawValue: values.TrackWetness,
    formattedValue: wetnessValue,
    elementExists: !!document.getElementById('TrackWetness')
  });
  
  safeUpdateElement('TrackWetness', wetnessValue);
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
    
    // Save slider position to localStorage
    if (window.storageManager) {
      window.storageManager.save('weatherTimeRange', hours);
    }
    
    // Update EnviroTrace if it exists
    if (window.enviroTrace) {
      const newMaxPoints = Math.round(hours * 3600); // 3600 points per hour (1 point per second)
      window.enviroTrace.updateTimeRange(newMaxPoints);
      console.log(`Updated trace time range to ${hours} hours (${newMaxPoints} points)`);
    }
  });
  
  // Load saved slider position
  let savedTimeRange = 1; // default to 1 hour
  if (window.storageManager) {
    const saved = window.storageManager.load('weatherTimeRange');
    if (saved && saved.data) {
      savedTimeRange = saved.data;
      slider.value = savedTimeRange;
      
      // Update EnviroTrace with saved value
      if (window.enviroTrace) {
        const newMaxPoints = Math.round(savedTimeRange * 3600);
        window.enviroTrace.updateTimeRange(newMaxPoints);
        console.log(`Restored time range to ${savedTimeRange} hours (${newMaxPoints} points)`);
      }
    }
  }
  
  // Set initial display
  updateTimeDisplay(savedTimeRange);
}
