class TrackMap {
  constructor(socket, containerId) {
    this.socket = socket;
    this.container = document.getElementById(containerId);
    
    // Track variables
    this.liveLapPct = 0;
    this.trackPath = null;
    this.pathLength = 0;
    this.startPosition = 0;
    
    // Car positioning data
    this.fuelLevel = 0;
    this.fuelLevelPct = 0;
    this.tankCapacity = 104;
    this.avgFuelPerLap = 0;
    
    // Cache info box elements
    this.cacheInfoElements();
    
    // Initialize SVG track
    this.initializeSVGTrack();
    
    // Setup event listeners
    this.setupListeners();
  }

  initializeSVGTrack() {
    // Create SVG element with exact attributes from your original
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '1000');
    this.svg.setAttribute('height', '1000');
    this.svg.setAttribute('viewBox', '0 0 264.58333 264.58333');
    this.svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    this.svg.style.width = '100%';
    this.svg.style.height = '600px';
    
    // Create track path
    this.trackPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.trackPath.setAttribute('d', 'm 124.93136,181.2191 c -21.47552,0 -45.241132,-0.15167 -69.143246,-0.59149 -0.500492,-0.0152 -0.98582,-0.0456 -1.471136,-0.13649 -1.607631,-0.25783 -3.776419,-0.84932 -4.974551,-2.18396 -1.016147,-1.13747 -2.593439,-3.68541 -1.774466,-8.14431 0.30333,-1.6228 0.561158,-4.59539 -1.046473,-6.46085 -1.198144,-1.38014 -3.321418,-2.03229 -6.309192,-1.92612 -0.470152,0.0151 -1.122303,0.0606 -1.835119,0.10618 -1.319476,0.091 -2.684443,0.18199 -3.609585,0.15166 -6.642848,-0.2275 -10.828748,-1.31947 -13.558685,-3.50342 C 13.792579,152.61543 10.349825,141.87768 9.9706666,140.67955 8.3327039,135.341 10.334658,130.88211 15.582203,128.137 c 2.062623,-1.07681 3.91291,-1.69864 7.295,-1.69864 3.382091,0 7.583152,0.0759 10.874243,0.12135 1.501462,0.0303 2.851266,0.0456 3.912915,0.0606 3.897739,-0.10618 4.70156,-1.12229 5.717707,-2.3811 1.653121,-2.06262 3.382072,-3.63992 9.281777,-3.63992 6.506353,0 120.208255,0.68249 121.345725,0.69765 0.5915,0 1.00097,-0.28816 1.22848,-0.53082 0.36399,-0.39432 0.57631,-0.94032 0.54599,-1.51664 -0.0303,-0.65215 -0.0606,-1.41046 -0.10618,-2.2446 -0.2275,-4.73191 -0.54599,-11.22309 -0.0456,-14.39285 0.84931,-5.384042 4.12524,-6.915843 7.02201,-8.265647 1.83512,-0.864487 3.56408,-1.668296 5.02005,-3.397248 1.80479,-2.153624 1.3498,-6.233361 0.92515,-10.176615 -0.33366,-3.109093 -0.69766,-6.339519 -0.0152,-8.993623 0.83414,-3.291091 3.13942,-5.247543 6.84,-5.8087 3.29109,-0.50048 8.25048,-0.591484 12.95204,-0.212325 5.88453,0.470153 16.65262,1.895785 22.11249,3.928078 10.07044,3.761244 16.92562,10.58609 20.36838,20.292542 4.82288,13.604178 4.21623,24.493608 3.63991,35.019028 -0.16683,2.91193 -0.97065,6.76419 -6.0817,6.76419 v 0 c -2.89677,0 -7.85615,-0.182 -11.82973,-0.33366 -1.48629,-0.0606 -2.91194,-0.10618 -4.01907,-0.15168 -1.27397,-0.0456 -2.50244,0.33367 -3.44275,1.07681 -1.66829,1.28914 -2.00196,2.95744 -1.00098,5.11105 0.25783,0.54599 0.59148,1.24365 0.98581,2.06263 1.44081,2.98776 3.42758,7.08266 4.04941,9.38794 1.89578,7.05234 0.51564,14.13501 -3.88258,19.94371 -2.65411,3.5186 -6.35469,6.44568 -10.70742,8.46281 -4.4589,2.09295 -9.63062,3.21525 -14.92367,3.27592 -1.56213,0.0152 -3.42758,0.0456 -5.5812,0.0606 -14.83265,0.24266 -41.49503,0.56114 -73.132,0.56114 z');
    this.trackPath.setAttribute('fill', 'none');
    this.trackPath.setAttribute('stroke', '#ffffff');
    this.trackPath.setAttribute('stroke-width', '1.14643');
    
    // Create start/finish line
    this.startFinishRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    this.startFinishRect.setAttribute('x', '141.26521');
    this.startFinishRect.setAttribute('y', '177.90924');
    this.startFinishRect.setAttribute('width', '1.1603841');
    this.startFinishRect.setAttribute('height', '6.796535');
    this.startFinishRect.setAttribute('fill', '#ff0000');
    
    // Create car marker
    this.carMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.carMarker.setAttribute('r', '2');
    this.carMarker.setAttribute('fill', '#00ff00');
    this.carMarker.setAttribute('stroke', '#ffffff');
    this.carMarker.setAttribute('stroke-width', '0.5');
    
    // Add elements to SVG
    this.svg.appendChild(this.trackPath);
    this.svg.appendChild(this.startFinishRect);
    this.svg.appendChild(this.carMarker);
    
    // Add corner numbers
    this.addCornerNumbers();
    
    // Add SVG to container
    this.container.appendChild(this.svg);
    
    // Calculate path properties
    this.pathLength = this.trackPath.getTotalLength();
    this.calculateStartPosition();
    
    // Initialize car marker at start position
    this.updateCarPosition(0);
  }

  addCornerNumbers() {
    const corners = [
      {x: "51.475407", y: "175.78003", text: "1"},
      {x: "46.50354", y: "159.33336", text: "2"},
      {x: "24.622015", y: "157.17836", text: "3"},
      {x: "9.0397148", y: "126.51107", text: "4"},
      {x: "40.374626", y: "134.79555", text: "5"},
      {x: "48.824314", y: "116.56493", text: "6"},
      {x: "178.95309", y: "125.6822", text: "7"},
      {x: "169.01289", y: "98.489273", text: "8"},
      {x: "192.54672", y: "93.854248", text: "9"},
      {x: "182.44246", y: "62.85656", text: "10"},
      {x: "238.46535", y: "87.389526", text: "11"},
      {x: "242.28313", y: "126.34473", text: "12"},
      {x: "218.08058", y: "133.30392", text: "13"},
      {x: "234.31998", y: "170.27414", text: "14"}
    ];

    corners.forEach(corner => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('xml:space', 'preserve');
      text.setAttribute('style', 'font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:6.85508px;line-height:3.59033px;font-family:\'Road Rage\';-inkscape-font-specification:\'Road Rage\';fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.655815;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1');
      text.setAttribute('x', corner.x);
      text.setAttribute('y', corner.y);
      
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('sodipodi:role', 'line');
      tspan.setAttribute('style', 'font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:6.85508px;font-family:\'Road Rage\';-inkscape-font-specification:\'Road Rage\';fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.655815;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1');
      tspan.setAttribute('x', corner.x);
      tspan.setAttribute('y', corner.y);
      tspan.textContent = corner.text;
      
      text.appendChild(tspan);
      this.svg.appendChild(text);
    });
  }

  calculateStartPosition() {
    // Find closest point on path to start/finish rectangle
    const rectCenterX = 141.26521 + (1.1603841 / 2);
    const rectCenterY = 177.90924 + (6.796535 / 2);
    
    let closestDistance = Infinity;
    this.startPosition = 0;
    
    for (let i = 0; i <= this.pathLength; i += 1) {
      const point = this.trackPath.getPointAtLength(i);
      const distance = Math.sqrt(Math.pow(point.x - rectCenterX, 2) + Math.pow(point.y - rectCenterY, 2));
      if (distance < closestDistance) {
        closestDistance = distance;
        this.startPosition = i;
      }
    }
  }

  updateCarPosition(lapPct) {
    this.liveLapPct = lapPct;
    
    // Calculate position along path from start/finish line
    const positionAlongPath = (this.startPosition + (this.pathLength * lapPct)) % this.pathLength;
    const point = this.trackPath.getPointAtLength(positionAlongPath);
    
    // Update car marker position
    this.carMarker.setAttribute('cx', point.x);
    this.carMarker.setAttribute('cy', point.y);
  }

  cacheInfoElements() {
    this.fuelLevelElement = document.getElementById('fuelLevelPercent');
    this.estimatedLapsElement = document.getElementById('estimatedLaps');
    this.carAheadElement = document.getElementById('carAheadDistance');
    this.carBehindElement = document.getElementById('carBehindDistance');
    this.lapDistPctElement = document.getElementById('lapDistPct');
  }

  setupListeners() {
    if (this.socket) {
      this.socket.on('telemetryData', (data) => {
        if (data.LapDistPct !== undefined) {
          this.updateCarPosition(data.LapDistPct);
          if (this.lapDistPctElement) {
            this.lapDistPctElement.textContent = (data.LapDistPct * 100).toFixed(1) + '%';
          }
        }
        
        if (data.FuelLevel !== undefined) {
          this.fuelLevel = data.FuelLevel;
          this.updateInfoBoxes();
        }
        
        if (data.FuelLevelPct !== undefined) {
          this.fuelLevelPct = data.FuelLevelPct;
          this.updateInfoBoxes();
        }
        
        if (data.CarDistAhead !== undefined) {
          if (this.carAheadElement) {
            this.carAheadElement.textContent = data.CarDistAhead + ' m';
          }
        }
        
        if (data.CarDistBehind !== undefined) {
          if (this.carBehindElement) {
            this.carBehindElement.textContent = data.CarDistBehind + ' m';
          }
        }
      });
    }
  }

  updateInfoBoxes() {
    if (this.fuelLevelElement && this.fuelLevelPct !== undefined) {
      this.fuelLevelElement.textContent = (this.fuelLevelPct * 100).toFixed(1) + '%';
    }
    
    if (this.estimatedLapsElement && this.avgFuelPerLap > 0 && this.fuelLevel !== undefined) {
      const estimatedLaps = this.fuelLevel / this.avgFuelPerLap;
      this.estimatedLapsElement.textContent = estimatedLaps.toFixed(1);
    }
  }
}
