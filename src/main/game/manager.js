const GameDiscovery = require('./discovery');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

class GameManager {
  constructor() {
    this.discovery = new GameDiscovery();
    this.logger = require('../system/logger');
    this.store = require('../data/store');
  }

  // Khởi tạo và phát hiện game
  async initialize() {
    this.logger.info('Initializing Game Manager...');
    const games = await this.discovery.discoverAllGames();
    
    // Lưu vào store
    this.store.set('detectedGames', games);
    
    return games;
  }

  // Lấy danh sách game
  async getGames() {
    let games = this.store.get('detectedGames', {});
    
    // Nếu chưa có data, thực hiện discovery
    if (Object.keys(games).length === 0) {
      games = await this.initialize();
    }
    
    return games;
  }

  // Refresh game list
  async refreshGames() {
    this.logger.info('Refreshing game list...');
    return await this.initialize();
  }

  // Launch game
  async launchGame(gameId) {
    const games = await this.getGames();
    const game = games[gameId];
    
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    if (game.status !== 'installed') {
      throw new Error(`Game ${gameId} is not installed`);
    }

    // Kiểm tra đường dẫn game
    if (!game.path) {
      throw new Error(`Game path not set for ${game.name}`);
    }

    const executablePath = path.join(game.path, this.discovery.SUPPORTED_GAMES[gameId].executable);
    
    // Kiểm tra file thực thi tồn tại
    try {
      const exists = await fs.pathExists(executablePath);
      if (!exists) {
        throw new Error(`Game executable not found: ${executablePath}`);
      }
    } catch (error) {
      throw new Error(`Error checking game executable: ${error.message}`);
    }

    this.logger.info(`Launching ${game.name} from: ${executablePath}`);
    
    try {
      const gameProcess = spawn(executablePath, [], {
        cwd: path.dirname(executablePath),
        detached: true,
        stdio: 'ignore'
      });

      // Kiểm tra process có được tạo thành công
      if (!gameProcess || !gameProcess.pid) {
        throw new Error('Failed to create game process');
      }

      gameProcess.unref();
      
      // Update last played time
      game.lastPlayed = new Date();
      await this.store.set('detectedGames', games);
      
      this.logger.info(`Game launched successfully with PID: ${gameProcess.pid}`);
      return gameProcess.pid;
    } catch (error) {
      this.logger.error(`Failed to launch game: ${error.message}`);
      throw new Error(`Failed to launch ${game.name}: ${error.message}`);
    }
  }

  // Get game by ID
  async getGame(gameId) {
    const games = await this.getGames();
    return games[gameId] || null;
  }
}

module.exports = GameManager;