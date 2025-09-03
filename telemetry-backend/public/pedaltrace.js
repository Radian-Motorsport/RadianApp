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
    const legendY = 15;
    const spacing = 15;
    
    // Get current status from the latest data point
    const latestData = this.buffer[this.buffer.length - 1];
    if (!latestData) return;
    
    // Set font for labels (matching environment graph style)
    this.ctx.font = '12px Arial';
    
    // Coasting indicator (text only, no line)
    this.ctx.fillStyle = latestData.coasting ? '#ffa500' : '#666666'; // Orange when active, gray when inactive
    this.ctx.fillText('COASTING', legendX, legendY);
    
    // Overlap indicator (text only, no line)
    this.ctx.fillStyle = latestData.overlap ? '#4ecdc4' : '#666666'; // Teal when active, gray when inactive  
    this.ctx.fillText('OVERLAP', legendX, legendY + spacing);
  }
}