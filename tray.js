const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { app } = require('electron');

let tray;
let flashing = false;
let flashInterval;

function createTray(mainWindow) {
  tray = new Tray(path.join(__dirname, 'assets', 'icon-idle.png'));
  tray.setToolTip('Waiting for iRacing…');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy();
        }
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  return {
    setIdle: () => {
      tray.setToolTip('Waiting for iRacing…');
      tray.setImage(path.join(__dirname, 'assets', 'icon-idle.png'));
      stopFlashing();
    },
    setBroadcasting: () => {
      tray.setToolTip('Broadcasting telemetry');
      startFlashing();
    }
  };
}

function startFlashing() {
  if (flashing) return;
  flashing = true;
  let toggle = false;
  flashInterval = setInterval(() => {
    const icon = toggle ? 'icon-active.png' : 'icon-idle.png';
    tray.setImage(path.join(__dirname, 'assets', icon));
    toggle = !toggle;
  }, 500);
}

function stopFlashing() {
  flashing = false;
  clearInterval(flashInterval);
  tray.setImage(path.join(__dirname, 'assets', 'icon-idle.png'));
}

module.exports = createTray;

// ✅ Notes:
// - Updated all icon paths to use `assets/` subfolder
// - Ensures icons are correctly resolved in both dev and packaged builds
