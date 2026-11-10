const { app, BrowserWindow, Menu, dialog, ipcMain, safeStorage, session } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { createStorage } = require("./storage");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  let mainWindow;
  let storage;
  let userData;
  const defaultBounds = { width: 1280, height: 820 };

  function readWindowState() {
    try {
      const state = JSON.parse(fs.readFileSync(path.join(userData, "window-state.json"), "utf8"));
      if (state && Number.isInteger(state.width) && Number.isInteger(state.height)) return state;
    } catch {}
    return defaultBounds;
  }

  function saveWindowState() {
    if (!mainWindow || mainWindow.isMaximized()) return;
    atomicWrite(path.join(userData, "window-state.json"), JSON.stringify(mainWindow.getBounds(), null, 2));
  }

  function atomicWrite(filePath, content) {
    const temporary = `${filePath}.tmp`;
    fs.writeFileSync(temporary, content, "utf8");
    fs.renameSync(temporary, filePath);
  }

  function createBackup() {
    if (!storage) return;
    const backupDir = path.join(userData, "backups");
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    atomicWrite(path.join(backupDir, `ledgerly-${stamp}.json`), JSON.stringify(storage.snapshot(), null, 2));
    const day = new Date().toISOString().slice(0, 10);
    atomicWrite(path.join(backupDir, `ledgerly-daily-${day}.json`), JSON.stringify(storage.snapshot(), null, 2));
    const files = fs.readdirSync(backupDir).filter((file) => file.endsWith(".json"))
      .sort((a, b) => fs.statSync(path.join(backupDir, b)).mtimeMs - fs.statSync(path.join(backupDir, a)).mtimeMs);
    files.slice(7).forEach((file) => fs.rmSync(path.join(backupDir, file), { force: true }));
  }

  function createMenu() {
    const template = [
      {
        label: "File",
        submenu: [
          { label: "Backup", click: () => mainWindow?.webContents.send("menu:backup") },
          { label: "Import", click: () => mainWindow?.webContents.send("menu:import") },
          { type: "separator" },
          { role: "quit" }
        ]
      },
      {
        label: "Tampilan",
        submenu: [
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { role: "togglefullscreen" }
        ]
      }
    ];
    if (!app.isPackaged) template[1].submenu.push({ type: "separator" }, { role: "toggleDevTools" });
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  function createWindow() {
    const bounds = readWindowState();
    mainWindow = new BrowserWindow({
      ...bounds,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true
      }
    });
    mainWindow.once("ready-to-show", () => mainWindow.show());
    mainWindow.webContents.once("did-finish-load", async () => {
      if (!storage.get("ledgerly_first_run_done")) {
        const result = await dialog.showMessageBox(mainWindow, {
          type: "question",
          buttons: ["Impor backup JSON", "Mulai tanpa impor"],
          defaultId: 0,
          cancelId: 1,
          title: "Ledgerly",
          message: "Impor backup dari versi web sekarang?"
        });
        storage.set("ledgerly_first_run_done", "true");
        if (result.response === 0) mainWindow.webContents.send("menu:import");
      }
    });
    mainWindow.loadFile(path.join(__dirname, "..", "Ledgerly-live.html"));
    mainWindow.on("close", saveWindowState);
    mainWindow.on("closed", () => { mainWindow = null; });
  }

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    userData = app.getPath("userData");
    fs.mkdirSync(userData, { recursive: true });
    storage = createStorage(path.join(userData, "ledgerly-storage.json"));
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({ responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.coingecko.com https://api.marketstack.com https://open.er-api.com https://api.frankfurter.dev"]
      }});
    });
    ipcMain.on("storage:get", (event, key) => { event.returnValue = storage.get(key); });
    ipcMain.on("storage:set", (event, key, value) => { storage.set(key, value); event.returnValue = true; });
    ipcMain.on("storage:remove", (event, key) => { storage.remove(key); event.returnValue = true; });
    ipcMain.on("api-key:get", (event) => {
      event.returnValue = safeStorage.isEncryptionAvailable() && Boolean(storage.get("ledgerly_marketstack_key"))
        ? "Tersimpan aman"
        : "";
    });
    ipcMain.on("api-key:set", (event, value) => {
      if (!value) storage.remove("ledgerly_marketstack_key");
      else if (safeStorage.isEncryptionAvailable()) storage.set("ledgerly_marketstack_key", safeStorage.encryptString(value).toString("base64"));
      event.returnValue = true;
    });
    ipcMain.handle("network:json", async (_event, url, options) => {
      const response = await fetch(url, { method: options.method || "GET", headers: options.headers || {} });
      const body = await response.json();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return body;
    });
    ipcMain.handle("network:marketstack", async (_event, symbols) => {
      let key = "";
      const encrypted = storage.get("ledgerly_marketstack_key");
      if (encrypted && safeStorage.isEncryptionAvailable()) key = safeStorage.decryptString(Buffer.from(encrypted, "base64"));
      if (!key) throw new Error("API key Marketstack belum diisi");
      const url = `https://api.marketstack.com/v2/eod?access_key=${encodeURIComponent(key)}&symbols=${encodeURIComponent(symbols.join(","))}&limit=${symbols.length}`;
      const response = await fetch(url);
      const body = await response.json();
      if (!response.ok || body.error) throw new Error(body.error?.message || `Marketstack HTTP ${response.status}`);
      const latest = {};
      (Array.isArray(body.data) ? body.data : []).forEach((row) => {
        const symbol = String(row.symbol || "").toUpperCase();
        const open = Number(row.open);
        const close = Number(row.close);
        if (symbol && Number.isFinite(open) && open !== 0 && Number.isFinite(close) && !latest[symbol]) {
          latest[symbol] = { symbol, changePct: (close - open) / open * 100 };
        }
      });
      return latest;
    });
    createMenu();
    createWindow();
  });

  app.on("before-quit", () => createBackup());
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
