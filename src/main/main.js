const { app, BrowserWindow, ipcMain } = require('electron');
const GameManager = require('./game/manager');
const logger = require('./system/logger');

let mainWindow;
let gameManager;

// Khởi tạo Game Manager
async function initializeGameManager() {
  gameManager = new GameManager();
  await gameManager.initialize();
}

// IPC Handlers
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

app.whenReady().then(async () => {
  await initializeGameManager();
  // Create window and other initialization
});