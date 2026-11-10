const { contextBridge, ipcRenderer } = require("electron");

function validKey(key) {
  return typeof key === "string" && [
    "jurnalcuan_v1", "jurnalcuan_set", "jurnalcuan_rate", "jurnalcuan_acc",
    "jurnalcuan_w", "jc_fh", "jc_goapi", "ledgerly_marketstack_key",
    "ledgerly_first_run_done", "ledgerly_pin_hash"
  ].includes(key);
}

const storage = {
  get(key) {
    if (!validKey(key)) throw new TypeError("Storage key tidak valid");
    return ipcRenderer.sendSync("storage:get", key);
  },
  set(key, value) {
    if (!validKey(key) || typeof value !== "string" || value.length > 2 * 1024 * 1024) {
      throw new TypeError("Nilai storage tidak valid");
    }
    ipcRenderer.sendSync("storage:set", key, String(value));
  },
  remove(key) {
    if (!validKey(key)) throw new TypeError("Storage key tidak valid");
    ipcRenderer.sendSync("storage:remove", key);
  }
};

contextBridge.exposeInMainWorld("ledgerlyDesktop", {
  storage,
  apiKeyGet: () => ipcRenderer.sendSync("api-key:get"),
  apiKeySet: (value) => {
    if (typeof value !== "string" || value.length > 256) throw new TypeError("API key tidak valid");
    return ipcRenderer.sendSync("api-key:set", value);
  },
  marketstack: (symbols) => {
    if (!Array.isArray(symbols) || symbols.length === 0 || symbols.length > 50) {
      return Promise.reject(new TypeError("Daftar simbol tidak valid"));
    }
    return ipcRenderer.invoke("network:marketstack", symbols);
  },
  fetchJson: (url, options) => {
    if (typeof url !== "string") return Promise.reject(new TypeError("URL tidak valid"));
    return ipcRenderer.invoke("network:json", url, options || {});
  },
  onMenu: (callback) => {
    if (typeof callback !== "function") throw new TypeError("Callback menu tidak valid");
    ipcRenderer.on("menu:backup", () => callback("backup"));
    ipcRenderer.on("menu:import", () => callback("import"));
  },
  isDesktop: true
});
