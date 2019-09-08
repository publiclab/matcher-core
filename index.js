const server = require("./server.js");
const setupCRI = require("./debugging-interface.js");
const setupChromeLauncher = require("./chrome-launcher.js");
const setupTemplateRenderer = require("./template-renderer.js");

setupChromeLauncher();
server.startServer();
setupTemplateRenderer();
setupCRI(server);
