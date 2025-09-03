/**
 * PedalTrace - A visualization component for racing pedal inputs
 */
class PedalTrace {
  /**
   * Create a new pedal trace visualization
   * @param {object} socket - Socket.io connection for telemetry
   * @param {string} canvasId - HTML canvas element ID to render on
   * @param {object} options - Configuration options
   */
  constructor(socket, canvasId, options = {}) {
    this.socket = socket;
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // Configuration with defaults
    this.options = {
      maxPoints: options.maxPoints || 300,
      throttleColor: options.throttleColor || 'lime',
      brakeColor: options.brakeColor || 'red',
      gearColor: options.gearColor || 'blue',
      maxGear: options.maxGear || 8,
      ...options
    };
    
    // Data buffer
    this.buffer = [];
    
    // Set up telemetry listener
    this.setupListeners();
    
    // Start animation
    this.startAnimation();
  }
  
  /**
   * Set up socket event listeners
   */
  setupListeners() {
    this.socket.on('telemetry', (data) => {
      const values = data?.values;
      if (!values) return;
      
      // Calculate coasting and overlap status
      const throttleVal = values.Throttle ?? values.ThrottleRaw ?? 0;
      const isCoasting = (values.Brake ?? 0) < 0.02 && throttleVal < 0.02;
      const isOverlap = throttleVal > 0.20 && (values.Brake ?? 0) > 0.05;
      
      // Pedal input buffer
      this.buffer.push({
        throttle: values.ThrottleRaw * 100,
        brake: values.Brake * 100,
        gear: (values.Gear / this.options.maxGear) * 100,
        coasting: isCoasting,
        overlap: isOverlap
      });
      
      if (this.buffer.length > this.options.maxPoints) {
        this.buffer.shift();
      }
    });
  }
  
  /**
   * Start the animation loop
   */
  startAnimation() {
    requestAnimationFrame(this.draw.bind(this));
  }
  
  /**
   * Draw the pedal graph
   */
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Throttle
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.throttleColor;
    this.buffer.forEach((point, i) => {
      const x = i * (this.canvas.width / this.options.maxPoints);
      const y = this.canvas.height - point.throttle * (this.canvas.height / 100);
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    
    // Brake
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.brakeColor;
    this.buffer.forEach((point, i) => {
      const x = i * (this.canvas.width / this.options.maxPoints);
      const y = this.canvas.height - point.brake * (this.canvas.height / 100);
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    
    // Gear
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.gearColor;
    this.buffer.forEach((point, i) => {
      const x = i * (this.canvas.width / this.options.maxPoints);
      const y = this.canvas.height - point.gear * (this.canvas.height / 100);
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    
    // Draw status indicators
    this.drawStatusIndicators();
    
    requestAnimationFrame(this.draw.bind(this));
  }
  
  /**
   * Draw status indicators for coasting and overlap
   */
  drawStatusIndicators() {
    const legendX = 10;
    const legendY = this.canvas.height - 40;
    const lineLength = 30;
    const spacing = 22;
    
    // Get current status from the latest data point
    const latestData = this.buffer[this.buffer.length - 1];
    if (!latestData) return;
    
    // Coasting indicator
    this.ctx.lineWidth = 2;
    if (latestData.coasting) {
      this.ctx.strokeStyle = '#ffa500'; // Orange for coasting
      this.ctx.globalAlpha = 1.0;
    } else {
      this.ctx.strokeStyle = '#333333'; // Dark gray when inactive
      this.ctx.globalAlpha = 0.3;
    }
    this.ctx.beginPath();
    this.ctx.moveTo(legendX, legendY);
    this.ctx.lineTo(legendX + lineLength, legendY);
    this.ctx.stroke();
    
    // Coasting text
    this.ctx.fillStyle = latestData.coasting ? '#ffa500' : '#666666';
    this.ctx.font = '12px Orbitron, Arial';
    this.ctx.fillText('COASTING', legendX + lineLength + 8, legendY + 4);
    
    // Overlap indicator
    if (latestData.overlap) {
      this.ctx.strokeStyle = '#ff4444'; // Red for overlap
      this.ctx.globalAlpha = 1.0;
    } else {
      this.ctx.strokeStyle = '#333333'; // Dark gray when inactive
      this.ctx.globalAlpha = 0.3;
    }
    this.ctx.beginPath();
    this.ctx.moveTo(legendX, legendY + spacing);
    this.ctx.lineTo(legendX + lineLength, legendY + spacing);
    this.ctx.stroke();
    
    // Overlap text
    this.ctx.fillStyle = latestData.overlap ? '#ff4444' : '#666666';
    this.ctx.fillText('OVERLAP', legendX + lineLength + 8, legendY + spacing + 4);
    
    // Reset alpha and line width
    this.ctx.globalAlpha = 1.0;
    this.ctx.lineWidth = 1;
  }
}