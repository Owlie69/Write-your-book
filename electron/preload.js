const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("justwrite", {
  lockSession: (minutes) => ipcRenderer.send("lock-session", minutes),
  unlockSession: () => ipcRenderer.send("unlock-session"),
  isElectron: true,
});
