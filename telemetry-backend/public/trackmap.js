class TrackMap {
  constructor(socket, containerId) {
    this.socket = socket;
    this.container = document.getElementById(containerId);
    
    // Track variables
    this.liveLapPct = 0;
    this.trackPath = null;
    this.pathLength = 0;
    this.startPosition = 0;
    
    // Car positioning data
    this.carDistAhead = null;
    this.carDistBehind = null;
    this.trackLength = 0; // Will be calculated from track data
    
    // Class position tracking
    this.playerCarIdx = null;
    this.playerClassPosition = null;
    this.playerPosition = null;
    this.carIdxClassPosition = null; // Array of all car positions
    this.carIdxPosition = null; // Array of all overall positions
    this.carIdxLapDistPct = null; // Array of all car lap distances
    this.carIdxLapCompleted = null; // Array of all car lap counts
    this.carIdxLastLapTime = null; // Array of all car last lap times
    this.carIdxBestLapTime = null; // Array of all car best lap times
    this.playerLapCompleted = null; // Player's lap count
    this.carAheadIdx = null;
    this.carBehindIdx = null;
    this.driverInfo = null; // Session driver info
    
    // Cache info box elements
    this.cacheInfoElements();
    
    // Initialize SVG track
    this.initializeSVGTrack();
    
    // Setup event listeners
    this.setupListeners();
  }

  initializeSVGTrack() {
    // Create SVG element with exact attributes from your original
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '1000');
    this.svg.setAttribute('height', '1000');
    this.svg.setAttribute('viewBox', '0 0 264.58333 264.58333');
    this.svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    this.svg.style.width = '100%';
    this.svg.style.height = '800px';
    
    // Create track path
    this.trackPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.trackPath.setAttribute('d', 'm 124.93136,181.2191 c -21.47552,0 -45.241132,-0.15167 -69.143246,-0.59149 -0.500492,-0.0152 -0.98582,-0.0456 -1.471136,-0.13649 -1.607631,-0.25783 -3.776419,-0.84932 -4.974551,-2.18396 -1.016147,-1.13747 -2.593439,-3.68541 -1.774466,-8.14431 0.30333,-1.6228 0.561158,-4.59539 -1.046473,-6.46085 -1.198144,-1.38014 -3.321418,-2.03229 -6.309192,-1.92612 -0.470152,0.0151 -1.122303,0.0606 -1.835119,0.10618 -1.319476,0.091 -2.684443,0.18199 -3.609585,0.15166 -6.642848,-0.2275 -10.828748,-1.31947 -13.558685,-3.50342 C 13.792579,152.61543 10.349825,141.87768 9.9706666,140.67955 8.3327039,135.341 10.334658,130.88211 15.582203,128.137 c 2.062623,-1.07681 3.91291,-1.69864 7.295,-1.69864 3.382091,0 7.583152,0.0759 10.874243,0.12135 1.501462,0.0303 2.851266,0.0456 3.912915,0.0606 3.897739,-0.10618 4.70156,-1.12229 5.717707,-2.3811 1.653121,-2.06262 3.382072,-3.63992 9.281777,-3.63992 6.506353,0 120.208255,0.68249 121.345725,0.69765 0.5915,0 1.00097,-0.28816 1.22848,-0.53082 0.36399,-0.39432 0.57631,-0.94032 0.54599,-1.51664 -0.0303,-0.65215 -0.0606,-1.41046 -0.10618,-2.2446 -0.2275,-4.73191 -0.54599,-11.22309 -0.0456,-14.39285 0.84931,-5.384042 4.12524,-6.915843 7.02201,-8.265647 1.83512,-0.864487 3.56408,-1.668296 5.02005,-3.397248 1.80479,-2.153624 1.3498,-6.233361 0.92515,-10.176615 -0.33366,-3.109093 -0.69766,-6.339519 -0.0152,-8.993623 0.83414,-3.291091 3.13942,-5.247543 6.84,-5.8087 3.29109,-0.50048 8.25048,-0.591484 12.95204,-0.212325 5.88453,0.470153 16.65262,1.895785 22.11249,3.928078 10.07044,3.761244 16.92562,10.58609 20.36838,20.292542 4.82288,13.604178 4.21623,24.493608 3.63991,35.019028 -0.16683,2.91193 -0.97065,6.76419 -6.0817,6.76419 v 0 c -2.89677,0 -7.85615,-0.182 -11.82973,-0.33366 -1.48629,-0.0606 -2.91194,-0.10618 -4.01907,-0.15168 -1.27397,-0.0456 -2.50244,0.33367 -3.44275,1.07681 -1.66829,1.28914 -2.00196,2.95744 -1.00098,5.11105 0.25783,0.54599 0.59148,1.24365 0.98581,2.06263 1.44081,2.98776 3.42758,7.08266 4.04941,9.38794 1.89578,7.05234 0.51564,14.13501 -3.88258,19.94371 -2.65411,3.5186 -6.35469,6.44568 -10.70742,8.46281 -4.4589,2.09295 -9.63062,3.21525 -14.92367,3.27592 -1.56213,0.0152 -3.42758,0.0456 -5.5812,0.0606 -14.83265,0.24266 -41.49503,0.56114 -73.132,0.56114 z');
    this.trackPath.setAttribute('fill', 'none');
    this.trackPath.setAttribute('stroke', '#ffffff');
    this.trackPath.setAttribute('stroke-width', '1.14643');
    
    // Create start/finish line
    this.startFinishRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.startFinishRect.setAttribute('x', '141.26521');
    this.startFinishRect.setAttribute('y', '177.90924');
    this.startFinishRect.setAttribute('width', '1.1603841');
    this.startFinishRect.setAttribute('height', '6.796535');
    this.startFinishRect.setAttribute('fill', '#ff0000');
    
    // Create car marker
    this.carMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.carMarker.setAttribute('r', '2');
    this.carMarker.setAttribute('fill', '#00ff00');
    this.carMarker.setAttribute('stroke', '#ffffff');
    this.carMarker.setAttribute('stroke-width', '0.5');
    
    // Create car ahead marker
    this.carAheadMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.carAheadMarker.setAttribute('r', '1.5');
    this.carAheadMarker.setAttribute('fill', '#ff6600');
    this.carAheadMarker.setAttribute('stroke', '#ffffff');
    this.carAheadMarker.setAttribute('stroke-width', '0.3');
    this.carAheadMarker.style.display = 'none'; // Hidden by default
    
    // Create car ahead lap indicator ring
    this.carAheadRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.carAheadRing.setAttribute('r', '2.5');
    this.carAheadRing.setAttribute('fill', 'none');
    this.carAheadRing.setAttribute('stroke-width', '0.8');
    this.carAheadRing.style.display = 'none'; // Hidden by default
    
    // Add title for tooltip
    const aheadTitle = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    aheadTitle.textContent = 'Car Ahead';
    this.carAheadMarker.appendChild(aheadTitle);
    
    // Create car behind marker
    this.carBehindMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.carBehindMarker.setAttribute('r', '1.5');
    this.carBehindMarker.setAttribute('fill', '#0066ff');
    this.carBehindMarker.setAttribute('stroke', '#ffffff');
    this.carBehindMarker.setAttribute('stroke-width', '0.3');
    this.carBehindMarker.style.display = 'none'; // Hidden by default
    
    // Create car behind lap indicator ring
    this.carBehindRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.carBehindRing.setAttribute('r', '2.5');
    this.carBehindRing.setAttribute('fill', 'none');
    this.carBehindRing.setAttribute('stroke-width', '0.8');
    this.carBehindRing.style.display = 'none'; // Hidden by default
    
    // Add title for tooltip
    const behindTitle = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    behindTitle.textContent = 'Car Behind';
    this.carBehindMarker.appendChild(behindTitle);
    
    // Add elements to SVG
    this.svg.appendChild(this.trackPath);
    this.svg.appendChild(this.startFinishRect);
    this.svg.appendChild(this.carMarker);
    this.svg.appendChild(this.carAheadRing);
    this.svg.appendChild(this.carAheadMarker);
    this.svg.appendChild(this.carBehindRing);
    this.svg.appendChild(this.carBehindMarker);
    
    // Add corner numbers
    this.addCornerNumbers();
    
    // Add SVG to container
    this.container.appendChild(this.svg);
    
    // Calculate path properties
    this.pathLength = this.trackPath.getTotalLength();
    this.calculateStartPosition();
    
    // Initialize track length - will be set from official session data
    // Default estimate used until sessionInfo arrives with official TrackLength
    this.trackLength = 3000; // Default estimate in meters
    
    // Initialize car marker at start position
    this.updateCarPosition(0);
  }

  addCornerNumbers() {
    const corners = [
      {x: "51.475407", y: "175.78003", text: "1"},
      {x: "46.50354", y: "159.33336", text: "2"},
      {x: "24.622015", y: "157.17836", text: "3"},
      {x: "9.0397148", y: "126.51107", text: "4"},
      {x: "40.374626", y: "134.79555", text: "5"},
      {x: "48.824314", y: "116.56493", text: "6"},
      {x: "178.95309", y: "125.6822", text: "7"},
      {x: "169.01289", y: "98.489273", text: "8"},
      {x: "192.54672", y: "93.854248", text: "9"},
      {x: "182.44246", y: "62.85656", text: "10"},
      {x: "238.46535", y: "87.389526", text: "11"},
      {x: "242.28313", y: "126.34473", text: "12"},
      {x: "218.08058", y: "133.30392", text: "13"},
      {x: "234.31998", y: "170.27414", text: "14"}
    ];

    corners.forEach(corner => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('xml:space', 'preserve');
      text.setAttribute('style', 'font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:6.85508px;line-height:3.59033px;font-family:\'Road Rage\';-inkscape-font-specification:\'Road Rage\';fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.655815;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1');
      text.setAttribute('x', corner.x);
      text.setAttribute('y', corner.y);
      
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('sodipodi:role', 'line');
      tspan.setAttribute('style', 'font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:6.85508px;font-family:\'Road Rage\';-inkscape-font-specification:\'Road Rage\';fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.655815;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1');
      tspan.setAttribute('x', corner.x);
      tspan.setAttribute('y', corner.y);
      tspan.textContent = corner.text;
      
      text.appendChild(tspan);
      this.svg.appendChild(text);
    });
  }

  calculateStartPosition() {
    // Find closest point on path to start/finish rectangle
    const rectCenterX = 141.26521 + (1.1603841 / 2);
    const rectCenterY = 177.90924 + (6.796535 / 2);
    
    let closestDistance = Infinity;
    this.startPosition = 0;
    
    for (let i = 0; i <= this.pathLength; i += 1) {
      const point = this.trackPath.getPointAtLength(i);
      const distance = Math.sqrt(Math.pow(point.x - rectCenterX, 2) + Math.pow(point.y - rectCenterY, 2));
      if (distance < closestDistance) {
        closestDistance = distance;
        this.startPosition = i;
      }
    }
  }

  updateCarPosition(lapPct) {
    this.liveLapPct = lapPct;
    
    // Calculate position along path from start/finish line
    const positionAlongPath = (this.startPosition + (this.pathLength * lapPct)) % this.pathLength;
    const point = this.trackPath.getPointAtLength(positionAlongPath);
    
    // Update car marker position
    this.carMarker.setAttribute('cx', point.x);
    this.carMarker.setAttribute('cy', point.y);
    
    // Update ahead/behind car positions if distance data is available
    this.updateRelativeCarPositions();
  }
  
  updateRelativeCarPositions() {
    // Update car ahead position using class position data
    if (this.carAheadIdx !== null && this.carIdxLapDistPct && this.carIdxLapDistPct[this.carAheadIdx] !== undefined) {
      const aheadLapPct = this.carIdxLapDistPct[this.carAheadIdx];
      const aheadPositionAlongPath = (this.startPosition + (this.pathLength * aheadLapPct)) % this.pathLength;
      const aheadPoint = this.trackPath.getPointAtLength(aheadPositionAlongPath);
      
      this.carAheadMarker.setAttribute('cx', aheadPoint.x);
      this.carAheadMarker.setAttribute('cy', aheadPoint.y);
      this.carAheadMarker.style.display = 'block';
      
      // Update lap indicator ring
      this.carAheadRing.setAttribute('cx', aheadPoint.x);
      this.carAheadRing.setAttribute('cy', aheadPoint.y);
      this.updateLapIndicator(this.carAheadIdx, this.carAheadRing);
    } else {
      this.carAheadMarker.style.display = 'none';
      this.carAheadRing.style.display = 'none';
    }
    
    // Update car behind position using class position data
    if (this.carBehindIdx !== null && this.carIdxLapDistPct && this.carIdxLapDistPct[this.carBehindIdx] !== undefined) {
      const behindLapPct = this.carIdxLapDistPct[this.carBehindIdx];
      const behindPositionAlongPath = (this.startPosition + (this.pathLength * behindLapPct)) % this.pathLength;
      const behindPoint = this.trackPath.getPointAtLength(behindPositionAlongPath);
      
      this.carBehindMarker.setAttribute('cx', behindPoint.x);
      this.carBehindMarker.setAttribute('cy', behindPoint.y);
      this.carBehindMarker.style.display = 'block';
      
      // Update lap indicator ring
      this.carBehindRing.setAttribute('cx', behindPoint.x);
      this.carBehindRing.setAttribute('cy', behindPoint.y);
      this.updateLapIndicator(this.carBehindIdx, this.carBehindRing);
    } else {
      this.carBehindMarker.style.display = 'none';
      this.carBehindRing.style.display = 'none';
    }
  }
  
  updateLapIndicator(carIdx, ringElement) {
    if (!this.carIdxLapCompleted || this.playerLapCompleted === null || carIdx === null) {
      ringElement.style.display = 'none';
      return;
    }
    
    const carLapCompleted = this.carIdxLapCompleted[carIdx];
    if (carLapCompleted === undefined) {
      ringElement.style.display = 'none';
      return;
    }
    
    const lapDifference = carLapCompleted - this.playerLapCompleted;
    
    if (lapDifference === 0) {
      // Same lap - no ring
      ringElement.style.display = 'none';
    } else if (lapDifference < 0) {
      // Car is behind by laps - green ring
      ringElement.setAttribute('stroke', '#00ff00');
      ringElement.style.display = 'block';
    } else {
      // Car is ahead by laps - red ring
      ringElement.setAttribute('stroke', '#ff0000');
      ringElement.style.display = 'block';
    }
  }
  
  calculateDistanceBetweenCars(lapPct1, lapPct2) {
    // Calculate distance between two cars based on their lap percentages
    let diff = Math.abs(lapPct2 - lapPct1);
    
    // Handle wrap-around case (one car near finish, other near start)
    if (diff > 0.5) {
      diff = 1.0 - diff;
    }
    
    return diff * this.trackLength;
  }
  
  getDriverInfo(carIdx) {
    if (!this.driverInfo || !this.driverInfo.Drivers || !this.driverInfo.Drivers[carIdx]) {
      return { driverName: '--', carName: '--' };
    }
    
    const driver = this.driverInfo.Drivers[carIdx];
    return {
      driverName: driver.UserName || '--',
      carName: driver.CarScreenName || '--'
    };
  }
  
  formatLapTime(timeInSeconds) {
    if (!timeInSeconds || timeInSeconds <= 0) return '--:--';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
  }
  
  updateCarInfo(carIdx, elements) {
    if (carIdx === null) {
      // Clear all elements
      elements.driver.textContent = '--';
      elements.car.textContent = '--';
      elements.position.textContent = '--';
      elements.classPos.textContent = '--';
      elements.laps.textContent = '--';
      elements.lastLap.textContent = '--:--';
      elements.bestLap.textContent = '--:--';
      return;
    }
    
    // Get driver and car info
    const driverInfo = this.getDriverInfo(carIdx);
    elements.driver.textContent = driverInfo.driverName;
    elements.car.textContent = driverInfo.carName;
    
    // Position info
    if (this.carIdxPosition && this.carIdxPosition[carIdx] !== undefined) {
      elements.position.textContent = this.carIdxPosition[carIdx].toString();
    } else {
      elements.position.textContent = '--';
    }
    
    if (this.carIdxClassPosition && this.carIdxClassPosition[carIdx] !== undefined) {
      elements.classPos.textContent = this.carIdxClassPosition[carIdx].toString();
    } else {
      elements.classPos.textContent = '--';
    }
    
    // Lap info
    if (this.carIdxLapCompleted && this.carIdxLapCompleted[carIdx] !== undefined) {
      elements.laps.textContent = this.carIdxLapCompleted[carIdx].toString();
    } else {
      elements.laps.textContent = '--';
    }
    
    // Lap times
    if (this.carIdxLastLapTime && this.carIdxLastLapTime[carIdx] !== undefined) {
      elements.lastLap.textContent = this.formatLapTime(this.carIdxLastLapTime[carIdx]);
    } else {
      elements.lastLap.textContent = '--:--';
    }
    
    if (this.carIdxBestLapTime && this.carIdxBestLapTime[carIdx] !== undefined) {
      elements.bestLap.textContent = this.formatLapTime(this.carIdxBestLapTime[carIdx]);
    } else {
      elements.bestLap.textContent = '--:--';
    }
  }
  
  findCarsAheadAndBehind() {
    if (!this.carIdxClassPosition || !this.playerCarIdx || this.playerClassPosition === null) {
      this.carAheadIdx = null;
      this.carBehindIdx = null;
      return;
    }
    
    // Find car ahead (one position better/lower number)
    const positionAhead = this.playerClassPosition - 1;
    this.carAheadIdx = null;
    if (positionAhead > 0) {
      // Find car with position ahead
      for (let carIdx = 0; carIdx < this.carIdxClassPosition.length; carIdx++) {
        if (this.carIdxClassPosition[carIdx] === positionAhead) {
          this.carAheadIdx = carIdx;
          break;
        }
      }
    }
    
    // Find car behind (one position worse/higher number)
    const positionBehind = this.playerClassPosition + 1;
    this.carBehindIdx = null;
    // Find car with position behind
    for (let carIdx = 0; carIdx < this.carIdxClassPosition.length; carIdx++) {
      if (this.carIdxClassPosition[carIdx] === positionBehind) {
        this.carBehindIdx = carIdx;
        break;
      }
    }
    
    console.log(`Player position: ${this.playerClassPosition}, Car ahead idx: ${this.carAheadIdx}, Car behind idx: ${this.carBehindIdx}`);
    
    // Update car info displays
    this.updateCarInfo(this.carAheadIdx, {
      driver: this.carAheadDriver,
      car: this.carAheadCar,
      position: this.carAheadPosition,
      classPos: this.carAheadClassPos,
      laps: this.carAheadLaps,
      lastLap: this.carAheadLastLap,
      bestLap: this.carAheadBestLap
    });
    
    this.updateCarInfo(this.carBehindIdx, {
      driver: this.carBehindDriver,
      car: this.carBehindCar,
      position: this.carBehindPosition,
      classPos: this.carBehindClassPos,
      laps: this.carBehindLaps,
      lastLap: this.carBehindLastLap,
      bestLap: this.carBehindBestLap
    });
  }
  
  calculateRelativeLapPct(distance, isAhead) {
    // Convert distance in meters to lap percentage
    // Assume trackLength is in meters (will need to be set from telemetry data)
    if (this.trackLength <= 0) return this.liveLapPct;
    
    const distancePct = distance / this.trackLength;
    
    if (isAhead) {
      // Car ahead is further along the track
      let aheadPct = this.liveLapPct + distancePct;
      if (aheadPct > 1.0) aheadPct -= 1.0; // Wrap around
      return aheadPct;
    } else {
      // Car behind is further back on the track
      let behindPct = this.liveLapPct - distancePct;
      if (behindPct < 0) behindPct += 1.0; // Wrap around
      return behindPct;
    }
  }

  cacheInfoElements() {
    // Car ahead elements
    this.carAheadDriver = document.getElementById('carAheadDriver');
    this.carAheadCar = document.getElementById('carAheadCar');
    this.carAheadPosition = document.getElementById('carAheadPosition');
    this.carAheadClassPos = document.getElementById('carAheadClassPos');
    this.carAheadLaps = document.getElementById('carAheadLaps');
    this.carAheadLastLap = document.getElementById('carAheadLastLap');
    this.carAheadBestLap = document.getElementById('carAheadBestLap');
    
    // Car behind elements
    this.carBehindDriver = document.getElementById('carBehindDriver');
    this.carBehindCar = document.getElementById('carBehindCar');
    this.carBehindPosition = document.getElementById('carBehindPosition');
    this.carBehindClassPos = document.getElementById('carBehindClassPos');
    this.carBehindLaps = document.getElementById('carBehindLaps');
    this.carBehindLastLap = document.getElementById('carBehindLastLap');
    this.carBehindBestLap = document.getElementById('carBehindBestLap');
    
    // Player elements
    this.playerPositionElement = document.getElementById('playerPosition');
    this.classPositionElement = document.getElementById('classPosition');
    this.playerLapsElement = document.getElementById('playerLaps');
    this.lapDistPctElement = document.getElementById('lapDistPct');
  }

  setupListeners() {
    if (this.socket) {
      // Listen for session info to get official track length and driver info
      this.socket.on('sessionInfo', (data) => {
        if (data?.WeekendInfo?.TrackLength) {
          this.trackLength = parseFloat(data.WeekendInfo.TrackLength.replace(' km', '')) * 1000; // Convert km to meters
          console.log('Track length set from session data:', this.trackLength, 'meters');
        }
        
        // Store driver info for car/driver names
        if (data?.DriverInfo) {
          this.driverInfo = data.DriverInfo;
          console.log('Driver info updated:', this.driverInfo);
        }
      });
      
      this.socket.on('telemetry', (data) => {
        const values = data?.values;
        if (!values) return;
        
        // Update player car index
        if (values.PlayerCarIdx !== undefined) {
          this.playerCarIdx = values.PlayerCarIdx;
        }
        
        // Update class position arrays
        if (values.CarIdxClassPosition !== undefined) {
          this.carIdxClassPosition = values.CarIdxClassPosition;
          
          // Get player's current class position
          if (this.playerCarIdx !== null && this.carIdxClassPosition[this.playerCarIdx] !== undefined) {
            this.playerClassPosition = this.carIdxClassPosition[this.playerCarIdx];
            
            // Update class position display
            if (this.classPositionElement) {
              this.classPositionElement.textContent = this.playerClassPosition.toString();
            }
            
            // Find cars ahead and behind based on class position
            this.findCarsAheadAndBehind();
          }
        }
        
        // Update overall position array
        if (values.CarIdxPosition !== undefined) {
          this.carIdxPosition = values.CarIdxPosition;
          
          // Get player's overall position
          if (this.playerCarIdx !== null && this.carIdxPosition[this.playerCarIdx] !== undefined) {
            this.playerPosition = this.carIdxPosition[this.playerCarIdx];
            
            // Update player position display
            if (this.playerPositionElement) {
              this.playerPositionElement.textContent = this.playerPosition.toString();
            }
          }
        }
        
        // Update all cars' lap distance percentages
        if (values.CarIdxLapDistPct !== undefined) {
          this.carIdxLapDistPct = values.CarIdxLapDistPct;
        }
        
        // Update all cars' lap completed counts
        if (values.CarIdxLapCompleted !== undefined) {
          this.carIdxLapCompleted = values.CarIdxLapCompleted;
          
          // Get player's current lap completed
          if (this.playerCarIdx !== null && this.carIdxLapCompleted[this.playerCarIdx] !== undefined) {
            this.playerLapCompleted = this.carIdxLapCompleted[this.playerCarIdx];
            
            // Update player lap display
            if (this.playerLapsElement) {
              this.playerLapsElement.textContent = this.playerLapCompleted.toString();
            }
          }
        }
        
        // Update lap time arrays
        if (values.CarIdxLastLapTime !== undefined) {
          this.carIdxLastLapTime = values.CarIdxLastLapTime;
        }
        
        if (values.CarIdxBestLapTime !== undefined) {
          this.carIdxBestLapTime = values.CarIdxBestLapTime;
        }
        
        if (values.LapDistPct !== undefined) {
          this.updateCarPosition(values.LapDistPct);
          if (this.lapDistPctElement) {
            this.lapDistPctElement.textContent = (values.LapDistPct * 100).toFixed(1) + '%';
          }
        }
      });
    }
  }
}
