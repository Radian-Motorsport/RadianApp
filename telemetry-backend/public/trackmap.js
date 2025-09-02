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
    
    // Load the car icon
    this.carImg = new Image();
    this.carImg.src = 'icon-active.png';
    
    // Setup event listeners
    this.setupListeners();
    
    // Start animation
    this.startAnimation();
  }
  
  setupListeners() {
    // Track telemetry for lap tracking
    this.socket.on('telemetry', (data) => {
      const values = data?.values;
      if (!values || this.lapCompleted) return;
      
      const { Speed, YawNorth, LapDistPct } = values;
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
        if (!this.lapStarted) {
          this.lapStarted = true;
          this.currentLap = [...this.lapBuffer];
          this.lapBuffer = [];
          this.finalLapYaw = [...this.lapYaw];
          this.lapYaw = [];
        } else {
          this.lapCompleted = true;
          this.finalLap = [...this.lapBuffer];
          this.finalLapYaw = [...this.lapYaw];
        }
      }
      
      this.lastLapPct = LapDistPct;
    });
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
      
      // Live position marker
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
      }
    }
    
    requestAnimationFrame(this.drawTrack.bind(this));
  }
}