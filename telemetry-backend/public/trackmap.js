class TrackMap {
  constructor(socket, canvasId) {
    this.socket = socket;
    this.trackCanvas = document.getElementById(canvasId);
    this.trackCtx = this.trackCanvas.getContext('2d');
    
    // Track map variables - simplified for SVG approach
    this.liveLapPct = 0;
    this.lastLapPct = 0;
    this.trackSVGPath = null;
    this.trackPoints = [];
    this.trackBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    this.playerPosition = 0; // Current player position in race
    
    // Car positioning data
    this.carAheadDistance = 0;
    this.carBehindDistance = 0;
    this.fuelLevel = 0;
    this.fuelLevelPct = 0;
    this.tankCapacity = 104; // Default tank capacity
    this.avgFuelPerLap = 0;
    
    // Load the car icons (used as fallbacks)
    this.carImg = new Image();
    this.carImg.src = '/assets/icon-active.png';
    this.carAheadImg = new Image();
    this.carAheadImg.src = '/assets/icon-idle.png';
    this.carBehindImg = new Image();
    this.carBehindImg.src = '/assets/icon-standby.png';
    
    // Cache info box elements
    this.cacheInfoElements();
    
    // Initialize SVG track
    this.initializeSVGTrack();
    
    // Setup event listeners
    this.setupListeners();
    
    // Start animation
    this.startAnimation();
  }
  
  initializeSVGTrack() {
    // Use your custom Inkscape-edited track path data
    const svgPathData = "m 111.47367,511.28151 c -37.465001,0 -78.925201,-0.26458 -120.6235406,-1.03187 -0.8731204,-0.0265 -1.7197904,-0.0794 -2.5664604,-0.23813 -2.80458,-0.44979 -6.58812,-1.48166 -8.67833,-3.81 -1.77271,-1.98437 -4.52437,-6.42937 -3.09562,-14.20812 0.52916,-2.83104 0.97895,-8.01688 -1.82563,-11.27125 -2.09021,-2.40771 -5.79437,-3.54542 -11.00666,-3.36021 -0.82021,0.0265 -1.95792,0.10583 -3.20146,0.18521 -2.30188,0.15875 -4.68313,0.3175 -6.29709,0.26458 -11.588743,-0.39687 -18.891239,-2.30187 -23.653739,-6.11187 -12.93812,-10.31875 -18.94416,-29.05124 -19.60562,-31.14145 -2.8575,-9.31333 0.635,-17.09208 9.78958,-21.88104 3.59834,-1.87854 6.82625,-2.96334 12.72646,-2.96334 5.90021,0 13.229156,0.1323 18.970619,0.21167 2.61937,0.0529 4.97416,0.0794 6.82625,0.10583 6.79979,-0.1852 8.20208,-1.95791 9.97479,-4.15395 2.88395,-3.59834 5.9002,-6.35 16.1925,-6.35 11.3506204,0 209.708761,1.19062 211.693131,1.21708 1.03188,0 1.74625,-0.50271 2.14313,-0.92604 0.635,-0.68792 1.00541,-1.64042 0.9525,-2.64584 -0.0529,-1.1377 -0.10584,-2.46062 -0.18521,-3.91583 -0.39688,-8.25501 -0.9525,-19.57918 -0.0794,-25.10897 1.48167,-9.3927 7.19667,-12.06499 12.25021,-14.41978 3.20146,-1.50813 6.21771,-2.91042 8.75771,-5.92667 3.14854,-3.75708 2.35479,-10.87438 1.61396,-17.75354 -0.58209,-5.42396 -1.21709,-11.05959 -0.0265,-15.6898 1.45521,-5.74146 5.47687,-9.15458 11.93271,-10.13354 5.74146,-0.87312 14.39333,-1.03187 22.59541,-0.37042 10.26584,0.82021 29.05125,3.3073 38.57625,6.85271 17.56834,6.56167 29.5275,18.46792 35.53355,35.40126 8.41375,23.73312 7.35541,42.73021 6.35,61.09229 -0.29105,5.08 -1.69334,11.80042 -10.6098,11.80042 v 0 c -5.05354,0 -13.70541,-0.3175 -20.6375,-0.58208 -2.59291,-0.10584 -5.08,-0.18521 -7.01145,-0.26459 -2.2225,-0.0794 -4.36563,0.58209 -6.00605,1.87854 -2.91041,2.24896 -3.4925,5.15938 -1.74625,8.91646 0.4498,0.9525 1.03188,2.16959 1.7198,3.59834 2.51354,5.21229 5.97958,12.35603 7.06437,16.37769 3.30729,12.30313 0.89958,24.65917 -6.77333,34.79271 -4.63021,6.13834 -11.08604,11.24479 -18.67959,14.76375 -7.77875,3.65125 -16.80104,5.60917 -26.035,5.715 -2.7252,0.0265 -5.97958,0.0794 -9.73666,0.10584 -25.87625,0.42333 -72.39,0.97895 -127.5821,0.97895 z";
    
    // Create Path2D object from SVG path data
    this.trackSVGPath = new Path2D(svgPathData);
    
    // Convert path to points for position calculations
    this.convertSVGPathToPoints(svgPathData);
    
    // Set your custom start/finish line position (red rectangle from the SVG)
    this.startFinishCoords = { x: 139.96884, y: 505.50729 };
    
    // Set your corner markers from the SVG
    this.cornerMarkers = [
      { coords: { x: -16.673576, y: 501.79282 }, text: "1" },
      { coords: { x: -25.347214, y: 473.10086 }, text: "2" },
      { coords: { x: -63.520531, y: 469.34137 }, text: "3" },
      { coords: { x: -90.704567, y: 415.84088 }, text: "4" },
      { coords: { x: -36.039398, y: 430.29352 }, text: "5" },
      { coords: { x: -21.298529, y: 398.48938 }, text: "6" },
      { coords: { x: 205.71706, y: 414.3949 }, text: "7" },
      { coords: { x: 188.37593, y: 366.9556 }, text: "8" },
      { coords: { x: 229.43178, y: 358.8696 }, text: "9" },
      { coords: { x: 211.80443, y: 304.79269 }, text: "10" },
      { coords: { x: 309.53891, y: 347.59158 }, text: "11" },
      { coords: { x: 316.19919, y: 415.55069 }, text: "12" },
      { coords: { x: 273.97668, y: 427.69131 }, text: "13" },
      { coords: { x: 302.3071, y: 492.18753 }, text: "14" }
    ];
    
    console.log('Loaded custom track with start/finish line and corner markers');
  }
  // Convert SVG path to coordinate points for car positioning
  convertSVGPathToPoints(pathData) {
    // Parse the actual SVG path data to get real track coordinates
    // This creates points along the actual Indianapolis track shape
    
    // For now, let's sample points along the actual SVG path
    // We'll extract coordinates from the path data
    const path = new Path2D(pathData);
    
    // Sample points along the path - this is a simplified approach
    // In reality, you'd want to use a proper SVG path parser
    this.trackPoints = [];
    
    // Extract rough coordinates from the path data string
    // The path starts around coordinates that we can estimate from the path data
    const coords = this.extractCoordsFromPath(pathData);
    
    this.trackPoints = coords;
    
    // Calculate bounds from actual coordinates
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    this.trackPoints.forEach(point => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });
    
    this.trackBounds = { minX, maxX, minY, maxY };
    
    console.log('Track bounds:', this.trackBounds);
    console.log('Track points count:', this.trackPoints.length);
  }
  
  extractCoordsFromPath(pathData) {
    // Simple extraction of coordinates from SVG path
    // This is a basic parser - for production you'd want something more robust
    const coords = [];
    
    // Extract all number pairs from the path data
    const numbers = pathData.match(/[-+]?\d*\.?\d+/g) || [];
    
    // Group numbers into x,y pairs
    for (let i = 0; i < numbers.length - 1; i += 2) {
      const x = parseFloat(numbers[i]);
      const y = parseFloat(numbers[i + 1]);
      
      if (!isNaN(x) && !isNaN(y)) {
        coords.push({ x, y });
      }
    }
    
    return coords;
  }

  cacheInfoElements() {
    this.infoElements = {
      carAheadDistance: document.getElementById('carAheadDistance'),
      carBehindDistance: document.getElementById('carBehindDistance'),
      fuelLevelPercent: document.getElementById('fuelLevelPercent'),
      estimatedLaps: document.getElementById('estimatedLaps')
    };
  }
  
  setupListeners() {
    // Simple telemetry tracking for position and car data
    this.socket.on('telemetry', (data) => {
      const values = data?.values;
      if (!values) return;
      
      const { LapDistPct, CarDistAhead, CarDistBehind, FuelLevel, FuelLevelPct, Position } = values;
      
      // Update position and car data
      this.liveLapPct = LapDistPct || 0;
      this.carAheadDistance = CarDistAhead || 0;
      this.carBehindDistance = CarDistBehind || 0;
      this.fuelLevel = FuelLevel || 0;
      this.fuelLevelPct = FuelLevelPct || 0;
      this.playerPosition = Position || 0; // Player's current race position
      
      // Update info boxes
      this.updateInfoBoxes();
      
      // Get fuel data from telemetry dashboard if available
      if (window.telemetryDashboard && typeof window.telemetryDashboard.getFuelData === 'function') {
        const fuelData = window.telemetryDashboard.getFuelData();
        this.avgFuelPerLap = fuelData.avgFuelPerLap || 0;
        this.tankCapacity = fuelData.maxFuel || 104;
      }
    });
  }
  
  updateInfoBoxes() {
    // Update car distances
    if (this.infoElements.carAheadDistance) {
      this.infoElements.carAheadDistance.textContent = this.carAheadDistance > 0 
        ? `${this.carAheadDistance.toFixed(1)} m` 
        : '-- m';
    }
    
    if (this.infoElements.carBehindDistance) {
      this.infoElements.carBehindDistance.textContent = this.carBehindDistance > 0 
        ? `${this.carBehindDistance.toFixed(1)} m` 
        : '-- m';
    }
    
    // Update fuel level percentage
    if (this.infoElements.fuelLevelPercent) {
      this.infoElements.fuelLevelPercent.textContent = this.fuelLevelPct > 0 
        ? `${(this.fuelLevelPct * 100).toFixed(1)}%` 
        : `${this.fuelLevel > 0 && this.tankCapacity > 0 ? ((this.fuelLevel / this.tankCapacity) * 100).toFixed(1) : '--'}%`;
    }
    
    // Update estimated laps remaining
    if (this.infoElements.estimatedLaps) {
      const estimatedLaps = this.calculateEstimatedLaps();
      this.infoElements.estimatedLaps.textContent = estimatedLaps > 0 
        ? estimatedLaps.toFixed(1) 
        : '--';
    }
  }
  
  calculateEstimatedLaps() {
    if (this.fuelLevel <= 0 || this.avgFuelPerLap <= 0) {
      return 0;
    }
    return this.fuelLevel / this.avgFuelPerLap;
  }
  
  drawOtherCars(scale, offsetX, offsetY, circleRadius) {
    // Calculate approximate track length
    let trackLength = 0;
    for (let i = 0; i < this.trackPoints.length; i++) {
      const curr = this.trackPoints[i];
      const next = this.trackPoints[(i + 1) % this.trackPoints.length];
      trackLength += Math.hypot(next.x - curr.x, next.y - curr.y);
    }
    
    // Debug logging occasionally
    if (Math.random() < 0.01) {
      console.log('Car positions:', {
        playerPosition: this.playerPosition,
        carAheadDistance: this.carAheadDistance,
        carBehindDistance: this.carBehindDistance,
        trackLength: trackLength.toFixed(0)
      });
    }
    
    // Draw car ahead (only if player is not in 1st place)
    if (this.playerPosition > 1 && this.carAheadDistance > 0 && this.carAheadDistance < trackLength) {
      const aheadPct = this.calculateCarPosition(this.liveLapPct, this.carAheadDistance, trackLength, true);
      const aheadPos = this.getPositionFromPercent(aheadPct);
      
      if (aheadPos) {
        const aheadX = aheadPos.x * scale + offsetX;
        const aheadY = aheadPos.y * scale + offsetY;
        const aheadPosition = this.playerPosition - 1; // Car ahead is one position better
        
        // Grey circle with white text
        this.drawCarCircle(aheadX, aheadY, circleRadius, '#808080', 'white', aheadPosition);
      }
    }
    
    // Draw car behind
    if (this.carBehindDistance > 0 && this.carBehindDistance < trackLength) {
      const behindPct = this.calculateCarPosition(this.liveLapPct, this.carBehindDistance, trackLength, false);
      const behindPos = this.getPositionFromPercent(behindPct);
      
      if (behindPos) {
        const behindX = behindPos.x * scale + offsetX;
        const behindY = behindPos.y * scale + offsetY;
        const behindPosition = this.playerPosition + 1; // Car behind is one position worse
        
        // White circle with black text
        this.drawCarCircle(behindX, behindY, circleRadius, 'white', 'black', behindPosition);
      }
    }
  }

  calculateCarPosition(playerPct, distance, trackLength, isAhead) {
    const distancePct = distance / trackLength;
    
    if (isAhead) {
      let aheadPct = playerPct + distancePct;
      if (aheadPct > 1) aheadPct -= 1;
      return aheadPct;
    } else {
      let behindPct = playerPct - distancePct;
      if (behindPct < 0) behindPct += 1;
      return behindPct;
    }
  }

  startAnimation() {
    requestAnimationFrame(this.drawTrack.bind(this));
  }

  // Draw the track using SVG path
  drawTrack() {
    this.trackCtx.clearRect(0, 0, this.trackCanvas.width, this.trackCanvas.height);
    
    if (!this.trackSVGPath || this.trackPoints.length === 0) {
      requestAnimationFrame(this.drawTrack.bind(this));
      return;
    }
    
    // Calculate scaling to fit canvas with proper padding
    const padding = 60; // Increased padding to ensure full track visibility
    const trackWidth = this.trackBounds.maxX - this.trackBounds.minX;
    const trackHeight = this.trackBounds.maxY - this.trackBounds.minY;
    const scaleX = (this.trackCanvas.width - padding * 2) / trackWidth;
    const scaleY = (this.trackCanvas.height - padding * 2) / trackHeight;
    const scale = Math.min(scaleX, scaleY) * 0.8; // Scale down by 20% to ensure full visibility
    
    const offsetX = (this.trackCanvas.width - trackWidth * scale) / 2 - this.trackBounds.minX * scale;
    const offsetY = (this.trackCanvas.height - trackHeight * scale) / 2 - this.trackBounds.minY * scale;
    
    // Transform and draw the SVG path
    this.trackCtx.save();
    this.trackCtx.translate(offsetX, offsetY);
    this.trackCtx.scale(scale, scale);
    
    // Draw track outline
    this.trackCtx.strokeStyle = 'white';
    this.trackCtx.lineWidth = 3 / scale; // Slightly thicker line for better visibility
    this.trackCtx.stroke(this.trackSVGPath);
    
    this.trackCtx.restore();
    
    // Draw custom start/finish line if available
    if (this.startFinishCoords) {
      const startX = this.startFinishCoords.x * scale + offsetX;
      const startY = this.startFinishCoords.y * scale + offsetY;
      
      this.trackCtx.strokeStyle = 'red';
      this.trackCtx.lineWidth = 4;
      this.trackCtx.beginPath();
      this.trackCtx.moveTo(startX - 10, startY - 10);
      this.trackCtx.lineTo(startX + 10, startY + 10);
      this.trackCtx.moveTo(startX - 10, startY + 10);
      this.trackCtx.lineTo(startX + 10, startY - 10);
      this.trackCtx.stroke();
      
      this.trackCtx.fillStyle = 'red';
      this.trackCtx.font = '12px Arial';
      this.trackCtx.textAlign = 'center';
      this.trackCtx.fillText('S/F', startX, startY - 15);
    }
    
    // Draw corner markers if available
    if (this.cornerMarkers && this.cornerMarkers.length > 0) {
      this.cornerMarkers.forEach(marker => {
        const markerX = marker.coords.x * scale + offsetX;
        const markerY = marker.coords.y * scale + offsetY;
        
        this.trackCtx.fillStyle = 'yellow';
        this.trackCtx.font = 'bold 14px Arial';
        this.trackCtx.textAlign = 'center';
        this.trackCtx.textBaseline = 'middle';
        this.trackCtx.fillText(marker.text, markerX, markerY);
      });
    }
    
    // Debug: Show where we think lap 0% is (should be at start/finish line)
    const debugStartPoint = this.startFinishCoords || this.trackPoints[0];
    const debugX = debugStartPoint.x * scale + offsetX;
    const debugY = debugStartPoint.y * scale + offsetY;
    
    // Draw a cyan circle to show our current 0% assumption
    this.trackCtx.fillStyle = 'cyan';
    this.trackCtx.beginPath();
    this.trackCtx.arc(debugX, debugY, 8, 0, 2 * Math.PI);
    this.trackCtx.fill();
    
    // Add text label
    this.trackCtx.fillStyle = 'cyan';
    this.trackCtx.font = '12px Arial';
    this.trackCtx.textAlign = 'center';
    this.trackCtx.fillText('0%', debugX, debugY - 12);
    
    // Draw car position
    this.drawCarPosition(scale, offsetX, offsetY);
    
    requestAnimationFrame(this.drawTrack.bind(this));
  }
  
  drawCarPosition(scale, offsetX, offsetY) {
    if (this.liveLapPct <= 0 || this.liveLapPct > 1 || this.trackPoints.length === 0) return;
    
    // Get position along track
    const position = this.getPositionFromPercent(this.liveLapPct);
    if (!position) return;
    
    const markerX = position.x * scale + offsetX;
    const markerY = position.y * scale + offsetY;
    const circleRadius = 12;
    
    // Draw player car - Pink circle with white text
    this.drawCarCircle(markerX, markerY, circleRadius, '#ff69b4', 'white', this.playerPosition);
    
    // Draw cars ahead and behind
    this.drawOtherCars(scale, offsetX, offsetY, circleRadius);
  }
  
  drawCarCircle(x, y, radius, fillColor, textColor, positionNumber) {
    // Draw colored circle
    this.trackCtx.fillStyle = fillColor;
    this.trackCtx.beginPath();
    this.trackCtx.arc(x, y, radius, 0, 2 * Math.PI);
    this.trackCtx.fill();
    
    // Add subtle border
    this.trackCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.trackCtx.lineWidth = 1;
    this.trackCtx.stroke();
    
    // Draw position number
    if (positionNumber && positionNumber > 0) {
      this.trackCtx.fillStyle = textColor;
      this.trackCtx.font = 'bold 12px Orbitron, monospace';
      this.trackCtx.textAlign = 'center';
      this.trackCtx.textBaseline = 'middle';
      this.trackCtx.fillText(positionNumber.toString(), x, y);
    }
  }
  
  getPositionFromPercent(pct) {
    if (this.trackPoints.length === 0 || pct < 0 || pct > 1) return null;
    
    // If we have a custom start/finish line position, use it to calibrate the track
    if (this.startFinishCoords) {
      // Find the closest track point to our start/finish line
      let closestIndex = 0;
      let minDistance = Infinity;
      
      for (let i = 0; i < this.trackPoints.length; i++) {
        const point = this.trackPoints[i];
        const distance = Math.hypot(
          point.x - this.startFinishCoords.x,
          point.y - this.startFinishCoords.y
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }
      
      // Calculate position relative to the start/finish line
      const adjustedIdx = (closestIndex + Math.floor(pct * this.trackPoints.length)) % this.trackPoints.length;
      const nextIdx = (adjustedIdx + 1) % this.trackPoints.length;
      const t = (pct * this.trackPoints.length) - Math.floor(pct * this.trackPoints.length);
      
      const currentPoint = this.trackPoints[adjustedIdx];
      const nextPoint = this.trackPoints[nextIdx];
      
      return {
        x: currentPoint.x + (nextPoint.x - currentPoint.x) * t,
        y: currentPoint.y + (nextPoint.y - currentPoint.y) * t
      };
    }
    
    // Fallback to old method if no start/finish line defined
    const idx = Math.floor(pct * this.trackPoints.length);
    const nextIdx = (idx + 1) % this.trackPoints.length;
    const t = (pct * this.trackPoints.length) - idx;
    
    const currentPoint = this.trackPoints[idx];
    const nextPoint = this.trackPoints[nextIdx];
    
    return {
      x: currentPoint.x + (nextPoint.x - currentPoint.x) * t,
      y: currentPoint.y + (nextPoint.y - currentPoint.y) * t
    };
  }

  updateInfoBoxes() {
    if (this.infoElements.carAheadDistance) {
      this.infoElements.carAheadDistance.textContent = this.carAheadDistance > 0 
        ? `${this.carAheadDistance.toFixed(1)} m` 
        : '-- m';
    }
    
    if (this.infoElements.carBehindDistance) {
      this.infoElements.carBehindDistance.textContent = this.carBehindDistance > 0 
        ? `${this.carBehindDistance.toFixed(1)} m` 
        : '-- m';
    }
    
    if (this.infoElements.fuelLevelPercent) {
      this.infoElements.fuelLevelPercent.textContent = this.fuelLevelPct > 0 
        ? `${(this.fuelLevelPct * 100).toFixed(1)}%` 
        : `${this.fuelLevel > 0 && this.tankCapacity > 0 ? ((this.fuelLevel / this.tankCapacity) * 100).toFixed(1) : '--'}%`;
    }
    
    if (this.infoElements.estimatedLaps) {
      const estimatedLaps = this.calculateEstimatedLaps();
      this.infoElements.estimatedLaps.textContent = estimatedLaps > 0 
        ? estimatedLaps.toFixed(1) 
        : '--';
    }
  }
  
  calculateEstimatedLaps() {
    if (this.fuelLevel <= 0 || this.avgFuelPerLap <= 0) {
      return 0;
    }
    return this.fuelLevel / this.avgFuelPerLap;
  }
  
  /**
   * Delete track data - for SVG version, this just clears the canvas
   */
  deleteTrackData() {
    this.trackCtx.clearRect(0, 0, this.trackCanvas.width, this.trackCanvas.height);
    console.log('Track view cleared - using SVG track map');
  }
}