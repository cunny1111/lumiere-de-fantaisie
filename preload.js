const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Game management
  getGames: () => ipcRenderer.invoke('get-games'),
  refreshGames: () => ipcRenderer.invoke('refresh-games'),
  launchGame: (gameId) => ipcRenderer.invoke('launch-game', gameId),
  getGame: (gameId) => ipcRenderer.invoke('get-game', gameId),
  
  // File operations
  openGameFolder: (path) => ipcRenderer.invoke('open-game-folder', path),
  browseForGame: () => ipcRenderer.invoke('browse-for-game'),
  selectGameDirectory: () => ipcRenderer.invoke('select-game-directory'),
  joinPath: (...paths) => ipcRenderer.invoke('join-path', ...paths),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  launchGameExecutable: (executablePath) => ipcRenderer.invoke('launch-game-executable', executablePath),
  getDirectorySize: (dirPath) => ipcRenderer.invoke('get-directory-size', dirPath), // API mới
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  setAutoStartup: (enable) => ipcRenderer.invoke('set-auto-startup', enable),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  closeWindow: () => ipcRenderer.invoke('close-window')
});