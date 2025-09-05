// Suspension Analysis JavaScript
// Handles real-time suspension telemetry data visualization

class SuspensionAnalyzer {
    constructor(socket) {
        try {
            this.socket = socket;
            this.elements = this.cacheElements();
            this.setupOscilloscope();
            this.setupEventListeners();
            
            // Data storage for analysis
            this.suspensionData = {
                lf: { deflection: 0, velocity: 0, history: [] },
                rf: { deflection: 0, velocity: 0, history: [] },
                lr: { deflection: 0, velocity: 0, history: [] },
                rr: { deflection: 0, velocity: 0, history: [] }
            };
            
            // High-frequency data storage (360 Hz samples)
            this.highFreqData = {
                lf: { deflection_ST: [], velocity_ST: [] },
                rf: { deflection_ST: [], velocity_ST: [] },
                lr: { deflection_ST: [], velocity_ST: [] },
                rr: { deflection_ST: [], velocity_ST: [] }
            };
            
            // Statistics tracking
            this.stats = {
                maxCompressionLF: 0,
                maxCompressionRF: 0,
                maxCompressionLR: 0,
                maxCompressionRR: 0,
                frontBalance: 50,
                rearBalance: 50
            };
            
            // Simple travel configuration
            this.maxTravel = 0.3; // Default 300mm in meters
            
            console.log('SuspensionAnalyzer constructor completed successfully');
            console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this)));
            console.log('Method check:', {
                updateSuspensionData: typeof this.updateSuspensionData,
                updateDisplay: typeof this.updateDisplay,
                updateStatistics: typeof this.updateStatistics,
                updateOscilloscope: typeof this.updateOscilloscope
            });
        } catch (error) {
            console.error('SuspensionAnalyzer constructor failed:', error);
            throw error;
        }
    }
    
    cacheElements() {
        return {
            // Corner displays
            lfDeflection: document.getElementById('lf-deflection'),
            lfVelocity: document.getElementById('lf-velocity'),
            lfFill: document.getElementById('lf-fill'),
            
            rfDeflection: document.getElementById('rf-deflection'),
            rfVelocity: document.getElementById('rf-velocity'),
            rfFill: document.getElementById('rf-fill'),
            
            lrDeflection: document.getElementById('lr-deflection'),
            lrVelocity: document.getElementById('lr-velocity'),
            lrFill: document.getElementById('lr-fill'),
            
            rrDeflection: document.getElementById('rr-deflection'),
            rrVelocity: document.getElementById('rr-velocity'),
            rrFill: document.getElementById('rr-fill'),
            
            // Statistics
            maxCompressionLF: document.getElementById('max-compression-lf'),
            maxCompressionRF: document.getElementById('max-compression-rf'),
            maxCompressionLR: document.getElementById('max-compression-lr'),
            maxCompressionRR: document.getElementById('max-compression-rr'),
            frontBalance: document.getElementById('front-balance'),
            rearBalance: document.getElementById('rear-balance'),
            
            // Oscilloscope
            oscilloscope: document.getElementById('suspension-oscilloscope'),
            showDeflection: document.getElementById('show-deflection'),
            showVelocity: document.getElementById('show-velocity'),
            timeScale: document.getElementById('time-scale')
        };
    }
    
    setupOscilloscope() {
        try {
            this.canvas = this.elements.oscilloscope;
            if (!this.canvas) {
                console.warn('Oscilloscope canvas not found, skipping oscilloscope setup');
                return;
            }
            
            this.ctx = this.canvas.getContext('2d');
            
            // Set canvas size
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
            
            // Oscilloscope settings
            this.oscilloscope = {
                width: this.canvas.width,
                height: this.canvas.height,
                timeScale: 10, // seconds
                maxPoints: 600, // 10 seconds at 60fps
                colors: {
                    lf: '#FF6B6B', // Red
                    rf: '#4ECDC4', // Teal
                    lr: '#45B7D1', // Blue
                    rr: '#96CEB4'  // Green
                }
            };
            console.log('Oscilloscope setup completed');
        } catch (error) {
            console.error('Oscilloscope setup failed:', error);
        }
    }
    
    setupEventListeners() {
        // Create explicit reference to class instance to avoid 'this' context issues
        const suspensionAnalyzer = this;
        
        // Socket event for telemetry data
        this.socket.on('telemetry', function(data) {
            if (data && data.values) {
                console.log('Suspension: Received telemetry data');
                try {
                    // Use explicit reference instead of 'this'
                    suspensionAnalyzer.updateSuspensionData(data.values);
                    suspensionAnalyzer.updateDisplay();
                    suspensionAnalyzer.updateStatistics();
                    suspensionAnalyzer.updateOscilloscope();
                } catch (error) {
                    console.error('Suspension: Error processing telemetry:', error);
                    console.log('Available methods on suspensionAnalyzer:', Object.getOwnPropertyNames(Object.getPrototypeOf(suspensionAnalyzer)));
                }
            }
        });
        
        // Oscilloscope controls
        this.elements.timeScale.addEventListener('change', (e) => {
            this.oscilloscope.timeScale = parseInt(e.target.value);
            this.oscilloscope.maxPoints = this.oscilloscope.timeScale * 60; // 60fps
        });
        
        // Travel slider control
        const travelSlider = document.getElementById('travel-slider');
        const travelValue = document.getElementById('travel-value');
        
        if (travelSlider && travelValue) {
            // Set initial value on page load
            travelValue.textContent = `${travelSlider.value}mm`;
            
            travelSlider.addEventListener('input', (e) => {
                const mmValue = parseInt(e.target.value);
                travelValue.textContent = `${mmValue}mm`;
                this.maxTravel = mmValue / 1000; // Convert mm to meters
            });
        } else {
            console.warn('Travel slider or value element not found');
        }
        
        // Resize handler
        window.addEventListener('resize', () => {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
            this.oscilloscope.width = this.canvas.width;
            this.oscilloscope.height = this.canvas.height;
        });
    }
    
    updateSuspensionData(data) {
        // Debug: Log the first few data points to see what's available
        if (Math.random() < 0.01) { // Only log 1% of the time to avoid spam
            console.log('Suspension data received:', {
                LFshockDefl: data.LFshockDefl,
                RFshockDefl: data.RFshockDefl,
                LRshockDefl: data.LRshockDefl,
                RRshockDefl: data.RRshockDefl
            });
        }
        
        // Update standard suspension data
        this.suspensionData.lf.deflection = data.LFshockDefl || 0;
        this.suspensionData.lf.velocity = data.LFshockVel || 0;
        
        this.suspensionData.rf.deflection = data.RFshockDefl || 0;
        this.suspensionData.rf.velocity = data.RFshockVel || 0;
        
        this.suspensionData.lr.deflection = data.LRshockDefl || 0;
        this.suspensionData.lr.velocity = data.LRshockVel || 0;
        
        this.suspensionData.rr.deflection = data.RRshockDefl || 0;
        this.suspensionData.rr.velocity = data.RRshockVel || 0;
        
        // Update auto-scaling if enabled
        [this.suspensionData.lf.deflection, this.suspensionData.rf.deflection,
         this.suspensionData.lr.deflection, this.suspensionData.rr.deflection].forEach(deflection => {
            this.updateAutoScale(deflection);
        });
        
        // Update high-frequency data (360 Hz samples - 6 samples per frame)
        this.highFreqData.lf.deflection_ST = data.LFshockDefl_ST || [];
        this.highFreqData.lf.velocity_ST = data.LFshockVel_ST || [];
        
        this.highFreqData.rf.deflection_ST = data.RFshockDefl_ST || [];
        this.highFreqData.rf.velocity_ST = data.RFshockVel_ST || [];
        
        this.highFreqData.lr.deflection_ST = data.LRshockDefl_ST || [];
        this.highFreqData.lr.velocity_ST = data.LRshockVel_ST || [];
        
        this.highFreqData.rr.deflection_ST = data.RRshockDefl_ST || [];
        this.highFreqData.rr.velocity_ST = data.RRshockVel_ST || [];
        
        // Store history for oscilloscope (both standard and high-freq)
        const timestamp = Date.now();
        Object.keys(this.suspensionData).forEach(corner => {
            // Store standard rate data
            this.suspensionData[corner].history.push({
                timestamp,
                deflection: this.suspensionData[corner].deflection,
                velocity: this.suspensionData[corner].velocity
            });
            
            // Store high-frequency samples if available
            const cornerKey = corner.toUpperCase();
            const deflectionST = this.highFreqData[corner].deflection_ST;
            const velocityST = this.highFreqData[corner].velocity_ST;
            
            if (deflectionST.length === 6 && velocityST.length === 6) {
                // Add each of the 6 high-frequency samples
                for (let i = 0; i < 6; i++) {
                    this.suspensionData[corner].history.push({
                        timestamp: timestamp + (i * (1000/360)), // Spread across 360Hz intervals
                        deflection: deflectionST[i],
                        velocity: velocityST[i],
                        isHighFreq: true
                    });
                }
            }
            
            // Limit history length (keep more points for detailed analysis)
            if (this.suspensionData[corner].history.length > this.oscilloscope.maxPoints * 2) {
                this.suspensionData[corner].history.shift();
            }
        });
    }
    
    updateDisplay() {
        // Update four-corner display
        this.updateCornerDisplay('lf', this.suspensionData.lf);
        this.updateCornerDisplay('rf', this.suspensionData.rf);
        this.updateCornerDisplay('lr', this.suspensionData.lr);
        this.updateCornerDisplay('rr', this.suspensionData.rr);
    }
    
    updateCornerDisplay(corner, data) {
        const deflectionEl = this.elements[`${corner}Deflection`];
        const velocityEl = this.elements[`${corner}Velocity`];
        const fillEl = this.elements[`${corner}Fill`];
        
        if (deflectionEl) {
            // Convert meters to millimeters for display
            const deflectionMm = data.deflection * 1000;
            deflectionEl.textContent = `${deflectionMm.toFixed(1)}mm`;
        } else {
            console.warn(`Missing deflection element for ${corner}`);
        }
        
        if (velocityEl) {
            const sign = data.velocity >= 0 ? '+' : '';
            velocityEl.textContent = `${sign}${data.velocity.toFixed(1)} m/s`;
        } else {
            console.warn(`Missing velocity element for ${corner}`);
        }
        
        if (fillEl) {
            // Use slider-controlled max travel value
            const percentage = Math.min(Math.abs(data.deflection) / this.maxTravel * 100, 100);
            fillEl.style.height = `${percentage}%`;
            
            // Color coding based on compression level
            if (percentage > 80) {
                fillEl.style.background = '#F44336'; // Red - high compression
            } else if (percentage > 50) {
                fillEl.style.background = '#FFC107'; // Yellow - medium compression
            } else {
                fillEl.style.background = '#4CAF50'; // Green - low compression
            }
        } else {
            console.warn(`Missing fill element for ${corner}`);
        }
    }
    
    updateStatistics() {
        // Track per-corner max compression
        this.stats.maxCompressionLF = Math.max(this.stats.maxCompressionLF, Math.abs(this.suspensionData.lf.deflection));
        this.stats.maxCompressionRF = Math.max(this.stats.maxCompressionRF, Math.abs(this.suspensionData.rf.deflection));
        this.stats.maxCompressionLR = Math.max(this.stats.maxCompressionLR, Math.abs(this.suspensionData.lr.deflection));
        this.stats.maxCompressionRR = Math.max(this.stats.maxCompressionRR, Math.abs(this.suspensionData.rr.deflection));
        
        // Balance calculations (left vs right)
        const frontTotal = Math.abs(this.suspensionData.lf.deflection) + Math.abs(this.suspensionData.rf.deflection);
        const rearTotal = Math.abs(this.suspensionData.lr.deflection) + Math.abs(this.suspensionData.rr.deflection);
        
        if (frontTotal > 0) {
            this.stats.frontBalance = (Math.abs(this.suspensionData.lf.deflection) / frontTotal) * 100;
        }
        
        if (rearTotal > 0) {
            this.stats.rearBalance = (Math.abs(this.suspensionData.lr.deflection) / rearTotal) * 100;
        }
        
        // Update display elements with converted values (meters to mm)
        this.elements.maxCompressionLF.textContent = `${(this.stats.maxCompressionLF * 1000).toFixed(1)}mm`;
        this.elements.maxCompressionRF.textContent = `${(this.stats.maxCompressionRF * 1000).toFixed(1)}mm`;
        this.elements.maxCompressionLR.textContent = `${(this.stats.maxCompressionLR * 1000).toFixed(1)}mm`;
        this.elements.maxCompressionRR.textContent = `${(this.stats.maxCompressionRR * 1000).toFixed(1)}mm`;
        this.elements.frontBalance.textContent = `${this.stats.frontBalance.toFixed(1)}%`;
        this.elements.rearBalance.textContent = `${this.stats.rearBalance.toFixed(1)}%`;
    }
    
    updateOscilloscope() {
        if (!this.ctx) return;
        
        const { width, height, colors } = this.oscilloscope;
        const showDeflection = this.elements.showDeflection.checked;
        const showVelocity = this.elements.showVelocity.checked;
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw suspension traces
        Object.keys(this.suspensionData).forEach(corner => {
            const history = this.suspensionData[corner].history;
            if (history.length < 2) return;
            
            if (showDeflection) {
                this.drawTrace(history, 'deflection', colors[corner], 1);
            }
            
            if (showVelocity) {
                this.drawTrace(history, 'velocity', colors[corner], 0.5);
            }
        });
        
        // Draw legend
        this.drawLegend();
    }
    
    drawGrid() {
        const { width, height } = this.oscilloscope;
        
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        
        // Vertical grid lines (time)
        for (let i = 0; i <= 10; i++) {
            const x = (i / 10) * width;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        // Horizontal grid lines
        for (let i = 0; i <= 8; i++) {
            const y = (i / 8) * height;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
    }
    
    drawTrace(history, type, color, alpha) {
        const { width, height, timeScale } = this.oscilloscope;
        
        this.ctx.strokeStyle = color;
        this.ctx.globalAlpha = alpha;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        const now = Date.now();
        const timeRange = timeScale * 1000; // Convert to milliseconds
        
        let first = true;
        history.forEach((point, index) => {
            const timeDiff = now - point.timestamp;
            if (timeDiff > timeRange) return;
            
            const x = width - (timeDiff / timeRange) * width;
            const value = point[type];
            
            // Scale value to canvas height
            let y;
            if (type === 'deflection') {
                // Scale deflection using slider-controlled max travel
                y = height - (Math.abs(value) / this.maxTravel) * height;
            } else {
                // Scale velocity (-5 to +5 m/s) to canvas height
                y = height / 2 - (value / 5) * (height / 2);
            }
            
            if (first) {
                this.ctx.moveTo(x, y);
                first = false;
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }
    
    drawLegend() {
        const { colors } = this.oscilloscope;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 120, 100);
        
        this.ctx.font = '12px monospace';
        let y = 25;
        
        Object.keys(colors).forEach((corner, index) => {
            this.ctx.fillStyle = colors[corner];
            this.ctx.fillRect(15, y - 8, 10, 10);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(corner.toUpperCase(), 30, y);
            y += 20;
        });
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for socket to be available from telemetry.js
    function initializeSuspension() {
        if (typeof socket !== 'undefined' && socket) {
            window.suspensionAnalyzer = new SuspensionAnalyzer(socket);
            console.log('SuspensionAnalyzer initialized');
            
            // Verify methods are accessible
            console.log('Methods check:', {
                updateDisplay: typeof window.suspensionAnalyzer.updateDisplay,
                updateCornerDisplay: typeof window.suspensionAnalyzer.updateCornerDisplay,
                updateStatistics: typeof window.suspensionAnalyzer.updateStatistics
            });
        } else {
            console.warn('Socket not available yet, retrying suspension initialization...');
            setTimeout(initializeSuspension, 500);
        }
    }
    
    // Small delay to ensure telemetry.js has initialized first
    setTimeout(initializeSuspension, 100);
});
