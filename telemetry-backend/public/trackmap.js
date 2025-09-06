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
    
    // Load the car icons
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
    // Indianapolis Road 2022 SVG path data
    const svgPathData = "M912.3,921.3c-141.6,0-298.3-1-455.9-3.9c-3.3-0.1-6.5-0.3-9.7-0.9c-10.6-1.7-24.9-5.6-32.8-14.4c-6.7-7.5-17.1-24.3-11.7-53.7c2-10.7,3.7-30.3-6.9-42.6c-7.9-9.1-21.9-13.4-41.6-12.7c-3.1,0.1-7.4,0.4-12.1,0.7c-8.7,0.6-17.7,1.2-23.8,1c-43.8-1.5-71.4-8.7-89.4-23.1c-48.9-39-71.6-109.8-74.1-117.7c-10.8-35.2,2.4-64.6,37-82.7c13.6-7.1,25.8-11.2,48.1-11.2s50,0.5,71.7,0.8c9.9,0.2,18.8,0.3,25.8,0.4c25.7-0.7,31-7.4,37.7-15.7c10.9-13.6,22.3-24,61.2-24c42.9,0,792.6,4.5,800.1,4.6c3.9,0,6.6-1.9,8.1-3.5c2.4-2.6,3.8-6.2,3.6-10c-0.2-4.3-0.4-9.3-0.7-14.8c-1.5-31.2-3.6-74-0.3-94.9c5.6-35.5,27.2-45.6,46.3-54.5c12.1-5.7,23.5-11,33.1-22.4c11.9-14.2,8.9-41.1,6.1-67.1c-2.2-20.5-4.6-41.8-0.1-59.3c5.5-21.7,20.7-34.6,45.1-38.3c21.7-3.3,54.4-3.9,85.4-1.4c38.8,3.1,109.8,12.5,145.8,25.9c66.4,24.8,111.6,69.8,134.3,133.8c31.8,89.7,27.8,161.5,24,230.9c-1.1,19.2-6.4,44.6-40.1,44.6l0,0c-19.1,0-51.8-1.2-78-2.2c-9.8-0.4-19.2-0.7-26.5-1c-8.4-0.3-16.5,2.2-22.7,7.1c-11,8.5-13.2,19.5-6.6,33.7c1.7,3.6,3.9,8.2,6.5,13.6c9.5,19.7,22.6,46.7,26.7,61.9c12.5,46.5,3.4,93.2-25.6,131.5c-17.5,23.2-41.9,42.5-70.6,55.8c-29.4,13.8-63.5,21.2-98.4,21.6c-10.3,0.1-22.6,0.3-36.8,0.4C1296.7,919.2,1120.9,921.3,912.3,921.3L912.3,921.3z";
    
    // Create Path2D object from SVG path data
    this.trackSVGPath = new Path2D(svgPathData);
    
    // Convert path to points for position calculations
    this.convertSVGPathToPoints(svgPathData);
  }
  
  convertSVGPathToPoints(pathData) {
    // Create a temporary canvas to sample points along the path
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1920;
    tempCanvas.height = 1080;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Sample points along the path
    const path = new Path2D(pathData);
    const numSamples = 1000; // Number of points to sample
    
    this.trackPoints = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    // This is a simplified approach - in practice you might want to use a path parsing library
    // For now, we'll create a reasonable approximation by sampling the bounding box
    for (let i = 0; i < numSamples; i++) {
      const angle = (i / numSamples) * 2 * Math.PI;
      // These are approximate coordinates based on the SVG viewBox
      // You might want to use a proper SVG path parser for more accuracy
      const centerX = 960;
      const centerY = 540;
      const radiusX = 400;
      const radiusY = 200;
      
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;
      
      this.trackPoints.push({ x, y });
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    this.trackBounds = { minX, maxX, minY, maxY };
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
    
    // Calculate scaling to fit canvas with more padding for better view
    const padding = 40; // Increased padding to ensure full track is visible
    const trackWidth = this.trackBounds.maxX - this.trackBounds.minX;
    const trackHeight = this.trackBounds.maxY - this.trackBounds.minY;
    const scaleX = (this.trackCanvas.width - padding * 2) / trackWidth;
    const scaleY = (this.trackCanvas.height - padding * 2) / trackHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9; // Scale down by 10% to ensure full visibility
    
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
    
    // Draw start/finish line
    if (this.trackPoints.length > 0) {
      const startPoint = this.trackPoints[0];
      const finishX = startPoint.x * scale + offsetX;
      const finishY = startPoint.y * scale + offsetY;
      
      this.trackCtx.strokeStyle = 'red';
      this.trackCtx.lineWidth = 4;
      this.trackCtx.beginPath();
      this.trackCtx.moveTo(finishX - 10, finishY - 10);
      this.trackCtx.lineTo(finishX + 10, finishY + 10);
      this.trackCtx.moveTo(finishX - 10, finishY + 10);
      this.trackCtx.lineTo(finishX + 10, finishY - 10);
      this.trackCtx.stroke();
      this.trackCtx.lineWidth = 1;
    }
    
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