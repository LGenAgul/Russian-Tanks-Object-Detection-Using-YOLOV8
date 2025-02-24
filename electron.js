const { app, BrowserWindow,ipcMain } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 1000,
        title: "ობიექტის აღმოჩენა",
        icon: __dirname + '/icon.ico',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity:false,
            autoHideMenuBar: true,
          
        }
    });

    // Load your Node.js server URL
    mainWindow.loadURL('http://localhost:80');
    mainWindow.setMenuBarVisibility(false)
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

ipcMain.on('close', () => {
    app.quit()
  })
