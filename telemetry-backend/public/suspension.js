// Suspension Analysis JavaScript
// Handles real-time suspension telemetry data visualization

class SuspensionAnalyzer {
    constructor(socket) {
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
            maxCompression: 0,
            minCompression: 0,
            frontAvg: 0,
            rearAvg: 0,
            frontBalance: 50,
            rearBalance: 50
        };
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
            maxCompression: document.getElementById('max-compression'),
            minCompression: document.getElementById('min-compression'),
            avgFront: document.getElementById('avg-front'),
            avgRear: document.getElementById('avg-rear'),
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
        this.canvas = this.elements.oscilloscope;
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
    }
    
    setupEventListeners() {
        // Socket event for telemetry data
        this.socket.on('telemetry', (data) => {
            this.updateSuspensionData(data);
            this.updateDisplay();
            this.updateStatistics();
            this.updateOscilloscope();
        });
        
        // Oscilloscope controls
        this.elements.timeScale.addEventListener('change', (e) => {
            this.oscilloscope.timeScale = parseInt(e.target.value);
            this.oscilloscope.maxPoints = this.oscilloscope.timeScale * 60; // 60fps
        });
        
        // Resize handler
        window.addEventListener('resize', () => {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
            this.oscilloscope.width = this.canvas.width;
            this.oscilloscope.height = this.canvas.height;
        });
    }
    
    updateSuspensionData(data) {
        // Update standard suspension data
        this.suspensionData.lf.deflection = data.LFshockDefl || 0;
        this.suspensionData.lf.velocity = data.LFshockVel || 0;
        
        this.suspensionData.rf.deflection = data.RFshockDefl || 0;
        this.suspensionData.rf.velocity = data.RFshockVel || 0;
        
        this.suspensionData.lr.deflection = data.LRshockDefl || 0;
        this.suspensionData.lr.velocity = data.LRshockVel || 0;
        
        this.suspensionData.rr.deflection = data.RRshockDefl || 0;
        this.suspensionData.rr.velocity = data.RRshockVel || 0;
        
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
            deflectionEl.textContent = `${data.deflection.toFixed(3)}m`;
        }
        
        if (velocityEl) {
            const sign = data.velocity >= 0 ? '+' : '';
            velocityEl.textContent = `${sign}${data.velocity.toFixed(1)} m/s`;
        }
        
        if (fillEl) {
            // Convert deflection to percentage (assuming max travel of 0.3m)
            const maxTravel = 0.3;
            const percentage = Math.min(Math.abs(data.deflection) / maxTravel * 100, 100);
            fillEl.style.height = `${percentage}%`;
            
            // Color coding based on compression level
            if (percentage > 80) {
                fillEl.style.background = '#F44336'; // Red - high compression
            } else if (percentage > 50) {
                fillEl.style.background = '#FFC107'; // Yellow - medium compression
            } else {
                fillEl.style.background = '#4CAF50'; // Green - low compression
            }
        }
    }
    
    updateStatistics() {
        const deflections = [
            this.suspensionData.lf.deflection,
            this.suspensionData.rf.deflection,
            this.suspensionData.lr.deflection,
            this.suspensionData.rr.deflection
        ];
        
        // Calculate statistics
        this.stats.maxCompression = Math.max(...deflections);
        this.stats.minCompression = Math.min(...deflections);
        
        this.stats.frontAvg = (this.suspensionData.lf.deflection + this.suspensionData.rf.deflection) / 2;
        this.stats.rearAvg = (this.suspensionData.lr.deflection + this.suspensionData.rr.deflection) / 2;
        
        // Balance calculations (left vs right)
        const frontTotal = this.suspensionData.lf.deflection + this.suspensionData.rf.deflection;
        const rearTotal = this.suspensionData.lr.deflection + this.suspensionData.rr.deflection;
        
        if (frontTotal > 0) {
            this.stats.frontBalance = (this.suspensionData.lf.deflection / frontTotal) * 100;
        }
        
        if (rearTotal > 0) {
            this.stats.rearBalance = (this.suspensionData.lr.deflection / rearTotal) * 100;
        }
        
        // Update display
        this.elements.maxCompression.textContent = `${this.stats.maxCompression.toFixed(3)}m`;
        this.elements.minCompression.textContent = `${this.stats.minCompression.toFixed(3)}m`;
        this.elements.avgFront.textContent = `${this.stats.frontAvg.toFixed(3)}m`;
        this.elements.avgRear.textContent = `${this.stats.rearAvg.toFixed(3)}m`;
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
                // Scale deflection (0 to 0.3m) to canvas height
                y = height - (Math.abs(value) / 0.3) * height;
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
        } else {
            console.warn('Socket not available yet, retrying suspension initialization...');
            setTimeout(initializeSuspension, 500);
        }
    }
    
    // Small delay to ensure telemetry.js has initialized first
    setTimeout(initializeSuspension, 100);
});
