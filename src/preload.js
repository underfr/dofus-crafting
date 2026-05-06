const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  loadData:       () => ipcRenderer.invoke('load-data'),
getIconPort:    () => ipcRenderer.invoke('get-icon-port'),
  loadQueue:      () => ipcRenderer.invoke('load-queue'),
  saveQueue:      (queue) => ipcRenderer.invoke('save-queue', queue),
})
