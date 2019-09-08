const liveServer = require("live-server");

const server = {};

server.currentServer = null;

server.startServer = function() {
  this.currentServer = liveServer.start({
    open: false,
    port: 9097
  });
};

server.shutdownServer = function() {
  if (!server) {
    console.error("Server is not currently running");
    return;
  }
  server.shutdown();
};

module.exports = server;
