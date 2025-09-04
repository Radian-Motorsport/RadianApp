# Telemetry Dashboard

A comprehensive real-time telemetry dashboard for sim racing with multiple specialized views for data analysis, strategy planning, and system monitoring.

## Features

- **Real-time Data**: Displays telemetry data with refresh rate indicator across multiple specialized pages
- **Multi-Page Architecture**: 8 dedicated pages for different aspects of telemetry analysis
- **Data Analysis**: Comprehensive fuel, lap, tire, and performance monitoring
- **Driver Monitoring**: Real-time driver input visualization and analysis
- **Track Visualization**: Interactive track mapping with real-time position data
- **Weather Integration**: Environmental data tracking and visualization
- **Suspension Analysis**: Four-corner suspension monitoring with high-frequency data
- **Strategy Planning**: Both live and static endurance race planning tools
- **System Monitoring**: Real-time connection status and client management

## Page Structure

### 🔢 Data (`index.html`)
Main dashboard with fuel management, lap statistics, tire wear monitoring, driver status, and stint summaries.

### 🎮 Driver (`inputs.html`) 
Driver input monitoring with pedal trace visualization, throttle/brake/clutch data, gear changes, and car settings.

### 🗺️ Track (`track.html`)
Interactive track mapping with real-time position visualization and track layout display.

### 🌤️ Weather (`weather.html`)
Environmental data including temperature, pressure, wind conditions, track wetness, and weather trace visualization.

### 🔧 Suspension (`suspension.html`)
Four-corner suspension analysis with real-time deflection/velocity data, high-frequency oscilloscope traces, and suspension statistics.

### ⏱️ Endurance (`planner.html`)
Live endurance race stint planning with real-time fuel calculations and pit stop strategy optimization.

### 📋 Static (`staticplanner.html`)
Manual strategy planning tool for pre-race analysis and scenario testing without live telemetry.

### 🔗 Connections (`connections.html`)
System monitoring showing connected racing applications, web viewers, and real-time connection status.

## File Structure

### Core Pages
- `index.html` - Data dashboard (main view with fuel, laps, tires)
- `inputs.html` - Driver input monitoring with pedal trace
- `track.html` - Track mapping and position visualization  
- `weather.html` - Weather and environmental data
- `suspension.html` - Suspension analysis with four-corner display
- `planner.html` - Live endurance race stint planning
- `staticplanner.html` - Manual strategy planning tool
- `connections.html` - System monitoring and connection status

### JavaScript Modules
- `telemetry.js` - Core telemetry data processing and shared data
- `nav.js` - Shared navigation system across all pages
- `storage-manager.js` - Data persistence and localStorage management
- `pedaltrace.js` - Pedal input visualization
- `trackmap.js` - Track mapping visualization
- `envirotrace.js` - Environmental data visualization
- `weather.js` - Weather data handling and updates
- `suspension.js` - Suspension analysis and four-corner display
- `planner.js` - Endurance race stint calculations

### Styling
- `styles.css` - Comprehensive CSS with 8-page color scheme and responsive design

## Setup

1. Make sure you have a server running with Socket.io support
2. The dashboard connects to a telemetry provider at `https://radianapp.onrender.com`
3. Open any page to access the telemetry system
4. Navigate between the 8 specialized pages using the top navigation bar
5. Data persistence is maintained across page switches using localStorage

## Navigation

The dashboard features an 8-page navigation system:
**Data | Driver | Track | Weather | Suspension | Endurance | Static | Connections**

Each page has a unique color scheme and specialized focus area. The navigation is fully responsive and works across desktop and mobile devices.

## Usage

The dashboard automatically connects to the telemetry source when loaded. Data will begin displaying after the driver completes the minimum number of laps for valid data collection.

### Endurance Planner

The endurance planner feature helps teams manage race strategy for long races:

- Calculates optimal pit stop timing based on fuel consumption
- Provides stint-by-stint breakdown of race progress
- Shows fuel usage per stint and expected laps per stint
- Adjusts calculations in real-time as driving style changes
- Highlights the current stint and updates next pit stop timing
- Uses a 5% safety margin to ensure sufficient fuel reserve

### Static Planner

The static planner provides a testing environment for the endurance planner:

- Allows manual input of race parameters for testing
- Simulates race conditions without requiring active telemetry
- Ideal for pre-race strategy planning
- Includes adjustable safety margin (0-20%) for fuel calculations
- Shows calculation variables with explanatory tooltips

A testing version of the endurance planner is also available:

- Provides input fields for all key race parameters
- Uses the same calculation logic as the live planner
- Allows testing different race scenarios without live telemetry
- Perfect for pre-race planning and strategy development
- Easily accessible from all pages via the top navigation bar

## Data Sharing

The dashboard uses a data sharing mechanism between JavaScript files:

- `telemetry.js` exports key metrics through the `window.telemetryDashboard` object
- Other files can access these metrics through accessor methods
- This prevents duplicate calculations across different views

## Development

To extend or modify the dashboard:

1. Core telemetry logic is in `telemetry.js`
2. Styles are in `styles.css`
3. Add new visualizations by creating new JavaScript modules and linking them in the HTML files
4. For new calculations, consider adding them to the shared data object in `telemetry.js`

