const Store = require('electron-store');

const store = new Store({
  name: 'lumiere-de-fantaisie',
  defaults: {
    detectedGames: {},
    settings: {
      theme: 'dark',
      autoLaunch: false,
      checkUpdatesOnStart: true
    }
  }
});

module.exports = store;