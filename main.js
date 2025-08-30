const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const createTray = require('./tray');
const { startIRacing, getStatus } = require('./iracing');

// 🔧 Proxy bypass for packaged .exe
app.commandLine.appendSwitch('no-proxy-server');
app.commandLine.appendSwitch('proxy-server', 'direct://');

let mainWindow;


app.whenReady().then(() => {
  const settings = app.getLoginItemSettings();
  if (!settings.openAtLogin) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe')
    });
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 300,
    height: 100,
    frame: false,
    transparent: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      devTools: false,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.setMenu(null);

  mainWindow.loadFile('index.html');

  const tray = createTray(mainWindow);

  // ✅ Start telemetry immediately
  startIRacing(tray);
});


ipcMain.handle('get-status', () => getStatus());

ipcMain.on('minimize-window', () => {
  mainWindow.minimize();
});

app.on('window-all-closed', (e) => e.preventDefault());
