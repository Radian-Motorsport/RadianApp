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
    
    // Setup responsive canvas
    this.setupResponsiveCanvas();
    
    // Cache info box elements
    this.cacheInfoElements();
    
    // Initialize SVG track
    this.initializeSVGTrack();
    
    // Setup event listeners
    this.setupListeners();
    
    // Start animation
    this.startAnimation();
  }
  
  setupResponsiveCanvas() {
    // Style the canvas for responsive behavior
    this.trackCanvas.style.width = '100%';
    this.trackCanvas.style.height = '400px';
    this.trackCanvas.style.maxWidth = '600px';
    this.trackCanvas.style.display = 'block';
    this.trackCanvas.style.margin = '0 auto';
    
    // Set initial canvas dimensions
    this.handleResize();
    
    // Add resize listener
    window.addEventListener('resize', () => this.handleResize());
  }
  
  handleResize() {
    const rect = this.trackCanvas.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Set canvas internal dimensions for crisp rendering
    this.trackCanvas.width = rect.width * devicePixelRatio;
    this.trackCanvas.height = rect.height * devicePixelRatio;
    
    // Scale context to match device pixel ratio
    this.trackCtx.scale(devicePixelRatio, devicePixelRatio);
    
    // Set CSS size
    this.trackCanvas.style.width = rect.width + 'px';
    this.trackCanvas.style.height = rect.height + 'px';
  }
  
  initializeSVGTrack() {
    // Use your new clean Inkscape track path data (coordinates from 9-242, 62-181)
    const svgPathData = "m 124.93136,181.2191 c -21.47552,0 -45.241132,-0.15167 -69.143246,-0.59149 -0.500492,-0.0152 -0.98582,-0.0456 -1.471136,-0.13649 -1.607631,-0.25783 -3.776419,-0.84932 -4.974551,-2.18396 -1.016147,-1.13747 -2.593439,-3.68541 -1.774466,-8.14431 0.30333,-1.6228 0.561158,-4.59539 -1.046473,-6.46085 -1.198144,-1.38014 -3.321418,-2.03229 -6.309192,-1.92612 -0.470152,0.0151 -1.122303,0.0606 -1.835119,0.10618 -1.319476,0.091 -2.684443,0.18199 -3.609585,0.15166 -6.642848,-0.2275 -10.828748,-1.31947 -13.558685,-3.50342 C 13.792579,152.61543 10.349825,141.87768 9.9706666,140.67955 8.3327039,135.341 10.334658,130.88211 15.582203,128.137 c 2.062623,-1.07681 3.91291,-1.69864 7.295,-1.69864 3.382091,0 7.583152,0.0759 10.874243,0.12135 1.501462,0.0303 2.851266,0.0456 3.912915,0.0606 3.897739,-0.10618 4.70156,-1.12229 5.717707,-2.3811 1.653121,-2.06262 3.382072,-3.63992 9.281777,-3.63992 6.506353,0 120.208255,0.68249 121.345725,0.69765 0.5915,0 1.00097,-0.28816 1.22848,-0.53082 0.36399,-0.39432 0.57631,-0.94032 0.54599,-1.51664 -0.0303,-0.65215 -0.0606,-1.41046 -0.10618,-2.2446 -0.2275,-4.73191 -0.54599,-11.22309 -0.0456,-14.39285 0.84931,-5.384042 4.12524,-6.915843 7.02201,-8.265647 1.83512,-0.864487 3.56408,-1.668296 5.02005,-3.397248 1.80479,-2.153624 1.3498,-6.233361 0.92515,-10.176615 -0.33366,-3.109093 -0.69766,-6.339519 -0.0152,-8.993623 0.83414,-3.291091 3.13942,-5.247543 6.84,-5.8087 3.29109,-0.50048 8.25048,-0.591484 12.95204,-0.212325 5.88453,0.470153 16.65262,1.895785 22.11249,3.928078 10.07044,3.761244 16.92562,10.58609 20.36838,20.292542 4.82288,13.604178 4.21623,24.493608 3.63991,35.019028 -0.16683,2.91193 -0.97065,6.76419 -6.0817,6.76419 v 0 c -2.89677,0 -7.85615,-0.182 -11.82973,-0.33366 -1.48629,-0.0606 -2.91194,-0.10618 -4.01907,-0.15168 -1.27397,-0.0456 -2.50244,0.33367 -3.44275,1.07681 -1.66829,1.28914 -2.00196,2.95744 -1.00098,5.11105 0.25783,0.54599 0.59148,1.24365 0.98581,2.06263 1.44081,2.98776 3.42758,7.08266 4.04941,9.38794 1.89578,7.05234 0.51564,14.13501 -3.88258,19.94371 -2.65411,3.5186 -6.35469,6.44568 -10.70742,8.46281 -4.4589,2.09295 -9.63062,3.21525 -14.92367,3.27592 -1.56213,0.0152 -3.42758,0.0456 -5.5812,0.0606 -14.83265,0.24266 -41.49503,0.56114 -73.132,0.56114 z";
    
    // Create Path2D object from SVG path data
    this.trackSVGPath = new Path2D(svgPathData);
    
    // Convert path to points for position calculations
    this.convertSVGPathToPoints(svgPathData);
    
    // Set your clean start/finish line position (this should match the first point of the path)
    this.startFinishCoords = { x: 124.93136, y: 181.2191 };
    
    // Set your corner markers from the new clean SVG
    this.cornerMarkers = [
      { coords: { x: 51.475407, y: 175.78003 }, text: "1" },
      { coords: { x: 46.50354, y: 159.33336 }, text: "2" },
      { coords: { x: 24.622015, y: 157.17836 }, text: "3" },
      { coords: { x: 9.0397148, y: 126.51107 }, text: "4" },
      { coords: { x: 40.374626, y: 134.79555 }, text: "5" },
      { coords: { x: 48.824314, y: 116.56493 }, text: "6" },
      { coords: { x: 178.95309, y: 125.6822 }, text: "7" },
      { coords: { x: 169.01289, y: 98.489273 }, text: "8" },
      { coords: { x: 192.54672, y: 93.854248 }, text: "9" },
      { coords: { x: 182.44246, y: 62.85656 }, text: "10" },
      { coords: { x: 238.46535, y: 87.389526 }, text: "11" },
      { coords: { x: 242.28313, y: 126.34473 }, text: "12" },
      { coords: { x: 218.08058, y: 133.30392 }, text: "13" },
      { coords: { x: 234.31998, y: 170.27414 }, text: "14" }
    ];
    
    console.log('Loaded clean custom track with start/finish line and corner markers');
    console.log('Start/finish coords:', this.startFinishCoords);
    console.log('Track bounds will be calculated after path parsing...');
  }
  // Convert SVG path to coordinate points for car positioning
  convertSVGPathToPoints(pathData) {
    // Parse the SVG path commands to get actual points along the path
    this.trackPoints = [];
    
    // The path starts at the moveto command coordinates
    let currentX = 124.93136;
    let currentY = 181.2191;
    
    // Add the starting point (this is our start/finish line)
    this.trackPoints.push({ x: currentX, y: currentY });
    
    // Parse the path data to extract curve points
    // The SVG uses relative coordinates (m = moveto, c = curveto)
    const pathCommands = pathData.match(/[mc][^mc]*/gi);
    
    if (pathCommands) {
      pathCommands.forEach((command, index) => {
        if (command.startsWith('c')) {
          // This is a cubic bezier curve command
          const coords = command.slice(1).trim().split(/[\s,]+/).map(Number);
          
          // Sample points along each curve segment
          for (let i = 0; i < coords.length; i += 6) {
            const cp1x = currentX + coords[i];
            const cp1y = currentY + coords[i + 1];
            const cp2x = currentX + coords[i + 2]; 
            const cp2y = currentY + coords[i + 3];
            const endX = currentX + coords[i + 4];
            const endY = currentY + coords[i + 5];
            
            // Sample 10 points along this bezier curve
            for (let t = 0.1; t <= 1; t += 0.1) {
              const x = Math.pow(1-t, 3) * currentX + 
                       3 * Math.pow(1-t, 2) * t * cp1x + 
                       3 * (1-t) * Math.pow(t, 2) * cp2x + 
                       Math.pow(t, 3) * endX;
              const y = Math.pow(1-t, 3) * currentY + 
                       3 * Math.pow(1-t, 2) * t * cp1y + 
                       3 * (1-t) * Math.pow(t, 2) * cp2y + 
                       Math.pow(t, 3) * endY;
              
              this.trackPoints.push({ x, y });
            }
            
            // Update current position
            currentX = endX;
            currentY = endY;
          }
        }
      });
    }
    
    // If we didn't get enough points from parsing, create a fallback oval
    if (this.trackPoints.length < 20) {
      console.log('Path parsing failed, using fallback oval');
      this.trackPoints = [];
      const centerX = 124.93136;
      const centerY = 150;
      const radiusX = 100;
      const radiusY = 30;
      
      for (let i = 0; i < 100; i++) {
        const angle = (i / 100) * Math.PI * 2;
        const x = centerX + radiusX * Math.cos(angle);
        const y = centerY + radiusY * Math.sin(angle);
        this.trackPoints.push({ x, y });
      }
    }
    
    // Calculate bounds
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
    console.log('First few points:', this.trackPoints.slice(0, 5));
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
    
    // Use CSS dimensions for layout calculations
    const rect = this.trackCanvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    // Use the actual SVG coordinate system: 1000x1000 (where the track data exists)
    const svgWidth = 1000;
    const svgHeight = 1000;
    const padding = 20;
    
    // Scale to fit canvas with padding
    const scaleX = (canvasWidth - padding * 2) / svgWidth;
    const scaleY = (canvasHeight - padding * 2) / svgHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Center the scaled SVG in the canvas
    const offsetX = (canvasWidth - svgWidth * scale) / 2;
    const offsetY = (canvasHeight - svgHeight * scale) / 2;
    
    // Transform and draw the SVG path
    this.trackCtx.save();
    this.trackCtx.translate(offsetX, offsetY);
    this.trackCtx.scale(scale, scale);
    
    // Draw track outline
    this.trackCtx.strokeStyle = 'white';
    this.trackCtx.lineWidth = 2 / scale;
    this.trackCtx.stroke(this.trackSVGPath);
    
    this.trackCtx.restore();
    
    // Draw start/finish line perpendicular to track direction
    if (this.startFinishCoords && this.trackPoints.length > 1) {
      const startX = this.startFinishCoords.x * scale + offsetX;
      const startY = this.startFinishCoords.y * scale + offsetY;
      
      // Get track direction at start/finish by looking at next point
      const nextPoint = this.trackPoints[1];
      const dx = nextPoint.x - this.startFinishCoords.x;
      const dy = nextPoint.y - this.startFinishCoords.y;
      const length = Math.hypot(dx, dy);
      
      // Create perpendicular vector
      const perpX = -dy / length;
      const perpY = dx / length;
      const lineLength = 15;
      
      this.trackCtx.strokeStyle = 'red';
      this.trackCtx.lineWidth = 3;
      this.trackCtx.beginPath();
      this.trackCtx.moveTo(
        startX + perpX * lineLength * scale, 
        startY + perpY * lineLength * scale
      );
      this.trackCtx.lineTo(
        startX - perpX * lineLength * scale, 
        startY - perpY * lineLength * scale
      );
      this.trackCtx.stroke();
    }
    
    // Draw corner numbers
    if (this.cornerMarkers) {
      this.cornerMarkers.forEach(marker => {
        const markerX = marker.coords.x * scale + offsetX;
        const markerY = marker.coords.y * scale + offsetY;
        
        // Draw corner number circle
        this.trackCtx.fillStyle = 'yellow';
        this.trackCtx.beginPath();
        this.trackCtx.arc(markerX, markerY, 8, 0, 2 * Math.PI);
        this.trackCtx.fill();
        
        // Draw corner number text
        this.trackCtx.fillStyle = 'black';
        this.trackCtx.font = 'bold 10px Arial';
        this.trackCtx.textAlign = 'center';
        this.trackCtx.textBaseline = 'middle';
        this.trackCtx.fillText(marker.text, markerX, markerY);
      });
    }
    
    // Draw car position
    this.drawCarPosition(scale, offsetX, offsetY);
    
    requestAnimationFrame(this.drawTrack.bind(this));
  }
  
  drawCarPosition(scale, offsetX, offsetY) {
    // For testing, use a fixed position if no telemetry
    const testPct = this.liveLapPct > 0 ? this.liveLapPct : 0.25; // Test at 25% around track
    
    if (testPct <= 0 || testPct > 1 || this.trackPoints.length === 0) return;
    
    // Get position along track
    const position = this.getPositionFromPercent(testPct);
    if (!position) return;
    
    const markerX = position.x * scale + offsetX;
    const markerY = position.y * scale + offsetY;
    const circleRadius = 12;
    
    // Draw player car - Pink circle with white text
    this.drawCarCircle(markerX, markerY, circleRadius, '#ff69b4', 'white', this.playerPosition || 1);
    
    // Draw cars ahead and behind only if we have real telemetry
    if (this.liveLapPct > 0) {
      this.drawOtherCars(scale, offsetX, offsetY, circleRadius);
    }
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
    
    // Simple: 0% = start/finish line, progress around track clockwise
    const totalPoints = this.trackPoints.length;
    const targetIndex = Math.floor(pct * totalPoints);
    const nextIndex = (targetIndex + 1) % totalPoints;
    const t = (pct * totalPoints) - targetIndex;
    
    const currentPoint = this.trackPoints[targetIndex];
    const nextPoint = this.trackPoints[nextIndex];
    
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