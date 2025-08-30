const irsdk = require('iracing-sdk-js');
const fetch = require('node-fetch');

const status = {
  broadcasting: false,
  iracingConnected: false,
  backendUrl: 'https://radianapp.onrender.com',
  packetsSent: 0,
  lastUpdate: ''
};

function startIRacing(tray) {
  irsdk.init({
    telemetryUpdateInterval: 1000,
    sessionInfoUpdateInterval: 0 // Manual session polling
  });

  const iracing = irsdk.getInstance();

  console.log('🔍 Waiting for iRacing...');
  tray.setIdle();

  iracing.on('Connected', () => {
    console.log('✅ Connected to iRacing');
    tray.setBroadcasting();
    status.iracingConnected = true;

    let lastSent = 0;

    // 🔁 Poll session info every 2 seconds
    setInterval(() => {
      const sessionInfo = iracing.sessionInfo;
      if (sessionInfo?.data) {
        console.log('\n📋 Polled SessionInfo:\n');
        console.dir(sessionInfo.data, { depth: null });

        fetch(status.backendUrl + '/sessionInfo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionInfo.data)
        })
        .then(res => {
          console.log('✅ SessionInfo POST status:', res.status);
          return res.text();
        })
        .then(body => console.log('📨 SessionInfo response body:', body))
        .catch(err => console.error('❌ SessionInfo POST failed:', err));
      } else {
        console.warn('⚠️ No session info available yet.');
      }
    }, 2000);

    // 📡 Stream telemetry at 1Hz
    iracing.on('Telemetry', (telemetry) => {
      const now = Date.now();
      if (now - lastSent < 1000) return; // Throttle to 1Hz
      lastSent = now;

      console.log('\n📡 Telemetry Update:\n');
      console.dir(telemetry, { depth: null });

      status.broadcasting = true;
      status.packetsSent += 1;
      status.lastUpdate = new Date().toLocaleTimeString();

      fetch(status.backendUrl + '/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetry)
      })
      .then(res => {
        console.log('✅ Telemetry POST status:', res.status);
        return res.text();
      })
      .then(body => console.log('📨 Telemetry response body:', body))
      .catch(err => console.error('❌ Telemetry POST failed:', err));
    });
  });

  iracing.on('Disconnected', () => {
    console.log('❌ iRacing shut down');
    tray.setIdle();
    status.iracingConnected = false;
  });
}

function getStatus() {
  return status;
}

module.exports = {
  startIRacing,
  getStatus
};
