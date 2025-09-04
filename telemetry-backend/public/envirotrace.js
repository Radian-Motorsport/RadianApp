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
    
    // Check if canvas exists
    if (!this.canvas) {
      console.error(`EnviroTrace: Canvas element with ID '${canvasId}' not found`);
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    
    // Configuration with defaults
    this.options = {
      maxPoints: options.maxPoints || 3600, // 1 hour at 1 point per second
      trackTempColor: options.trackTempColor || 'orange',
      airTempColor: options.airTempColor || 'cyan',
      humidityColor: options.humidityColor || 'purple',
      skiesColor: options.skiesColor || 'blue',
      airPressureColor: options.airPressureColor || 'hotpink',
      tempScale: options.tempScale || 2, // Scale factor for temperature values
      sampleRate: options.sampleRate || 60, // Take 1 sample every 60 telemetry updates (~1 second)
      ...options
    };
    
    // Data buffer
    this.buffer = [];
    this.sampleCounter = 0; // Counter for sampling rate
    
    // Load any existing data from localStorage
    this.loadFromStorage();
    
    // Set up telemetry listener
    this.setupListeners();
    
    // Start animation
    this.startAnimation();
    
    // Save data to localStorage periodically
    this.setupAutoSave();
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
        humidity: values.RelativeHumidity,
        skies: values.Skies, // Store raw 0-3 value, scaling handled in drawing
        airPressure: values.AirPressure, // Store in Pa, will convert to mbar for display
        timestamp: Date.now() // Add timestamp for persistence filtering
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
    // Check if canvas and context exist
    if (!this.canvas || !this.ctx) {
      return;
    }
    
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
      if (point.trackTemp === null || point.trackTemp === undefined) return;
      const x = i * xScale;
      // Scale temperature: map 0-60°C to 0-canvas height
      const y = canvasHeight - ((point.trackTemp / 60) * canvasHeight);
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    
    // Humidity (0-1 or 0-100% maps to full canvas height)
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.humidityColor;
    this.ctx.lineWidth = 1.5;
    this.buffer.forEach((point, i) => {
      if (point.humidity === null || point.humidity === undefined) return;
      const x = i * xScale;
      // Humidity: handle both 0-1 decimal and 0-100 percentage formats
      const humidityPercent = point.humidity > 1 ? point.humidity : point.humidity * 100;
      const y = canvasHeight - ((humidityPercent / 100) * canvasHeight);
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    
    // Skies (0-3 scaled to 0-100% of canvas height) 
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.skiesColor;
    this.ctx.lineWidth = 1.5;
    this.buffer.forEach((point, i) => {
      if (point.skies === null || point.skies === undefined) return;
      const x = i * xScale;
      // Skies: map 0-3 to full canvas height (0=0%, 1=33%, 2=67%, 3=100%)
      const y = canvasHeight - ((point.skies / 3) * canvasHeight);
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    
    // Air Pressure (950-1050 mbar range maps to full canvas height)
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.airPressureColor;
    this.ctx.lineWidth = 1.5;
    this.buffer.forEach((point, i) => {
      if (point.airPressure === null || point.airPressure === undefined) return;
      const x = i * xScale;
      // Convert Pa to mbar: 1 Pa = 0.01 mbar, then scale 950-1050 mbar range
      const pressureMbar = point.airPressure * 0.01;
      const y = canvasHeight - (((pressureMbar - 950) / 100) * canvasHeight);
      i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    
    requestAnimationFrame(this.draw.bind(this));
  }
  
  /**
   * Load buffer data from localStorage
   */
  loadFromStorage() {
    if (!window.storageManager) {
      console.warn('EnviroTrace: StorageManager not available');
      return;
    }
    
    try {
      const savedData = window.storageManager.loadVisualizationData('enviroTrace');
      if (savedData && Array.isArray(savedData)) {
        this.buffer = savedData;
        console.log(`EnviroTrace: Loaded ${this.buffer.length} data points from storage`);
      }
    } catch (error) {
      console.warn('EnviroTrace: Failed to load data from storage:', error);
      this.buffer = [];
    }
  }
  
  /**
   * Save buffer data to localStorage
   */
  saveToStorage() {
    if (!window.storageManager) {
      console.warn('EnviroTrace: StorageManager not available');
      return;
    }
    
    try {
      window.storageManager.saveVisualizationData('enviroTrace', this.buffer);
    } catch (error) {
      console.warn('EnviroTrace: Failed to save data to storage:', error);
    }
  }
  
  /**
   * Set up automatic saving to localStorage
   */
  setupAutoSave() {
    // Save every 30 seconds
    setInterval(() => {
      this.saveToStorage();
    }, 30000);
    
    // Save when page is about to unload
    window.addEventListener('beforeunload', () => {
      this.saveToStorage();
    });
  }
}