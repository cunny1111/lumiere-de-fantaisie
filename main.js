const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const GameManager = require('./src/main/game/manager');
const logger = require('./src/main/system/logger');

let mainWindow;
let gameManager;
let tray = null;

// Tạo cửa sổ chính
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hidden',
    frame: false,
    show: false
  });

  // Load HTML file
  mainWindow.loadFile('src/renderer/index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    createTray();
  // mainWindow.webContents.openDevTools();
  });

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  // Chặn context menu chuột phải
  mainWindow.webContents.on('context-menu', (e) => {
      e.preventDefault();
  });
  
  // Chặn các phím tắt developer tools
  mainWindow.webContents.on('before-input-event', (event, input) => {
      // Chặn F12
      if (input.key === 'F12') {
          event.preventDefault();
      }
      
      // Chặn Ctrl+Shift+I
      if (input.control && input.shift && input.key === 'I') {
          event.preventDefault();
      }
      
      // Chặn Ctrl+U
      if (input.control && input.key === 'U') {
          event.preventDefault();
      }
      
      // Chặn Ctrl+Shift+C
      if (input.control && input.shift && input.key === 'C') {
          event.preventDefault();
      }
  });
}

// Khởi tạo Game Manager
async function initializeGameManager() {
  try {
    gameManager = new GameManager();
    await gameManager.initialize();
    logger.info('Game Manager initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Game Manager:', error);
  }
}

// IPC Handlers cho game management
ipcMain.handle('get-games', async () => {
  try {
    return await gameManager.getGames();
  } catch (error) {
    logger.error('Error getting games:', error);
    throw error;
  }
});

ipcMain.handle('refresh-games', async () => {
  try {
    return await gameManager.refreshGames();
  } catch (error) {
    logger.error('Error refreshing games:', error);
    throw error;
  }
});

ipcMain.handle('launch-game', async (event, gameId) => {
  try {
    return await gameManager.launchGame(gameId);
  } catch (error) {
    logger.error(`Error launching game ${gameId}:`, error);
    throw error;
  }
});

ipcMain.handle('get-game', async (event, gameId) => {
  try {
    return await gameManager.getGame(gameId);
  } catch (error) {
    logger.error(`Error getting game ${gameId}:`, error);
    throw error;
  }
});

// IPC Handlers cho file operations
ipcMain.handle('select-game-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Game Directory'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (error) {
    logger.error('Error selecting directory:', error);
    throw error;
  }
});

ipcMain.handle('join-path', async (event, ...paths) => {
  try {
    return path.join(...paths);
  } catch (error) {
    logger.error('Error joining paths:', error);
    throw error;
  }
});

ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    logger.error('Error checking file existence:', error);
    return false;
  }
});

ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch (error) {
    logger.error('Error opening external URL:', error);
    throw error;
  }
});

ipcMain.handle('launch-game-executable', async (event, executablePath) => {
  try {
    const gameProcess = spawn(executablePath, [], {
      detached: true,
      stdio: 'ignore'
    });
    
    gameProcess.unref();
    return true;
  } catch (error) {
    logger.error('Error launching game executable:', error);
    throw error;
  }
});

ipcMain.handle('open-game-folder', async (event, folderPath) => {
  try {
    await shell.openPath(folderPath);
    return true;
  } catch (error) {
    logger.error('Error opening game folder:', error);
    throw error;
  }
});

// IPC Handlers cho window controls
ipcMain.handle('window-minimize', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    if (focusedWindow.isMaximized()) {
      focusedWindow.unmaximize();
    } else {
      focusedWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.close();
  }
});

// App event handlers
app.whenReady().then(async () => {
  await initializeGameManager();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


// Hàm helper để tính kích thước thư mục
function getDirectorySize(dirPath) {
  return new Promise((resolve, reject) => {
    let totalSize = 0;
    
    function calculateSize(currentPath) {
      try {
        const stats = fs.statSync(currentPath);
        
        if (stats.isFile()) {
          totalSize += stats.size;
        } else if (stats.isDirectory()) {
          const files = fs.readdirSync(currentPath);
          files.forEach(file => {
            calculateSize(path.join(currentPath, file));
          });
        }
      } catch (error) {
        // Bỏ qua lỗi truy cập file/folder
      }
    }
    
    try {
      if (fs.existsSync(dirPath)) {
        calculateSize(dirPath);
      }
      resolve(totalSize);
    } catch (error) {
      reject(error);
    }
  });
}

// Hàm helper để format kích thước
function formatFileSize(bytes) {
  if (bytes === 0) return 'Unknown';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// IPC Handler cho directory size
ipcMain.handle('get-directory-size', async (event, dirPath) => {
  try {
    const sizeInBytes = await getDirectorySize(dirPath);
    return formatFileSize(sizeInBytes);
  } catch (error) {
    logger.error('Error calculating directory size:', error);
    return 'Unknown';
  }
});

// Handle auto startup
ipcMain.handle('set-auto-startup', (event, enable) => {
    app.setLoginItemSettings({
        openAtLogin: enable
    });
});

// Handle minimize to tray
ipcMain.handle('minimize-to-tray', () => {
    mainWindow.hide();
});

// Handle close window
ipcMain.handle('close-window', () => {
  mainWindow.hide();
});


// Tạo system tray icon
function createTray() {
  tray = new Tray(path.join(__dirname, 'resources', 'icons', 'icon.ico'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Lumière de Fantaisie', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Exit', click: () => {
      mainWindow.destroy();
      app.quit();
    }}
  ]);
  tray.setToolTip('Lumière de Fantaisie');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.show());
}