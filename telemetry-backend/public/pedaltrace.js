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
      rpmColor: options.rpmColor || 'yellow',
      maxRpm: options.maxRpm || 10000,
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
      
      // Pedal input buffer
      this.buffer.push({
        throttle: values.ThrottleRaw * 100,
        brake: values.Brake * 100,
        rpm: (values.RPM / this.options.maxRpm) * 100
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
    
    // RPM
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.rpmColor;
    this.buffer.forEach((point, i) => {
      const x = i * (this.canvas.width / this.options.maxPoints);
      const y = this.canvas.height - point.rpm * (this.canvas.height / 100);
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    
    requestAnimationFrame(this.draw.bind(this));
  }
}