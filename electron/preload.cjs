const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Expose any needed APIs here
  getPlatform: () => process.platform,
});
