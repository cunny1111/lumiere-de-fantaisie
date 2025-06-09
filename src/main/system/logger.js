const log = require('electron-log');
const path = require('path');

// Configure logger
log.transports.file.resolvePathFn = () => path.join(__dirname, '../../../logs/launcher.log');
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

module.exports = log;