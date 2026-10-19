const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('polygonFiles', {
  importPolygons: () => ipcRenderer.invoke('polygons:import'),
  exportPolygons: (polygons) => ipcRenderer.invoke('polygons:export', polygons)
})
