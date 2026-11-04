const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('polygonFiles', {
  importPolygons: () => ipcRenderer.invoke('polygons:import'),
  exportDocument: (document) => ipcRenderer.invoke('polygons:export', document)
})
