/**
 * EnviroTrace - A visualization component for environmental conditions
 */
class EnviroTrace {
  /**
   * Create a new environment trends visualization
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
      maxPoints: options.maxPoints || 600,
      trackTempColor: options.trackTempColor || 'orange',
      airTempColor: options.airTempColor || 'cyan',
      humidityColor: options.humidityColor || 'purple',
      tempScale: options.tempScale || 2, // Scale factor for temperature values
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
      
      // Environment data buffer
      this.buffer.push({
        trackTemp: values.TrackTemp,
        airTemp: values.AirTemp,
        humidity: values.RelativeHumidity
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
   * Draw the environment trends graph
   */
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.buffer.length === 0) {
      requestAnimationFrame(this.draw.bind(this));
      return;
    }
    
    // Calculate x scaling based on number of points and canvas width
    const xScale = this.canvas.width / this.options.maxPoints;
    
    // Track Temperature
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.trackTempColor;
    this.ctx.lineWidth = 1.5;
    this.buffer.forEach((point, i) => {
      const x = i * xScale;
      const y = this.canvas.height - point.trackTemp * this.options.tempScale;
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    
    // Air Temperature
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.airTempColor;
    this.ctx.lineWidth = 1.5;
    this.buffer.forEach((point, i) => {
      const x = i * xScale;
      const y = this.canvas.height - point.airTemp * this.options.tempScale;
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    
    // Humidity
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.humidityColor;
    this.ctx.lineWidth = 1.5;
    this.buffer.forEach((point, i) => {
      const x = i * xScale;
      const y = this.canvas.height - point.humidity;
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    
    // Optional: Add a legend
    this.drawLegend();
    
    requestAnimationFrame(this.draw.bind(this));
  }
  
  /**
   * Draw a legend for the graph
   */
  drawLegend() {
    const legendX = 10;
    const legendY = 20;
    const lineLength = 20;
    const spacing = 20;
    
    // Track Temp
    this.ctx.strokeStyle = this.options.trackTempColor;
    this.ctx.beginPath();
    this.ctx.moveTo(legendX, legendY);
    this.ctx.lineTo(legendX + lineLength, legendY);
    this.ctx.stroke();
    this.ctx.fillStyle = 'white';
    this.ctx.font = '12px Arial';
    this.ctx.fillText('Track Temp', legendX + lineLength + 5, legendY + 4);
    
    // Air Temp
    this.ctx.strokeStyle = this.options.airTempColor;
    this.ctx.beginPath();
    this.ctx.moveTo(legendX, legendY + spacing);
    this.ctx.lineTo(legendX + lineLength, legendY + spacing);
    this.ctx.stroke();
    this.ctx.fillText('Air Temp', legendX + lineLength + 5, legendY + spacing + 4);
    
    // Humidity
    this.ctx.strokeStyle = this.options.humidityColor;
    this.ctx.beginPath();
    this.ctx.moveTo(legendX, legendY + spacing * 2);
    this.ctx.lineTo(legendX + lineLength, legendY + spacing * 2);
    this.ctx.stroke();
    this.ctx.fillText('Humidity', legendX + lineLength + 5, legendY + spacing * 2 + 4);
  }
}