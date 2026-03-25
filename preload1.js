const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('customAPI', {
    triggerSync: () => ipcRenderer.send('trigger-sync')
});