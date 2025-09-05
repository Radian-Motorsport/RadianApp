class TrackMap {
  constructor(socket, canvasId) {
    this.socket = socket;
    this.trackCanvas = document.getElementById(canvasId);
    this.trackCtx = this.trackCanvas.getContext('2d');
    
    // Track map variables
    this.lapStarted = false;
    this.lapCompleted = false;
    this.currentLap = [];
    this.finalLap = [];
    this.lapBuffer = [];
    this.lapYaw = [];          // yaw values for current lap
    this.finalLapYaw = [];     // yaw values for completed lap
    
    this.liveLapPct = 0;
    this.prevLapPct = 0;
    this.targetLapPct = 0;
    this.lastPctUpdateTime = performance.now();
    this.lastLapPct = 0;
    this.telemetryHz = 10;
    
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
    this.carAheadImg.src = '/assets/icon-idle.png';  // Different icon for other cars
    this.carBehindImg = new Image();
    this.carBehindImg.src = '/assets/icon-standby.png';  // Different icon for other cars
    
    // Cache info box elements
    this.cacheInfoElements();
    
    // Load any existing data from localStorage
    this.loadFromStorage();
    
    // Setup event listeners
    this.setupListeners();
    
    // Start animation
    this.startAnimation();
    
    // Save data to localStorage periodically
    this.setupAutoSave();
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
    // Track telemetry for lap tracking
    this.socket.on('telemetry', (data) => {
      const values = data?.values;
      if (!values) return;
      
      // Debug: Log every 100th telemetry update to avoid spam
      if (Math.random() < 0.01) {
        console.log('TrackMap: Telemetry received', {
          Speed: values.Speed,
          YawNorth: values.YawNorth,
          LapDistPct: values.LapDistPct,
          lapStarted: this.lapStarted,
          lapCompleted: this.lapCompleted,
          bufferLength: this.lapBuffer.length,
          finalLapLength: this.finalLap.length
        });
      }
      
      const { Speed, YawNorth, LapDistPct, CarDistAhead, CarDistBehind, FuelLevel, FuelLevelPct } = values;
      
      // Update car distance and fuel data
      this.carAheadDistance = CarDistAhead || 0;
      this.carBehindDistance = CarDistBehind || 0;
      this.fuelLevel = FuelLevel || 0;
      this.fuelLevelPct = FuelLevelPct || 0;
      
      // Update info boxes
      this.updateInfoBoxes();
      
      // Get fuel data from telemetry dashboard if available
      if (window.telemetryDashboard && typeof window.telemetryDashboard.getFuelData === 'function') {
        const fuelData = window.telemetryDashboard.getFuelData();
        this.avgFuelPerLap = fuelData.avgFuelPerLap || 0;
        this.tankCapacity = fuelData.maxFuel || 104;
      }
      
      // Continue with existing lap tracking logic
      if (this.lapCompleted) return;
      
      const dt = 1 / 60;
      
      // Update lap percentage for visualization
      this.prevLapPct = this.targetLapPct;
      this.targetLapPct = values.LapDistPct;
      this.lastPctUpdateTime = performance.now();
      this.liveLapPct = values.LapDistPct;
      
      // Track position
      const last = this.lapBuffer.length > 0 ? this.lapBuffer[this.lapBuffer.length - 1] : { x: 300, y: 300 };
      const newX = last.x + Math.cos(YawNorth) * Speed * dt;
      const newY = last.y + Math.sin(YawNorth) * Speed * dt;
      this.lapBuffer.push({ x: newX, y: newY });
      this.lapYaw.push(YawNorth);
      
      // Detect lap wrap
      if (LapDistPct < this.lastLapPct - 0.5) {
        console.log('TrackMap: Lap wrap detected!', {
          LapDistPct,
          lastLapPct: this.lastLapPct,
          lapStarted: this.lapStarted,
          bufferLength: this.lapBuffer.length
        });
        
        if (!this.lapStarted) {
          this.lapStarted = true;
          this.currentLap = [...this.lapBuffer];
          this.lapBuffer = [];
          this.finalLapYaw = [...this.lapYaw];
          this.lapYaw = [];
          console.log('TrackMap: First lap started, buffer cleared');
        } else {
          this.lapCompleted = true;
          this.finalLap = [...this.lapBuffer];
          this.finalLapYaw = [...this.lapYaw];
          console.log('TrackMap: Lap completed! Final lap points:', this.finalLap.length);
        }
      }
      
      this.lastLapPct = LapDistPct;
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
  
  drawCarAheadBehind(smoothed, autoScale, offsetX, offsetY, playerPct, iconSize) {
    if (smoothed.length === 0) return;
    
    // Estimate track length by summing distances between points
    let trackLength = 0;
    for (let i = 0; i < smoothed.length; i++) {
      const curr = smoothed[i];
      const next = smoothed[(i + 1) % smoothed.length];
      trackLength += Math.hypot(next.x - curr.x, next.y - curr.y);
    }
    
    // Draw car ahead
    if (this.carAheadDistance > 0 && this.carAheadDistance < trackLength) {
      const aheadPct = this.calculateCarPosition(playerPct, this.carAheadDistance, trackLength, true);
      const aheadPos = this.getPositionFromPct(smoothed, aheadPct);
      
      if (aheadPos) {
        const aheadX = aheadPos.x * autoScale + offsetX;
        const aheadY = aheadPos.y * autoScale + offsetY;
        
        // Draw ahead car with different color/icon
        this.trackCtx.save();
        this.trackCtx.globalAlpha = 0.8;
        this.trackCtx.drawImage(this.carAheadImg, aheadX - iconSize / 2, aheadY - iconSize / 2, iconSize, iconSize);
        
        // Add small label
        this.trackCtx.fillStyle = '#4ecdc4';
        this.trackCtx.font = '10px Orbitron';
        this.trackCtx.textAlign = 'center';
        this.trackCtx.fillText('A', aheadX, aheadY - iconSize);
        this.trackCtx.restore();
      }
    }
    
    // Draw car behind
    if (this.carBehindDistance > 0 && this.carBehindDistance < trackLength) {
      const behindPct = this.calculateCarPosition(playerPct, this.carBehindDistance, trackLength, false);
      const behindPos = this.getPositionFromPct(smoothed, behindPct);
      
      if (behindPos) {
        const behindX = behindPos.x * autoScale + offsetX;
        const behindY = behindPos.y * autoScale + offsetY;
        
        // Draw behind car with different color/icon
        this.trackCtx.save();
        this.trackCtx.globalAlpha = 0.8;
        this.trackCtx.drawImage(this.carBehindImg, behindX - iconSize / 2, behindY - iconSize / 2, iconSize, iconSize);
        
        // Add small label
        this.trackCtx.fillStyle = '#feca57';
        this.trackCtx.font = '10px Orbitron';
        this.trackCtx.textAlign = 'center';
        this.trackCtx.fillText('B', behindX, behindY - iconSize);
        this.trackCtx.restore();
      }
    }
  }
  
  calculateCarPosition(playerPct, distance, trackLength, isAhead) {
    // Convert distance to percentage of track
    const distancePct = distance / trackLength;
    
    if (isAhead) {
      // Car ahead is further along the track
      let aheadPct = playerPct + distancePct;
      if (aheadPct > 1) aheadPct -= 1; // Wrap around
      return aheadPct;
    } else {
      // Car behind is further back on the track
      let behindPct = playerPct - distancePct;
      if (behindPct < 0) behindPct += 1; // Wrap around
      return behindPct;
    }
  }
  
  getPositionFromPct(smoothed, pct) {
    if (smoothed.length === 0 || pct < 0 || pct > 1) return null;
    
    const idx = Math.floor(pct * smoothed.length);
    const nextIdx = (idx + 1) % smoothed.length;
    const t = (pct * smoothed.length) - idx;
    
    const px = smoothed[idx].x + (smoothed[nextIdx].x - smoothed[idx].x) * t;
    const py = smoothed[idx].y + (smoothed[nextIdx].y - smoothed[idx].y) * t;
    
    return { x: px, y: py };
  }
  
  startAnimation() {
    requestAnimationFrame(this.drawTrack.bind(this));
  }
  
  // Smoothing Function
  smooth(points, windowSize = 5) {
    return points.map((pt, i) => {
      const slice = points.slice(Math.max(0, i - windowSize), i + 1);
      const avgX = slice.reduce((sum, p) => sum + p.x, 0) / slice.length;
      const avgY = slice.reduce((sum, p) => sum + p.y, 0) / slice.length;
      return { x: avgX, y: avgY };
    });
  }
  
  // Smooth an array of numbers with a simple moving average
  smoothArray(arr, windowSize = 3) {
    return arr.map((val, i) => {
      const start = Math.max(0, i - windowSize);
      const slice = arr.slice(start, i + 1);
      return slice.reduce((sum, v) => sum + v, 0) / slice.length;
    });
  }
  
  // Find straight section based on yaw rate of change
  findStraightBlendZoneFromYaw(points, yawArray, yawRateThreshold = 0.001) {
    const total = points.length;
    const yawDelta = (a, b) => {
      let diff = a - b;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      return diff;
    };
    
    const smoothYaw = this.smoothArray(yawArray, 3);
    
    let startIdx = 0;
    for (let i = total - 1; i > 0; i--) {
      if (Math.abs(yawDelta(smoothYaw[i], smoothYaw[i - 1])) > yawRateThreshold) {
        startIdx = (i + 1) % total;
        break;
      }
    }
    
    let endIdx = 0;
    for (let i = 1; i < total; i++) {
      if (Math.abs(yawDelta(smoothYaw[i], smoothYaw[i - 1])) > yawRateThreshold) {
        endIdx = (i - 1 + total) % total;
        break;
      }
    }
    
    return { startIdx, endIdx };
  }
  
  // Blend into/out of a straight section gradually
  blendLapEndsStraightSection(points, startIdx, endIdx, fadePoints = 5) {
    const blended = [...points];
    const total = points.length;
    
    // Average heading vector over first few points of the straight
    let avgDx = 0, avgDy = 0, count = 0;
    let i = startIdx;
    while (true) {
      const next = (i + 1) % total;
      avgDx += points[next].x - points[i].x;
      avgDy += points[next].y - points[i].y;
      count++;
      if (i === endIdx) break;
      i = next;
    }
    avgDx /= count;
    avgDy /= count;
    const len = Math.hypot(avgDx, avgDy) || 1;
    const ux = avgDx / len;
    const uy = avgDy / len;
    
    // Walk through the straight section
    i = startIdx;
    let dist = 0;
    while (true) {
      const fadeIn = Math.min(1, ((i - startIdx + total) % total) / fadePoints);
      const fadeOut = Math.min(1, ((endIdx - i + total) % total) / fadePoints);
      const alpha = Math.min(fadeIn, fadeOut); // 0→1→0 across the section
      
      const straightX = points[startIdx].x + ux * dist;
      const straightY = points[startIdx].y + uy * dist;
      
      blended[i] = {
        x: points[i].x * (1 - alpha) + straightX * alpha,
        y: points[i].y * (1 - alpha) + straightY * alpha
      };
      
      if (i === endIdx) break;
      const next = (i + 1) % total;
      dist += Math.hypot(points[next].x - points[i].x, points[next].y - points[i].y);
      i = next;
    }
    
    return blended;
  }
  
  // Draw the track
  drawTrack() {
    this.trackCtx.clearRect(0, 0, this.trackCanvas.width, this.trackCanvas.height);
    
    // Debug: Log drawing status occasionally
    if (Math.random() < 0.001) { // Very rarely to avoid spam
      console.log('TrackMap: Drawing called', {
        finalLapLength: this.finalLap.length,
        lapCompleted: this.lapCompleted,
        lapStarted: this.lapStarted,
        bufferLength: this.lapBuffer.length
      });
    }
    
    if (this.finalLap.length > 0) {
      let smoothed = this.smooth(this.finalLap);
      
      // Yaw-aware blend
      if (this.finalLapYaw && this.finalLapYaw.length === smoothed.length) {
        const { startIdx, endIdx } = this.findStraightBlendZoneFromYaw(smoothed, this.finalLapYaw, 0.001);
        smoothed = this.blendLapEndsStraightSection(smoothed, startIdx, endIdx, 5); // fade over 5 points
      }
      
      // Auto-scale and center
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      smoothed.forEach(pt => {
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minY = Math.min(minY, pt.y);
        maxY = Math.max(maxY, pt.y);
      });
      
      const padding = 20;
      const traceWidth = maxX - minX;
      const traceHeight = maxY - minY;
      const scaleX = (this.trackCanvas.width - padding * 2) / traceWidth;
      const scaleY = (this.trackCanvas.height - padding * 2) / traceHeight;
      const autoScale = Math.min(scaleX, scaleY);
      const offsetX = (this.trackCanvas.width - traceWidth * autoScale) / 2 - minX * autoScale;
      const offsetY = (this.trackCanvas.height - traceHeight * autoScale) / 2 - minY * autoScale;
      
      // Draw path
      this.trackCtx.beginPath();
      smoothed.forEach((pt, i) => {
        const sx = pt.x * autoScale + offsetX;
        const sy = pt.y * autoScale + offsetY;
        i === 0 ? this.trackCtx.moveTo(sx, sy) : this.trackCtx.lineTo(sx, sy);
      });
      this.trackCtx.lineTo(smoothed[0].x * autoScale + offsetX, smoothed[0].y * autoScale + offsetY);
      this.trackCtx.strokeStyle = 'white';
      this.trackCtx.stroke();
      
      // Finish line marker
      const finishX = smoothed[0].x * autoScale + offsetX;
      const finishY = smoothed[0].y * autoScale + offsetY;
      this.trackCtx.strokeStyle = 'red';
      this.trackCtx.lineWidth = 2;
      this.trackCtx.beginPath();
      this.trackCtx.moveTo(finishX - 5, finishY - 5);
      this.trackCtx.lineTo(finishX + 5, finishY + 5);
      this.trackCtx.stroke();
      this.trackCtx.lineWidth = 1;
      
      // Live position marker (player car)
      if (this.liveLapPct > 0 && this.liveLapPct <= 1) {
        const elapsed = (performance.now() - this.lastPctUpdateTime) / 1000;
        const lerpFactor = Math.min(elapsed * this.telemetryHz, 1);
        let pct = this.prevLapPct + (this.targetLapPct - this.prevLapPct) * lerpFactor;
        
        // Wrap-around handling
        if (this.targetLapPct < this.prevLapPct && (this.prevLapPct - this.targetLapPct) > 0.5) {
          pct = this.prevLapPct + ((this.targetLapPct + 1) - this.prevLapPct) * lerpFactor;
          if (pct > 1) pct -= 1;
        }
        
        const idx = Math.floor(pct * smoothed.length);
        const nextIdx = (idx + 1) % smoothed.length;
        const t = (pct * smoothed.length) - idx;
        const px = smoothed[idx].x + (smoothed[nextIdx].x - smoothed[idx].x) * t;
        const py = smoothed[idx].y + (smoothed[nextIdx].y - smoothed[idx].y) * t;
        
        const markerX = px * autoScale + offsetX;
        const markerY = py * autoScale + offsetY;
        
        const iconSize = 16;
        this.trackCtx.drawImage(this.carImg, markerX - iconSize / 2, markerY - iconSize / 2, iconSize, iconSize);
        
        // Draw car ahead and behind if distances are available and reasonable
        this.drawCarAheadBehind(smoothed, autoScale, offsetX, offsetY, pct, iconSize);
      }
    }
    
    requestAnimationFrame(this.drawTrack.bind(this));
  }
  
  /**
   * Load track data from localStorage
   */
  loadFromStorage() {
    if (!window.storageManager) {
      console.warn('TrackMap: StorageManager not available');
      return;
    }
    
    try {
      const data = window.storageManager.loadVisualizationData('trackMap');
      if (data) {
        this.finalLap = data.finalLap || [];
        this.finalLapYaw = data.finalLapYaw || [];
        this.lapStarted = data.lapStarted || false;
        this.lapCompleted = data.lapCompleted || false;
        console.log(`TrackMap: Loaded track data from storage`);
      }
    } catch (error) {
      console.warn('TrackMap: Failed to load data from storage:', error);
    }
  }
  
  /**
   * Save track data to localStorage
   */
  saveToStorage() {
    if (!window.storageManager) {
      console.warn('TrackMap: StorageManager not available');
      return;
    }
    
    try {
      const data = {
        finalLap: this.finalLap,
        finalLapYaw: this.finalLapYaw,
        lapStarted: this.lapStarted,
        lapCompleted: this.lapCompleted
      };
      window.storageManager.saveVisualizationData('trackMap', data);
    } catch (error) {
      console.warn('TrackMap: Failed to save data to storage:', error);
    }
  }
  
  /**
   * Set up automatic saving to localStorage
   */
  setupAutoSave() {
    // Save every minute
    setInterval(() => {
      this.saveToStorage();
    }, 60000);
    
    // Save when page is about to unload
    window.addEventListener('beforeunload', () => {
      this.saveToStorage();
    });
    
    // Save when lap is completed
    const originalSetupListeners = this.setupListeners;
    this.setupListeners = () => {
      originalSetupListeners.call(this);
      
      // Override the telemetry handler to save on lap completion
      const originalHandler = this.socket._callbacks?.$telemetry?.[this.socket._callbacks.$telemetry.length - 1];
      if (originalHandler) {
        this.socket.off('telemetry', originalHandler);
        this.socket.on('telemetry', (data) => {
          const wasCompleted = this.lapCompleted;
          originalHandler(data);
          // Save if lap just completed
          if (!wasCompleted && this.lapCompleted) {
            this.saveToStorage();
          }
        });
      }
    };
  }
}