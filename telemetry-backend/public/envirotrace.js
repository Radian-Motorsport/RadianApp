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
      maxPoints: options.maxPoints || 3600, // 1 hour at 1 point per second
      trackTempColor: options.trackTempColor || 'orange',
      airTempColor: options.airTempColor || 'cyan',
      humidityColor: options.humidityColor || 'purple',
      skiesColor: options.skiesColor || 'blue',
      tempScale: options.tempScale || 2, // Scale factor for temperature values
      sampleRate: options.sampleRate || 60, // Take 1 sample every 60 telemetry updates (~1 second)
      ...options
    };
    
    // Data buffer
    this.buffer = [];
    this.sampleCounter = 0; // Counter for sampling rate
    
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
      
      // Only sample data at the specified rate (e.g., every 60 updates = ~1 second)
      this.sampleCounter++;
      if (this.sampleCounter < this.options.sampleRate) return;
      this.sampleCounter = 0;
      
      // Environment data buffer
      this.buffer.push({
        trackTemp: values.TrackTemp,
        airTemp: values.AirTemp,
        humidity: values.RelativeHumidity,
        skies: values.Skies // Store raw 0-3 value, scaling handled in drawing
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
    const canvasHeight = this.canvas.height;
    
    // Track Temperature (scale from typical range 10-60°C to full canvas height)
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.trackTempColor;
    this.ctx.lineWidth = 1.5;
    this.buffer.forEach((point, i) => {
      const x = i * xScale;
      // Scale temperature: map 0-60°C to 0-canvas height
      const y = canvasHeight - ((point.trackTemp / 60) * canvasHeight);
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    
    // Air Temperature (scale from typical range 0-50°C to full canvas height)
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.airTempColor;
    this.ctx.lineWidth = 1.5;
    this.buffer.forEach((point, i) => {
      const x = i * xScale;
      // Scale temperature: map 0-50°C to 0-canvas height
      const y = canvasHeight - ((point.airTemp / 50) * canvasHeight);
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    
    // Humidity (0-100% maps to full canvas height)
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.humidityColor;
    this.ctx.lineWidth = 1.5;
    this.buffer.forEach((point, i) => {
      const x = i * xScale;
      const y = canvasHeight - ((point.humidity / 100) * canvasHeight);
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    
    // Skies (0-3 scaled to 0-100% of canvas height)
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.skiesColor;
    this.ctx.lineWidth = 1.5;
    this.buffer.forEach((point, i) => {
      const x = i * xScale;
      // Skies: map 0-3 to 0-canvas height (each step = 25% of height)
      const y = canvasHeight - ((point.skies / 75) * canvasHeight);
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
    
    // Skies
    this.ctx.strokeStyle = this.options.skiesColor;
    this.ctx.beginPath();
    this.ctx.moveTo(legendX, legendY + spacing * 3);
    this.ctx.lineTo(legendX + lineLength, legendY + spacing * 3);
    this.ctx.stroke();
    this.ctx.fillText('Skies', legendX + lineLength + 5, legendY + spacing * 3 + 4);
  }
}