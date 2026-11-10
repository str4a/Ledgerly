const { contextBridge, ipcRenderer } = require("electron");

const storage = {
  get(key) {
    return ipcRenderer.sendSync("storage:get", key);
  },
  set(key, value) {
    ipcRenderer.sendSync("storage:set", key, String(value));
  },
  remove(key) {
    ipcRenderer.sendSync("storage:remove", key);
  }
};

contextBridge.exposeInMainWorld("ledgerlyDesktop", {
  storage,
  apiKeyGet: () => ipcRenderer.sendSync("api-key:get"),
  apiKeySet: (value) => ipcRenderer.sendSync("api-key:set", String(value || "")),
  marketstack: (symbols) => ipcRenderer.invoke("network:marketstack", symbols),
  fetchJson: (url, options) => ipcRenderer.invoke("network:json", url, options || {}),
  onMenu: (callback) => {
    ipcRenderer.on("menu:backup", () => callback("backup"));
    ipcRenderer.on("menu:import", () => callback("import"));
  },
  isDesktop: true
});
