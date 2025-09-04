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

// Format values for display
function formatValue(value, type) {
  if (value === null || value === undefined) return '--';
  
  switch (type) {
    case 'temperature':
      return `${value.toFixed(1)}°C`;
    case 'pressure':
      return `${value.toFixed(2)} kPa`;
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'velocity':
      return `${value.toFixed(1)} m/s`;
    case 'direction':
      return `${value.toFixed(0)}°`;
    case 'density':
      return `${value.toFixed(3)} kg/m³`;
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
  safeUpdateElement('Skies', values.Skies);

  // Track Conditions
  safeUpdateElement('RelativeHumidity', formatValue(values.RelativeHumidity, 'percentage'));
  safeUpdateElement('Precipitation', formatValue(values.Precipitation, 'percentage'));
  safeUpdateElement('TrackWetness', formatValue(values.TrackWetness, 'percentage'));
  safeUpdateElement('FogLevel', formatValue(values.FogLevel, 'percentage'));
}

// Socket connection for receiving telemetry data
const socket = io();

socket.on('telemetry', (data) => {
  updateWeatherData(data);
});

socket.on('connect', () => {
  console.log('Weather page connected to telemetry server');
});

socket.on('disconnect', () => {
  console.log('Weather page disconnected from telemetry server');
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  console.log('Weather page initialized');
  // Initialize all fields to show they're ready
  weatherFields.forEach(field => {
    safeUpdateElement(field, '--');
  });
});
