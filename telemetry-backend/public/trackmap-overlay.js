/**
 * TrackMapOverlay - Clean HTML overlay implementation for car positioning
 * Based on Ring VLN Source.html approach using HTML spans over SVG background
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
      // Track file mapping
      const trackFiles = {
        'ring-vln': 'Ring VLN Interactive.html',
        'indianapolis-road': 'Indy Road Interactive.html'
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
        width: 100%;
        height: 100%;
        overflow: hidden;
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
          width: 100%;
          height: 100%;
          z-index: 1;
        `;
        
        // Find track path for coordinate calculations
        this.trackPath = this.svg.querySelector('.track-surface');
        if (this.trackPath) {
          this.pathLength = this.trackPath.getTotalLength();
          console.log(`✅ Track path loaded, length: ${this.pathLength.toFixed(0)} units`);
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
        width: 100%;
        height: 100%;
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
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${color};
      border: 1px solid #ffffff;
      opacity: 0.9;
      transform: translate(-50%, -50%);
      display: none;
      z-index: 20;
    `;
    dot.title = title;
    
    return dot;
  }

  // Convert lap percentage to SVG coordinates
  getTrackPosition(lapPercent) {
    if (!this.trackPath || !this.pathLength) {
      return { x: 0, y: 0 };
    }
    
    // Convert lap percentage to path distance
    const distance = (lapPercent / 100) * this.pathLength;
    const point = this.trackPath.getPointAtLength(distance);
    
    return {
      x: point.x,
      y: point.y
    };
  }

  // Convert SVG coordinates to CSS pixel positions
  svgToPixelPosition(svgX, svgY) {
    if (!this.svg) return { x: 0, y: 0 };
    
    const rect = this.svg.getBoundingClientRect();
    const svgElement = this.svg;
    const viewBox = svgElement.viewBox.baseVal;
    
    // Scale factors
    const scaleX = rect.width / viewBox.width;
    const scaleY = rect.height / viewBox.height;
    
    return {
      x: svgX * scaleX,
      y: svgY * scaleY
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
    
    if (!carElement) return;
    
    // Get SVG track position
    const trackPos = this.getTrackPosition(lapPercent);
    
    // Convert to pixel position
    const pixelPos = this.svgToPixelPosition(trackPos.x, trackPos.y);
    
    // Apply position and show
    carElement.style.left = `${pixelPos.x}px`;
    carElement.style.top = `${pixelPos.y}px`;
    carElement.style.display = 'block';
    
    // Debug logging for player car
    if (carType === 'player') {
      console.log(`🚗 Car position: ${lapPercent.toFixed(1)}% -> SVG(${trackPos.x.toFixed(1)}, ${trackPos.y.toFixed(1)}) -> Pixel(${pixelPos.x.toFixed(1)}, ${pixelPos.y.toFixed(1)})`);
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
    
    this.socket.on('telemetryData', (data) => {
      // Update player car position
      if (data.LapDistPct !== undefined) {
        const lapPercent = data.LapDistPct * 100; // Convert 0-1 to 0-100
        this.updateCarPosition(lapPercent, 'player');
      }
    });
    
    this.socket.on('sessionData', (data) => {
      // Handle car ahead/behind positioning
      if (data.CarAhead && data.CarAhead.LapDistPct !== undefined) {
        const aheadLapPercent = data.CarAhead.LapDistPct * 100;
        this.updateCarPosition(aheadLapPercent, 'ahead');
      } else {
        this.hideCarMarker('ahead');
      }
      
      if (data.CarBehind && data.CarBehind.LapDistPct !== undefined) {
        const behindLapPercent = data.CarBehind.LapDistPct * 100;
        this.updateCarPosition(behindLapPercent, 'behind');
      } else {
        this.hideCarMarker('behind');
      }
    });
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
      this.socket.off('telemetryData');
      this.socket.off('sessionData');
    }
    
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Make available globally for track.html
window.TrackMapOverlay = TrackMapOverlay;