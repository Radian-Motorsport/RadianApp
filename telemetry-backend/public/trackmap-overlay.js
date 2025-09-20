/**
 * TrackMapOverlay - Clean HTML overlay implementation for car positioning
 * Based on Ring VLN Source.html approach using HTML spans over SVG background
 * 
 * ADDING NEW TRACKS - Quick Guide:
 * ================================
 * 1. Create the track HTML file (e.g., "Spa Interactive.html") with SVG track data
 * 2. Add track option to track.html dropdown: <option value="spa-francorchamps">Spa-Francorchamps</option>
 * 3. Update 4 places in this file (search for "TRACK CONFIGURATION"):
 *    - Configuration 1: Add track file mapping
 *    - Configuration 2: Add default transform (positioning/scale)
 *    - Configuration 3: Add start/finish offset (usually 0.0)
 *    - Configuration 4: Copy the same start/finish offset
 * 
 * TRACK OFFSETS EXPLAINED:
 * - Most tracks: 0.0 (start/finish at beginning of SVG path)
 * - Ring VLN: 0.93 (start/finish 93% around the path due to track layout)
 * - Custom tracks: Measure where start/finish line appears on the path
 * 
 * TRANSFORMS EXPLAINED:
 * - translate(x, y): Move track to center it in view
 * - scale(factor): Zoom track to fit properly (1.0 = original size)
 * - Find good values by testing in browser and adjusting
 */
class TrackMapOverlay {
  constructor(socket, containerId, trackId = 'ring-vln') {
    this.socket = socket;
    this.container = document.getElementById(containerId);
    this.currentTrackId = trackId;
    
    // Track data
    this.trackPath = null;
    this.pathLength = 0;
    this.trackLength = 0;
    
    // Car markers (HTML spans)
    this.playerCar = null;
    this.carAhead = null;
    this.carBehind = null;
    
    // Overlay containers
    this.trackContainer = null;
    this.carOverlay = null;
    this.svg = null;
    
    // Initialize
    this.init();
  }

  async init() {
    await this.loadTrack();
    this.setupSocketListeners();
  }

  async loadTrack() {
    console.log(`🏁 Loading track: ${this.currentTrackId}`);
    
    try {
      // TRACK CONFIGURATION 1: Track file mapping
      // Add new tracks here - maps track ID to HTML file name
      // Format: 'track-id': 'Track HTML File.html'
      const trackFiles = {
        'ring-vln': 'Ring VLN Interactive.html',
        'indianapolis-road': 'Indy Road Interactive.html'
        // TODO: Add future tracks here, e.g.:
        // 'spa-francorchamps': 'Spa Interactive.html',
        // 'monza': 'Monza Interactive.html',
        // 'silverstone': 'Silverstone Interactive.html'
      };
      
      const fileName = trackFiles[this.currentTrackId];
      if (!fileName) {
        console.error(`Track file not found for ID: ${this.currentTrackId}`);
        return;
      }

      // Fetch and parse the HTML file
      const response = await fetch(fileName);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const htmlContent = await response.text();
      
      // Create main container with relative positioning
      this.trackContainer = document.createElement('div');
      this.trackContainer.className = 'track-overlay-container';
      this.trackContainer.style.cssText = `
        position: relative;
        width: 800px;
        height: 600px;
        overflow: hidden;
        margin: 0 auto;
      `;
      
      // Parse HTML and extract SVG
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      const sourceSvg = tempDiv.querySelector('#trackSvg');
      if (sourceSvg) {
        // Clone SVG as background
        this.svg = sourceSvg.cloneNode(true);
        this.svg.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 800px;
          height: 600px;
          z-index: 1;
        `;
        
        // Apply track-specific default transform to trackGroup for proper positioning
        const trackGroup = this.svg.querySelector('#trackGroup');
        if (trackGroup) {
          // TRACK CONFIGURATION 2: Default view transforms
          // Each track may need different positioning and scaling to display properly
          // Format: 'track-id': 'translate(x, y) scale(factor)'
          const trackTransforms = {
            'ring-vln': 'translate(240, 90) scale(0.96)',        // Nürburgring positioning
            'indianapolis-road': 'translate(0, 0) scale(1.0)'    // Indianapolis default
            // TODO: Add future track transforms here, e.g.:
            // 'spa-francorchamps': 'translate(100, 50) scale(0.8)',
            // 'monza': 'translate(0, 0) scale(1.2)',
            // 'silverstone': 'translate(50, 25) scale(0.9)'
          };
          
          const transform = trackTransforms[this.currentTrackId] || 'translate(0, 0) scale(1.0)';
          trackGroup.setAttribute('transform', transform);
          console.log(`🎯 Applied transform for ${this.currentTrackId}: ${transform}`);
        }
        
        // Find track path for coordinate calculations
        this.trackPath = this.svg.querySelector('.track-surface');
        if (!this.trackPath) {
          // Try alternative selectors
          this.trackPath = this.svg.querySelector('path.track-surface') || 
                          this.svg.querySelector('path[class*="track"]') ||
                          this.svg.querySelector('path');
          console.log('🔍 Trying alternative path selectors...');
        }
        
        if (this.trackPath) {
          this.pathLength = this.trackPath.getTotalLength();
          console.log(`✅ Track path loaded, length: ${this.pathLength.toFixed(0)} units`);
          
          // Position the start/finish marker at 93% offset (Ring VLN configuration)
          this.positionStartFinishMarker();
        } else {
          console.error('❌ Track path not found in SVG - checking all paths:');
          const allPaths = this.svg.querySelectorAll('path');
          console.log(`Found ${allPaths.length} path elements:`, Array.from(allPaths).map(p => p.className.baseVal || p.getAttribute('class')));
        }
      } else {
        throw new Error('Could not find track SVG in source file');
      }
      
      // Create car overlay container
      this.carOverlay = document.createElement('div');
      this.carOverlay.className = 'car-overlay';
      this.carOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 800px;
        height: 600px;
        pointer-events: none;
        z-index: 10;
      `;
      
      // Assemble the track display
      this.trackContainer.appendChild(this.svg);
      this.trackContainer.appendChild(this.carOverlay);
      
      // Clear existing content and add to DOM
      this.container.innerHTML = '';
      this.container.appendChild(this.trackContainer);
      
      // Create car markers
      this.createCarMarkers();
      
      // Position test car at known location
      this.updateCarPosition(7, 'player');
      
      // Default fallback positions when no telemetry data
      console.log('🔥 Setting fallback positions...');
      console.log('playerCar element:', this.playerCar);
      console.log('carAhead element:', this.carAhead);
      console.log('carBehind element:', this.carBehind);
      
      this.updateCarPosition(5, 'player');   // Player at 5%
      this.updateCarPosition(5, 'ahead');    // Car ahead at 5%  
      this.updateCarPosition(5, 'behind');   // Car behind at 5%
      
      // FORCE TEST CAR TO SHOW
      setTimeout(() => {
        if (this.playerCar) {
          this.playerCar.style.transform = 'translate(200px, 200px)';
          this.playerCar.style.display = 'block';
          console.log('🔴 FORCED TEST CAR AT 200,200');
        }
      }, 1000);
      
      console.log('✅ Track loaded with HTML overlay system');
      
    } catch (error) {
      console.error('❌ Error loading track:', error);
    }
  }

  createCarMarkers() {
    // Player car (green)
    this.playerCar = this.createCarDot('player', '#00ff00', 'Player Car');
    
    // Car ahead (orange)
    this.carAhead = this.createCarDot('ahead', '#ff8800', 'Car Ahead');
    
    // Car behind (blue)
    this.carBehind = this.createCarDot('behind', '#0088ff', 'Car Behind');
    
    // Add all to overlay
    this.carOverlay.appendChild(this.playerCar);
    this.carOverlay.appendChild(this.carAhead);
    this.carOverlay.appendChild(this.carBehind);
  }

  createCarDot(type, color, title) {
    const dot = document.createElement('span');
    dot.className = `driverdot car-${type}`;
    dot.style.cssText = `
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background-color: ${color};
      border: 2px solid #000000;
      font-size: 8px;
      text-align: center;
      line-height: 10px;
      color: #000000;
      margin-left: -7px;
      margin-top: -7px;
      display: block;
      z-index: 20;
    `;
    dot.title = title;
    dot.textContent = type === 'player' ? 'P' : (type === 'ahead' ? 'A' : 'B');
    
    return dot;
  }

  // Position start/finish marker at the correct offset for each track
  positionStartFinishMarker() {
    if (!this.trackPath || !this.svg) return;
    
    // TRACK CONFIGURATION 3: Start/Finish line offsets
    // Different tracks have start/finish lines at different positions along their path
    // 0.0 = start of path, 1.0 = end of path, 0.5 = halfway around
    // Most tracks use 0.0, but some (like Ring VLN) have offset start/finish lines
    const trackOffsets = {
      'ring-vln': 0.93,        // Nürburgring VLN - 93% around the raw path
      'indianapolis-road': 0.0  // Indianapolis - start of path is start/finish
      // TODO: Add future track offsets here, e.g.:
      // 'spa-francorchamps': 0.0,  // Most tracks use 0.0
      // 'monza': 0.0,
      // 'silverstone': 0.0,
      // 'watkins-glen': 0.15       // Example: 15% offset if needed
    };
    
    const startFinishOffset = trackOffsets[this.currentTrackId] || 0.0;
    const totalLength = this.trackPath.getTotalLength();
    const startFinishPosition = this.trackPath.getPointAtLength(totalLength * startFinishOffset);
    
    // Find the start/finish marker circle
    const startFinishMarker = this.svg.querySelector('circle[style*="fill:#ff0000"]');
    if (startFinishMarker) {
      // Update the marker position to the correct offset for this track
      startFinishMarker.setAttribute('cx', startFinishPosition.x);
      startFinishMarker.setAttribute('cy', startFinishPosition.y);
      console.log(`🏁 Start/finish marker positioned for ${this.currentTrackId} at ${(startFinishOffset * 100)}% offset: (${startFinishPosition.x.toFixed(1)}, ${startFinishPosition.y.toFixed(1)})`);
    }
  }

  // Convert lap percentage to SVG coordinates
  getTrackPosition(lapPercent) {
    if (!this.trackPath || !this.pathLength) {
      return { x: 400, y: 300 }; // Return center position
    }
    
    // Track start/finish offsets
    const trackOffsets = {
      'ring-vln': 0.93,
      'indianapolis-road': 0.0
    };
    
    const startFinishOffset = trackOffsets[this.currentTrackId] || 0.0;
    
    // Adjust lap percentage to account for track-specific offset
    let adjustedPercentage = (startFinishOffset + (lapPercent / 100)) % 1;
    
    // Convert to path distance
    const distance = adjustedPercentage * this.pathLength;
    const point = this.trackPath.getPointAtLength(distance);
    
    return {
      x: point.x,
      y: point.y
    };
  }

  // Convert SVG coordinates to CSS pixel positions - SIMPLIFIED 1:1 mapping
  svgToPixelPosition(svgX, svgY) {
    // Since both SVG and overlay are now 800x600, coordinates map directly
    // NO CONVERSION NEEDED - DIRECT MAPPING
    return {
      x: svgX,
      y: svgY
    };
  }

  // Update car position based on lap percentage
  updateCarPosition(lapPercent, carType = 'player') {
    let carElement;
    
    switch (carType) {
      case 'player':
        carElement = this.playerCar;
        break;
      case 'ahead':
        carElement = this.carAhead;
        break;
      case 'behind':
        carElement = this.carBehind;
        break;
      default:
        return;
    }
    
    if (!carElement) {
      return;
    }
    
    // Get SVG track position
    const trackPos = this.getTrackPosition(lapPercent);
    
    // DIRECT positioning - no transforms
    carElement.style.left = trackPos.x + 'px';
    carElement.style.top = trackPos.y + 'px';
    carElement.style.display = 'block';
    
    // Show position for player car
    if (carType === 'player') {
      console.log(`🚗 Player car RAW SVG: ${lapPercent.toFixed(1)}% -> (${trackPos.x.toFixed(0)}, ${trackPos.y.toFixed(0)})`);
    }
  }

  // Hide a car marker
  hideCarMarker(carType) {
    let carElement;
    
    switch (carType) {
      case 'ahead':
        carElement = this.carAhead;
        break;
      case 'behind':
        carElement = this.carBehind;
        break;
      default:
        return;
    }
    
    if (carElement) {
      carElement.style.display = 'none';
    }
  }

  // Setup socket event listeners
  setupSocketListeners() {
    if (!this.socket) return;
    
    // Store car data
    this.carIdxLapDistPct = null; // Array of all car lap distances
    this.carAheadIdx = null;      // Index of car ahead
    this.carBehindIdx = null;     // Index of car behind
    this.playerCarIdx = null;     // Player's car index
    
    this.socket.on('telemetry', (data) => {
      // Update car position arrays and player car position
      if (data.values) {
        const values = data.values;
        console.log('📡 Received telemetry data:', {
          LapDistPct: values.LapDistPct,
          CarIdxLapDistPct: values.CarIdxLapDistPct, 
          PlayerCarIdx: values.PlayerCarIdx,
          allKeys: Object.keys(values).filter(k => k.includes('Dist') || k.includes('Pct')).slice(0, 10)
        });
        
        // Store all car positions - try different possible field names
        if (values.CarIdxLapDistPct !== undefined) {
          this.carIdxLapDistPct = values.CarIdxLapDistPct;
          console.log('🏁 Found CarIdxLapDistPct array with', values.CarIdxLapDistPct.length, 'cars');
        } else if (values.CarIdxLapDistance !== undefined) {
          this.carIdxLapDistPct = values.CarIdxLapDistance;
          console.log('🏁 Using CarIdxLapDistance as position array');
        }
        
        // Update player car position - try different field names  
        let playerLapPct = null;
        if (values.LapDistPct !== undefined) {
          playerLapPct = values.LapDistPct;
        } else if (values.LapDistance !== undefined) {
          playerLapPct = values.LapDistance;  
        } else if (values.PlayerCarDistance !== undefined) {
          playerLapPct = values.PlayerCarDistance;
        }
        
        if (playerLapPct !== null) {
          // Convert to 0-100 range if needed
          const lapPercent = playerLapPct > 1 ? playerLapPct : playerLapPct * 100;
          console.log('🚗 Updating player car at', lapPercent + '%');
          this.updateCarPosition(lapPercent, 'player');
        }
        
        // Store player car index for reference
        if (values.PlayerCarIdx !== undefined) {
          this.playerCarIdx = values.PlayerCarIdx;
          console.log('👤 PlayerCarIdx:', values.PlayerCarIdx);
        }
      }
      
      // Update other cars based on car indices and position data
      this.updateOtherCarPositions();
    });
    
    this.socket.on('sessionData', (data) => {
      // Handle car ahead/behind indices if available in session data
      if (data && data.CarAhead) {
        this.carAheadIdx = data.CarAhead.CarIdx;
      }
      
      if (data && data.CarBehind) {
        this.carBehindIdx = data.CarBehind.CarIdx;
      }
    });
  }

  // Update positions of cars ahead and behind based on telemetry arrays
  updateOtherCarPositions() {
    // Try to get data from global window if socket data not available
    if (!this.carIdxLapDistPct && window.currentTelemetryData?.values) {
      const values = window.currentTelemetryData.values;
      if (values.CarIdxLapDistPct) {
        this.carIdxLapDistPct = values.CarIdxLapDistPct;
        console.log('📡 Retrieved CarIdxLapDistPct from global data:', values.CarIdxLapDistPct.length, 'cars');
      }
    }
    
    if (!this.carIdxLapDistPct) {
      console.log('❌ No car position data available');
      return;
    }
    
    console.log('🏁 Processing car positions. PlayerCarIdx:', this.playerCarIdx);
    console.log('🏁 CarIdxLapDistPct array:', this.carIdxLapDistPct.slice(0, 10)); // Show first 10 entries
    
    // If we don't have specific ahead/behind car indices, let's show some nearby cars for testing
    if (this.carAheadIdx === null || this.carBehindIdx === null) {
      // Find cars that are actually racing (have valid position data)
      for (let i = 0; i < this.carIdxLapDistPct.length; i++) {
        if (i === this.playerCarIdx) continue; // Skip player car
        
        const carPosition = this.carIdxLapDistPct[i];
        if (carPosition !== undefined && carPosition >= 0 && carPosition <= 1) {
          console.log(`🏁 Found active car at index ${i} with position ${(carPosition * 100).toFixed(1)}%`);
          
          // Use this car as "ahead" car for testing
          if (this.carAheadIdx === null) {
            this.carAheadIdx = i;
            console.log(`🏁 Using car ${i} as ahead car (${(carPosition * 100).toFixed(1)}%)`);
          }
          // Use different car as "behind" car for testing  
          else if (this.carBehindIdx === null && i !== this.carAheadIdx) {
            this.carBehindIdx = i;
            console.log(`🏁 Using car ${i} as behind car (${(carPosition * 100).toFixed(1)}%)`);
            break; // We have both cars now
          }
        }
      }
    }
    
    // Update car ahead
    if (this.carAheadIdx !== null && this.carIdxLapDistPct[this.carAheadIdx] !== undefined) {
      const aheadLapPct = this.carIdxLapDistPct[this.carAheadIdx] * 100; // Convert to percentage
      console.log(`🚗 Updating ahead car (${this.carAheadIdx}) at ${aheadLapPct.toFixed(1)}%`);
      this.updateCarPosition(aheadLapPct, 'ahead');
    } else {
      this.hideCarMarker('ahead');
    }
    
    // Update car behind  
    if (this.carBehindIdx !== null && this.carIdxLapDistPct[this.carBehindIdx] !== undefined) {
      const behindLapPct = this.carIdxLapDistPct[this.carBehindIdx] * 100; // Convert to percentage
      console.log(`🚗 Updating behind car (${this.carBehindIdx}) at ${behindLapPct.toFixed(1)}%`);
      this.updateCarPosition(behindLapPct, 'behind');
    } else {
      this.hideCarMarker('behind');
    }
  }

  // Switch to different track
  async switchTrack(trackId) {
    console.log(`🏁 Switching from ${this.currentTrackId} to ${trackId}`);
    this.currentTrackId = trackId;
    await this.loadTrack();
  }

  // Cleanup method
  destroy() {
    if (this.socket) {
      this.socket.off('telemetry');
      this.socket.off('sessionData');
    }
    
    // Clear car data
    this.carIdxLapDistPct = null;
    this.carAheadIdx = null;
    this.carBehindIdx = null;
    this.playerCarIdx = null;
    
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Make available globally for track.html
window.TrackMapOverlay = TrackMapOverlay;