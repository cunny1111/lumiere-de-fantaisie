const Registry = require('registry-js');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../system/logger');

class GameDiscovery {
    constructor() {
        this.SUPPORTED_GAMES = {
            'genshin': {
                name: 'Genshin Impact',
                executable: 'GenshinImpact.exe',
                registryKeys: [
                    'HKEY_LOCAL_MACHINE\\SOFTWARE\\miHoYo\\Genshin Impact',
                    'HKEY_CURRENT_USER\\SOFTWARE\\miHoYo\\Genshin Impact'
                ],
                commonPaths: [
                    'C:\\Program Files\\Genshin Impact',
                    'D:\\Program Files\\Genshin Impact',
                    'C:\\Games\\Genshin Impact'
                ],
                icon: 'genshin.png'
            },
            'honkai_starrail': {
                name: 'Honkai: Star Rail',
                executable: 'StarRail.exe',
                registryKeys: [
                    'HKEY_LOCAL_MACHINE\\SOFTWARE\\miHoYo\\Star Rail',
                    'HKEY_CURRENT_USER\\SOFTWARE\\miHoYo\\Star Rail'
                ],
                commonPaths: [
                    'C:\\Program Files\\Star Rail',
                    'D:\\Program Files\\Star Rail',
                    'C:\\Games\\Star Rail'
                ],
                icon: 'starrail.png'
            },
            'zenless_zone_zero': {
                name: 'Zenless Zone Zero',
                executable: 'ZenlessZoneZero.exe',
                registryKeys: [
                    'HKEY_LOCAL_MACHINE\\SOFTWARE\\miHoYo\\ZenlessZoneZero',
                    'HKEY_CURRENT_USER\\SOFTWARE\\miHoYo\\ZenlessZoneZero'
                ],
                commonPaths: [
                    'C:\\Program Files\\Zenless Zone Zero',
                    'D:\\Program Files\\Zenless Zone Zero',
                    'C:\\Games\\Zenless Zone Zero'
                ],
                icon: 'zzz.png'
            },
            'wuthering_waves': {
                name: 'Wuthering Waves',
                executable: 'Wuthering Waves Game/Client/Binaries/Win64/Client-Win64-Shipping.exe',
                registryKeys: [
                    'HKEY_LOCAL_MACHINE\SOFTWARE\Kuro Games\Wuthering Waves',
                    'HKEY_CURRENT_USER\SOFTWARE\Kuro Games\Wuthering Waves'
                ],
                commonPaths: [
                    'D:\Kuro Games\Wuthering Waves',
                    'C:\Program Files\Kuro Games\Wuthering Waves',
                    'C:\Kuro Games\Wuthering Waves',
                    'D:\Program Files\Kuro Games\Wuthering Waves'
                ],
                icon: 'wuthering.png'
            }
        };
    }

    async discoverAllGames() {
        logger.info('Starting game discovery...');
        const games = {};

        for (const [gameId, gameInfo] of Object.entries(this.SUPPORTED_GAMES)) {
            try {
                const gameData = await this.discoverGame(gameId, gameInfo);
                games[gameId] = gameData;
            } catch (error) {
                logger.error(`Error discovering ${gameInfo.name}:`, error);
                games[gameId] = {
                    id: gameId,
                    name: gameInfo.name,
                    status: 'not_installed',
                    path: null,
                    icon: gameInfo.icon
                };
            }
        }

        return games;
    }

    async discoverGame(gameId, gameInfo) {
        logger.info(`Discovering ${gameInfo.name}...`);
        
        // Try registry first
        let gamePath = await this.findGameInRegistry(gameInfo.registryKeys);
        
        // If not found in registry, try common paths
        if (!gamePath) {
            gamePath = await this.findGameInCommonPaths(gameInfo.commonPaths, gameInfo.executable);
        }

        const gameData = {
            id: gameId,
            name: gameInfo.name,
            path: gamePath,
            icon: gameInfo.icon,
            status: gamePath ? 'installed' : 'not_installed'
        };

        if (gamePath) {
            // Get additional info
            gameData.version = await this.getGameVersion(gamePath);
            gameData.size = await this.getGameSize(gamePath);
            gameData.lastPlayed = await this.getLastPlayed(gamePath);
        }

        return gameData;
    }

    async findGameInRegistry(registryKeys) {
        for (const key of registryKeys) {
            try {
                const value = Registry.get(key, 'InstallPath');
                if (value && await fs.pathExists(value)) {
                    return value;
                }
            } catch (error) {
                // Registry key not found, continue
            }
        }
        return null;
    }

    async findGameInCommonPaths(paths, executable) {
        for (const gamePath of paths) {
            try {
                const executablePath = path.join(gamePath, executable);
                if (await fs.pathExists(executablePath)) {
                    return gamePath;
                }
            } catch (error) {
                // Path not found, continue
            }
        }
        return null;
    }

    async getGameVersion(gamePath) {
        // Placeholder - implement version detection
        return 'Unknown';
    }

    async getGameSize(gamePath) {
        try {
            const stats = await fs.stat(gamePath);
            return this.formatBytes(stats.size);
        } catch (error) {
            return 'Unknown';
        }
    }

    async getLastPlayed(gamePath) {
        try {
            const stats = await fs.stat(gamePath);
            return stats.atime;
        } catch (error) {
            return null;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

module.exports = GameDiscovery;