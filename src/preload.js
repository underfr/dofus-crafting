const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  getLanguages:   () => ipcRenderer.invoke('get-languages'),
  loadData:       (lang) => ipcRenderer.invoke('load-data', lang),
getIconPort:    () => ipcRenderer.invoke('get-icon-port'),
  loadQueue:      () => ipcRenderer.invoke('load-queue'),
  saveQueue:      (queue) => ipcRenderer.invoke('save-queue', queue),
  loadPrices:     () => ipcRenderer.invoke('load-prices'),
  savePrices:     (prices) => ipcRenderer.invoke('save-prices', prices),
})
