class TrackMap {
  constructor(socket, containerId, selectedTrackId = DEFAULT_TRACK) {
    this.socket = socket;
    this.container = document.getElementById(containerId);
    
    // Track variables
    this.liveLapPct = 0;
    this.trackPath = null;
    this.pathLength = 0;
    this.startPosition = 0;
    this.currentTrackId = selectedTrackId;
    this.currentTrackData = null;
    
    // Car positioning data
    this.carDistAhead = null;
    this.carDistBehind = null;
    this.trackLength = 0; // Will be calculated from track data
    
    // Class position tracking
    this.playerCarIdx = null;
    this.playerClassPosition = null;
    this.playerPosition = null;
    this.playerCarClass = null; // Player's car class
    this.carIdxClass = null; // Array of all car classes
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
    
    // Initialize car tracking system
    this.initializeCarTrackingSystem();
    
    // Setup event listeners
    this.setupListeners();
    
    // Check for existing session data from bufferedData
    this.loadExistingSessionData();
    
    // Also check periodically in case data arrives later
    this.sessionDataChecker = setInterval(() => {
      if (window.bufferedData && window.bufferedData.sessionInfo && !this.driverInfo) {
        console.log('📋 TrackMap: Found sessionInfo on periodic check');
        this.updateSessionDisplay(window.bufferedData.sessionInfo);
        clearInterval(this.sessionDataChecker);
      }
    }, 1000);
    
    // Clear the checker after 30 seconds to avoid infinite checking
    setTimeout(() => {
      if (this.sessionDataChecker) {
        clearInterval(this.sessionDataChecker);
        console.log('📋 TrackMap: Stopped periodic sessionInfo checking after 30 seconds');
      }
    }, 30000);
  }

  // Load track data from track-data.js
  async loadTrackData(trackId) {
    const trackFiles = {
      'ring-vln': 'Ring VLN Interactive.html',
      'indianapolis-road': 'Indy Road Interactive.html'
    };
    
    const fileName = trackFiles[trackId];
    if (!fileName) {
      console.warn(`Track file not found for ID: ${trackId}, falling back to Ring VLN`);
      return await this.loadTrackData('ring-vln');
    }
    
    try {
      console.log(`🏁 Loading track data from ${fileName}`);
      const response = await fetch(fileName);
      const htmlContent = await response.text();
      
      // Parse the HTML to extract track data
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Extract SVG path
      const pathElement = doc.querySelector('.track-surface');
      const svgElement = doc.querySelector('#trackSvg');
      const startFinishElement = doc.querySelector('rect[style*="fill:#ff0000"]');
      
      if (!pathElement || !svgElement) {
        throw new Error('Could not find track path or SVG in file');
      }
      
      // Extract viewBox for proper coordinate system
      const viewBox = svgElement.getAttribute('viewBox');
      const viewBoxValues = viewBox.split(' ').map(Number);
      
      // Extract start/finish line position
      let startFinish = { x: 400, y: 300 }; // Default center
      if (startFinishElement) {
        startFinish = {
          x: parseFloat(startFinishElement.getAttribute('x')) || 400,
          y: parseFloat(startFinishElement.getAttribute('y')) || 300
        };
      }
      
      return {
        id: trackId,
        name: trackId === 'ring-vln' ? 'Nürburgring Nordschleife' : 'Indianapolis Road Course',
        svg: pathElement.getAttribute('d'),
        viewBox: viewBox,
        startFinish: startFinish,
        // Copy the JavaScript functions from the file for zoom/pan functionality
        htmlContent: htmlContent
      };
      
    } catch (error) {
      console.error(`Error loading track file ${fileName}:`, error);
      // Fallback to ring-vln if loading fails
      if (trackId !== 'ring-vln') {
        return await this.loadTrackData('ring-vln');
      }
      return null;
    }
  }

  // Switch to a different track
  async switchTrack(trackId) {
    this.currentTrackId = trackId;
    this.currentTrackData = await this.loadTrackData(trackId);
    
    if (this.currentTrackData) {
      console.log(`🏁 Switching to track: ${this.currentTrackData.displayName}`);
      
      // Clear existing SVG content
      if (this.svg) {
        this.container.removeChild(this.svg);
      }
      
      // Reinitialize with new track data
      await this.initializeSVGTrack();
      
      // Update track length estimate
      this.trackLength = this.currentTrackData.length * 1000; // Convert km to meters
      
      console.log(`📏 Track length estimate: ${this.trackLength}m`);
    }
  }

  async initializeSVGTrack() {
    // Load current track data
    this.currentTrackData = await this.loadTrackData(this.currentTrackId);
    if (!this.currentTrackData) {
      console.error('Failed to load track data');
      return;
    }

    console.log(`🏁 Initializing track: ${this.currentTrackData.displayName}`);

    // Create SVG element with track-specific attributes
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', this.currentTrackData.svg.width.toString());
    this.svg.setAttribute('height', this.currentTrackData.svg.height.toString());
    this.svg.setAttribute('viewBox', this.currentTrackData.svg.viewBox);
    this.svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    this.svg.style.width = '100%';
    this.svg.style.height = '800px';
    
    // Create track path with data from track definition
    this.trackPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.trackPath.setAttribute('d', this.currentTrackData.svg.trackPath);
    this.trackPath.setAttribute('fill', 'none');
    this.trackPath.setAttribute('stroke', '#ffffff');
    this.trackPath.setAttribute('stroke-width', '1.14643');
    
    // Create start/finish line with track-specific position
    this.startFinishRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.startFinishRect.setAttribute('x', this.currentTrackData.svg.startFinish.x.toString());
    this.startFinishRect.setAttribute('y', this.currentTrackData.svg.startFinish.y.toString());
    this.startFinishRect.setAttribute('width', this.currentTrackData.svg.startFinish.width.toString());
    this.startFinishRect.setAttribute('height', this.currentTrackData.svg.startFinish.height.toString());
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
    
    // Add SVG to container
    this.container.appendChild(this.svg);
    
    // Calculate path properties
    this.pathLength = this.trackPath.getTotalLength();
    this.calculateStartPosition();
    
    // Initialize track length from track data - will be updated with official session data
    this.trackLength = this.currentTrackData.length * 1000; // Convert km to meters
    console.log(`📏 Track length estimate from data: ${this.trackLength}m (${this.currentTrackData.length}km)`);
    
    // Initialize car marker at start position
    this.updateCarPosition(0);
  }

  // Multi-car tracking system for displaying all cars on track
  initializeCarTrackingSystem() {
    this.carDots = new Map(); // Store car dot elements by carIdx
    this.carColors = [
      '#ff5888', // Pink
      '#33ceff', // Blue  
      '#ffda59', // Yellow
      '#ae6bff', // Purple
      '#53ff77', // Green
      '#ff8844', // Orange
      '#44ff88', // Light Green
      '#8844ff', // Light Purple
      '#ff4444', // Red
      '#44ffff', // Cyan
      '#ffff44', // Light Yellow
      '#ff44ff'  // Magenta
    ];
    this.maxCarsToShow = 20; // Limit for performance
    this.showAllCars = true; // Set to false to show only same-class cars
    this.showCarNumbers = true; // Set to false to hide car numbers
  }

  // Convert lap percentage to X,Y coordinates on track
  getTrackPosition(lapPct) {
    if (!this.trackPath || this.pathLength === 0) {
      return { x: 0, y: 0 };
    }
    
    // Normalize lap percentage (handle values > 1.0 for cars on different laps)
    const normalizedPct = lapPct % 1.0;
    
    // Calculate position along path from start/finish line
    const positionAlongPath = (this.startPosition + (this.pathLength * normalizedPct)) % this.pathLength;
    
    // Get X,Y coordinates at this position
    return this.trackPath.getPointAtLength(positionAlongPath);
  }

  // Create or update a car dot on the track
  updateCarDot(carIdx, lapPct, carNumber = null, isActive = true) {
    if (!this.carIdxLapDistPct || carIdx >= this.maxCarsToShow) return;
    
    const position = this.getTrackPosition(lapPct);
    let carDot = this.carDots.get(carIdx);
    
    if (!carDot) {
      // Create new car dot
      carDot = this.createCarDot(carIdx, carNumber);
      this.carDots.set(carIdx, carDot);
      this.svg.appendChild(carDot);
    }
    
    // Update position
    carDot.setAttribute('cx', position.x);
    carDot.setAttribute('cy', position.y);
    
    // Update opacity based on activity (inactive cars are more transparent)
    carDot.style.opacity = isActive ? '1.0' : '0.4';
    
    // Update visibility
    carDot.style.display = 'block';
  }

  // Create a new car dot element
  createCarDot(carIdx, carNumber = null) {
    const carDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    
    // Set basic properties
    carDot.setAttribute('r', '1.8');
    carDot.setAttribute('stroke', '#ffffff');
    carDot.setAttribute('stroke-width', '0.3');
    carDot.setAttribute('class', 'car-dot');
    carDot.setAttribute('id', `car-${carIdx}`);
    
    // Set color based on car index
    const colorIndex = carIdx % this.carColors.length;
    carDot.setAttribute('fill', this.carColors[colorIndex]);
    
    // Add car number as text if provided
    if (carNumber !== null) {
      const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textElement.setAttribute('x', '0');
      textElement.setAttribute('y', '0.6');
      textElement.setAttribute('text-anchor', 'middle');
      textElement.setAttribute('font-family', 'Arial');
      textElement.setAttribute('font-size', '2');
      textElement.setAttribute('font-weight', 'bold');
      textElement.setAttribute('fill', '#000000');
      textElement.setAttribute('stroke', 'none');
      textElement.textContent = carNumber.toString();
      
      // Group the circle and text together
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.appendChild(carDot.cloneNode(true));
      group.appendChild(textElement);
      group.setAttribute('class', 'car-group');
      group.setAttribute('id', `car-group-${carIdx}`);
      
      return group;
    }
    
    return carDot;
  }

  // Update all car positions based on current telemetry data
  updateAllCarPositions() {
    if (!this.carIdxLapDistPct) return;
    
    // Update each car that has position data
    for (let carIdx = 0; carIdx < this.carIdxLapDistPct.length && carIdx < this.maxCarsToShow; carIdx++) {
      const lapPct = this.carIdxLapDistPct[carIdx];
      
      // Skip player car (already handled by main car marker)
      if (carIdx === this.playerCarIdx) {
        this.hideCarDot(carIdx);
        continue;
      }
      
      // Skip cars not in same class if showAllCars is false
      if (!this.showAllCars && this.carIdxClass && this.playerCarClass && 
          this.carIdxClass[carIdx] !== this.playerCarClass) {
        this.hideCarDot(carIdx);
        continue;
      }
      
      if (lapPct !== undefined && lapPct !== null && !isNaN(lapPct) && lapPct >= 0) {
        // Determine if car is active (has completed at least one lap)
        const isActive = !this.carIdxLapCompleted || this.carIdxLapCompleted[carIdx] > 0;
        
        // Get car number from driver info if available
        let carNumber = carIdx;
        if (this.showCarNumbers && this.driverInfo && this.driverInfo.DriverInfo && 
            this.driverInfo.DriverInfo.Drivers && this.driverInfo.DriverInfo.Drivers[carIdx]) {
          carNumber = this.driverInfo.DriverInfo.Drivers[carIdx].CarNumber || carIdx;
        }
        
        this.updateCarDot(carIdx, lapPct, this.showCarNumbers ? carNumber : null, isActive);
      } else {
        // Hide cars with no valid position data
        this.hideCarDot(carIdx);
      }
    }
  }

  // Hide a specific car dot
  hideCarDot(carIdx) {
    const carDot = this.carDots.get(carIdx);
    if (carDot) {
      carDot.style.display = 'none';
    }
  }

  // Clear all car dots (useful for session restart)
  clearAllCarDots() {
    this.carDots.forEach((carDot) => {
      if (carDot.parentNode) {
        carDot.parentNode.removeChild(carDot);
      }
    });
    this.carDots.clear();
  }

  // Toggle car display options
  toggleShowAllCars() {
    this.showAllCars = !this.showAllCars;
    console.log('🚗 TrackMap: Show all cars:', this.showAllCars);
    this.updateAllCarPositions();
  }

  toggleShowCarNumbers() {
    this.showCarNumbers = !this.showCarNumbers;
    console.log('🔢 TrackMap: Show car numbers:', this.showCarNumbers);
    // Clear and recreate all car dots to update number display
    this.clearAllCarDots();
    this.updateAllCarPositions();
  }

  setMaxCarsToShow(maxCars) {
    this.maxCarsToShow = Math.max(1, Math.min(50, maxCars)); // Limit between 1-50
    console.log('🚗 TrackMap: Max cars to show:', this.maxCarsToShow);
    this.clearAllCarDots();
    this.updateAllCarPositions();
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

  loadExistingSessionData() {
    console.log('📋 TrackMap: loadExistingSessionData called');
    console.log('📋 Checking window.bufferedData:', window.bufferedData);
    
    // Check if telemetry.js has already loaded session data into bufferedData
    if (window.bufferedData && window.bufferedData.sessionInfo) {
      console.log('📋 TrackMap: Found existing sessionInfo in bufferedData');
      console.log('📋 Existing sessionInfo data:', window.bufferedData.sessionInfo);
      this.updateSessionDisplay(window.bufferedData.sessionInfo);
    } else {
      console.log('📋 TrackMap: No existing sessionInfo found');
      console.log('  - window.bufferedData exists:', !!window.bufferedData);
      if (window.bufferedData) {
        console.log('  - sessionInfo exists in bufferedData:', !!window.bufferedData.sessionInfo);
      }
      console.log('📋 TrackMap: Will wait for new sessionInfo data');
    }
  }

  updateSessionDisplay(data) {
    console.log('📋 TrackMap updateSessionDisplay called with data:', data);
    console.log('📋 Data structure check:');
    console.log('  - WeekendInfo exists:', !!data?.WeekendInfo);
    console.log('  - TrackDisplayName:', data?.WeekendInfo?.TrackDisplayName);
    console.log('  - TrackLength:', data?.WeekendInfo?.TrackLength);
    console.log('  - SessionInfo exists:', !!data?.SessionInfo);
    console.log('  - Sessions array exists:', !!data?.SessionInfo?.Sessions);
    console.log('  - First session exists:', !!data?.SessionInfo?.Sessions?.[0]);
    if (data?.SessionInfo?.Sessions?.[0]) {
      console.log('  - SessionType:', data.SessionInfo.Sessions[0].SessionType);
      console.log('  - SessionLaps:', data.SessionInfo.Sessions[0].SessionLaps);
      console.log('  - SessionTime:', data.SessionInfo.Sessions[0].SessionTime);
    }
    
    if (data?.WeekendInfo?.TrackLength) {
      this.trackLength = parseFloat(data.WeekendInfo.TrackLength.replace(' km', '')) * 1000; // Convert km to meters
      console.log('Track length set from session data:', this.trackLength, 'meters');
    }
    
    // Store driver info - use the full session data object directly
    this.driverInfo = data;  
    console.log('Driver info set to session data:', data.DriverInfo ? 'DriverInfo exists' : 'No DriverInfo');
    
    // Update session data display elements
    const trackNameEl = document.getElementById('sessionTrackName');
    const trackLengthEl = document.getElementById('sessionTrackLength');
    const sessionTypeEl = document.getElementById('sessionType');
    const sessionLapsEl = document.getElementById('sessionLaps');
    const sessionTimeEl = document.getElementById('sessionTime');
    
    console.log('📋 DOM elements check:');
    console.log('  - trackNameEl found:', !!trackNameEl);
    console.log('  - trackLengthEl found:', !!trackLengthEl);
    console.log('  - sessionTypeEl found:', !!sessionTypeEl);
    console.log('  - sessionLapsEl found:', !!sessionLapsEl);
    console.log('  - sessionTimeEl found:', !!sessionTimeEl);
    
    // Use the correct data structure from sessiondata.json
    if (trackNameEl) {
      const value = data?.WeekendInfo?.TrackDisplayName || '--';
      trackNameEl.textContent = value;
      console.log('  - Set trackName to:', value);
    }
    if (trackLengthEl) {
      const value = data?.WeekendInfo?.TrackLength || '--';
      trackLengthEl.textContent = value;
      console.log('  - Set trackLength to:', value);
    }
    if (sessionTypeEl) {
      const value = data?.SessionInfo?.Sessions?.[0]?.SessionType || '--';
      sessionTypeEl.textContent = value;
      console.log('  - Set sessionType to:', value);
    }
    if (sessionLapsEl) {
      const value = data?.SessionInfo?.Sessions?.[0]?.SessionLaps || '--';
      sessionLapsEl.textContent = value;
      console.log('  - Set sessionLaps to:', value);
    }
    if (sessionTimeEl) {
      const value = data?.SessionInfo?.Sessions?.[0]?.SessionTime || '--';
      sessionTimeEl.textContent = value;
      console.log('  - Set sessionTime to:', value);
    }
    
    console.log('📋 TrackMap: Session display elements updated');
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
    if (!this.driverInfo || !this.driverInfo.DriverInfo || !this.driverInfo.DriverInfo.Drivers || !this.driverInfo.DriverInfo.Drivers[carIdx]) {
      return { driverName: '--', carName: '--' };
    }
    
    const driver = this.driverInfo.DriverInfo.Drivers[carIdx];
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
    if (!this.carIdxClassPosition || !this.carIdxClass || !this.playerCarIdx || this.playerClassPosition === null || this.playerCarClass === null) {
      this.carAheadIdx = null;
      this.carBehindIdx = null;
      return;
    }
    
    // Find car ahead (one position better/lower number) IN SAME CLASS
    const positionAhead = this.playerClassPosition - 1;
    this.carAheadIdx = null;
    if (positionAhead > 0) {
      for (let carIdx = 0; carIdx < this.carIdxClassPosition.length; carIdx++) {
        if (this.carIdxClass[carIdx] === this.playerCarClass && this.carIdxClassPosition[carIdx] === positionAhead) {
          this.carAheadIdx = carIdx;
          break;
        }
      }
    }
    
    // Find car behind (one position worse/higher number) IN SAME CLASS
    const positionBehind = this.playerClassPosition + 1;
    this.carBehindIdx = null;
    for (let carIdx = 0; carIdx < this.carIdxClassPosition.length; carIdx++) {
      if (this.carIdxClass[carIdx] === this.playerCarClass && this.carIdxClassPosition[carIdx] === positionBehind) {
        this.carBehindIdx = carIdx;
        break;
      }
    }
    
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

  updateOtherCarPositions() {
    // Update all car positions using the new multi-car tracking system
    this.updateAllCarPositions();
  }

  getPositionFromLapPercentage(lapPct) {
    // Convert lap percentage to position on actual track path
    if (!this.trackPath || !this.pathLength) {
      // Fallback to simple circular positioning if track path not available
      const angle = lapPct * 2 * Math.PI;
      const centerX = 132; // Center of the SVG viewBox (264.58333 / 2)
      const centerY = 132;
      const radius = 80;
      
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    }
    
    // Calculate position along the actual track path
    const distance = (lapPct * this.pathLength + this.startPosition) % this.pathLength;
    const point = this.trackPath.getPointAtLength(distance);
    
    return {
      x: point.x,
      y: point.y
    };
  }

  setupListeners() {
    if (this.socket) {
      // Listen for session info to get official track length and driver info
      this.socket.on('sessionInfo', (data) => {
        console.log('📋 TrackMap received sessionInfo:', data);
        this.updateSessionDisplay(data);
      });
      
      this.socket.on('telemetry', (data) => {
        const values = data?.values;
        if (!values) return;
        
        // Update player car index
        if (values.PlayerCarIdx !== undefined) {
          this.playerCarIdx = values.PlayerCarIdx;
        }
        
        // Update player car class
        if (values.PlayerCarClass !== undefined) {
          this.playerCarClass = values.PlayerCarClass;
          console.log(`🏁 Player car class: ${this.playerCarClass}`);
        }
        
        // Update car class array
        if (values.CarIdxClass !== undefined) {
          this.carIdxClass = values.CarIdxClass;
          console.log(`🏎️ CarIdxClass updated`);
        }
        
        // Update class position arrays
        if (values.CarIdxClassPosition !== undefined) {
          this.carIdxClassPosition = values.CarIdxClassPosition;
          console.log(`🏎️ CarIdxClassPosition updated:`, this.carIdxClassPosition);
          
          // Get player's current class position
          if (this.playerCarIdx !== null && this.carIdxClassPosition[this.playerCarIdx] !== undefined) {
            this.playerClassPosition = this.carIdxClassPosition[this.playerCarIdx];
            console.log(`🏁 Player class position: ${this.playerClassPosition} (carIdx: ${this.playerCarIdx})`);
            
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
          
          // Update car positions on track map
          this.updateOtherCarPositions();
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
