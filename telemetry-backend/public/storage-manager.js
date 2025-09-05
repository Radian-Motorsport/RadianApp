/**
 * Storage Manager - Centralized localStorage management for telemetry app
 * Handles data persistence across page navigation
 */

class StorageManager {
  constructor() {
    this.storageKeys = {
      // Visualization data
      enviroTrace: 'enviroTrace_buffer',
      pedalTrace: 'pedalTrace_buffer',
      trackMap: 'trackMap_data',
      
      // Core telemetry state
      telemetryState: 'telemetry_state',
      
      // Planner data
      plannerState: 'planner_state',
      
      // Connection data
      connectionHistory: 'connection_history'
    };
    
    this.defaultRetentionPeriods = {
      visualization: 2 * 60 * 60 * 1000,    // 2 hours
      telemetryState: 8 * 60 * 60 * 1000,   // 8 hours
      plannerState: 12 * 60 * 60 * 1000,    // 12 hours
      connectionHistory: 1 * 60 * 60 * 1000  // 1 hour
    };
  }

  /**
   * Save data to localStorage with timestamp
   * @param {string} key - Storage key
   * @param {any} data - Data to save
   */
  save(key, data) {
    try {
      const wrappedData = {
        data: data,
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem(key, JSON.stringify(wrappedData));
      console.log(`StorageManager: Saved data to ${key}`);
    } catch (error) {
      console.warn(`StorageManager: Failed to save ${key}:`, error);
      
      // If storage is full, try to clean up and retry
      if (error.name === 'QuotaExceededError') {
        this.cleanup();
        try {
          localStorage.setItem(key, JSON.stringify(wrappedData));
          console.log(`StorageManager: Saved ${key} after cleanup`);
        } catch (retryError) {
          console.error(`StorageManager: Failed to save ${key} even after cleanup:`, retryError);
        }
      }
    }
  }

  /**
   * Load data from localStorage
   * @param {string} key - Storage key
   * @param {number} maxAge - Maximum age in milliseconds (optional)
   * @returns {any|null} - Loaded data or null if not found/expired
   */
  load(key, maxAge = null) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      
      // Check if data has expired
      if (maxAge && parsed.timestamp) {
        const age = Date.now() - parsed.timestamp;
        if (age > maxAge) {
          console.log(`StorageManager: Data for ${key} expired (${Math.round(age/1000/60)} minutes old)`);
          localStorage.removeItem(key);
          return null;
        }
      }

      console.log(`StorageManager: Loaded data from ${key}`);
      return parsed.data;
    } catch (error) {
      console.warn(`StorageManager: Failed to load ${key}:`, error);
      // Remove corrupted data
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Save telemetry state data
   * @param {object} state - Telemetry state object
   */
  saveTelemetryState(state) {
    this.save(this.storageKeys.telemetryState, state);
  }

  /**
   * Load telemetry state data
   * @returns {object|null} - Telemetry state or null
   */
  loadTelemetryState() {
    return this.load(this.storageKeys.telemetryState, this.defaultRetentionPeriods.telemetryState);
  }

  /**
   * Save planner state data
   * @param {object} state - Planner state object
   */
  savePlannerState(state) {
    this.save(this.storageKeys.plannerState, state);
  }

  /**
   * Load planner state data
   * @returns {object|null} - Planner state or null
   */
  loadPlannerState() {
    return this.load(this.storageKeys.plannerState, this.defaultRetentionPeriods.plannerState);
  }

  /**
   * Save visualization data (used by components directly)
   * @param {string} component - Component name (enviroTrace, pedalTrace, trackMap)
   * @param {any} data - Data to save
   */
  saveVisualizationData(component, data) {
    const key = this.storageKeys[component];
    if (!key) {
      console.warn(`StorageManager: Unknown component ${component}`);
      return;
    }
    this.save(key, data);
  }

  /**
   * Load visualization data (used by components directly)
   * @param {string} component - Component name
   * @returns {any|null} - Data or null
   */
  loadVisualizationData(component) {
    const key = this.storageKeys[component];
    if (!key) {
      console.warn(`StorageManager: Unknown component ${component}`);
      return null;
    }
    return this.load(key, this.defaultRetentionPeriods.visualization);
  }

  /**
   * Clean up old/expired data
   */
  cleanup() {
    console.log('StorageManager: Starting cleanup...');
    
    // Clean up based on retention periods
    Object.entries(this.storageKeys).forEach(([component, key]) => {
      const retentionPeriod = this.getRetentionPeriod(component);
      const data = this.load(key, retentionPeriod);
      // load() automatically removes expired data
    });

    // Additional cleanup for very old data (24+ hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    Object.values(this.storageKeys).forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.timestamp && parsed.timestamp < oneDayAgo) {
            localStorage.removeItem(key);
            console.log(`StorageManager: Removed old data: ${key}`);
          }
        }
      } catch (error) {
        // Remove corrupted data
        localStorage.removeItem(key);
        console.log(`StorageManager: Removed corrupted data: ${key}`);
      }
    });

    console.log('StorageManager: Cleanup completed');
  }

  /**
   * Get retention period for a component
   * @param {string} component - Component name
   * @returns {number} - Retention period in milliseconds
   */
  getRetentionPeriod(component) {
    if (component.includes('trace') || component.includes('Map')) {
      return this.defaultRetentionPeriods.visualization;
    } else if (component.includes('telemetry')) {
      return this.defaultRetentionPeriods.telemetryState;
    } else if (component.includes('planner')) {
      return this.defaultRetentionPeriods.plannerState;
    } else if (component.includes('connection')) {
      return this.defaultRetentionPeriods.connectionHistory;
    }
    return this.defaultRetentionPeriods.visualization; // Default
  }

  /**
   * Clear all stored data (for reset functionality)
   */
  clearAll() {
    console.log('StorageManager: Clearing all stored data...');
    Object.values(this.storageKeys).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('StorageManager: All data cleared');
  }

  /**
   * Clear specific visualization data
   * @param {string} component - Component name (enviroTrace, pedalTrace, trackMap)
   */
  clearVisualizationData(component) {
    const key = this.storageKeys[component];
    if (key) {
      localStorage.removeItem(key);
      console.log(`StorageManager: Cleared ${component} data`);
    } else {
      console.warn(`StorageManager: Unknown component ${component}`);
    }
  }

  /**
   * Get storage usage information
   * @returns {object} - Storage usage stats
   */
  getStorageInfo() {
    const info = {
      totalKeys: 0,
      totalSize: 0,
      keys: {}
    };

    Object.entries(this.storageKeys).forEach(([component, key]) => {
      const data = localStorage.getItem(key);
      if (data) {
        info.totalKeys++;
        info.totalSize += data.length;
        info.keys[component] = {
          size: data.length,
          age: this.getDataAge(key)
        };
      }
    });

    return info;
  }

  /**
   * Get age of stored data
   * @param {string} key - Storage key
   * @returns {number} - Age in milliseconds
   */
  getDataAge(key) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.timestamp ? Date.now() - parsed.timestamp : 0;
      }
    } catch (error) {
      return 0;
    }
    return 0;
  }
}

// Create global instance
window.storageManager = new StorageManager();

// Auto-cleanup on page load
document.addEventListener('DOMContentLoaded', () => {
  window.storageManager.cleanup();
});

// Auto-cleanup before page unload
window.addEventListener('beforeunload', () => {
  window.storageManager.cleanup();
});

console.log('StorageManager initialized');
