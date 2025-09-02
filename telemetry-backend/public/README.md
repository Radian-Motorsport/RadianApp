# Telemetry Dashboard

A real-time telemetry dashboard for sim racing that displays fuel consumption, lap times, tire wear, and other critical metrics.

## Features

- **Real-time Data**: Displays telemetry data with refresh rate indicator
- **Fuel Management**: Shows fuel usage per lap, averages, and projections
- **Lap Statistics**: Tracks lap times and calculates averages
- **Tire Wear Monitoring**: Displays tire wear percentages
- **Driver Status**: Indicates when a driver is coasting or overlapping pedals
- **Stint Summary**: Provides a summary of the previous stint performance

## File Structure

- `index.html` - Main dashboard view
- `inputs.html` - Input monitoring view
- `styles.css` - CSS styles for the dashboard
- `telemetry.js` - Core telemetry data processing
- `pedaltrace.js` - Pedal input visualization
- `trackmap.js` - Track mapping visualization
- `envirotrace.js` - Environmental data visualization

## Setup

1. Make sure you have a server running with Socket.io support
2. The dashboard connects to a telemetry provider at `https://radianapp.onrender.com`
3. Open `index.html` to view the main dashboard

## Usage

The dashboard automatically connects to the telemetry source when loaded. Data will begin displaying after the driver completes the minimum number of laps for valid data collection.

## Development

To extend or modify the dashboard:

1. Core telemetry logic is in `telemetry.js`
2. Styles are in `styles.css`
3. Add new visualizations by creating new JavaScript modules and linking them in the HTML files
