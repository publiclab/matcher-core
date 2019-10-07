const server = require('./src/main/server');
const setupCRI = require('./src/main/debugging-interface.js');
const setupChromeLauncher = require('./src/main/chrome-launcher.js');
const setupTemplateRenderer = require('./src/main/template-renderer.js');

setupChromeLauncher();
server.startServer();
setupTemplateRenderer();
setupCRI(server);
