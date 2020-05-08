const chromeLauncher = require('chrome-launcher');

module.exports = async function () {
  await chromeLauncher.launch({
    port: 9222,
    chromeFlags: ['--remote-debugging-port=9222', '--headless']
  });
};
