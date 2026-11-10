const { app, BrowserWindow, Menu, dialog, ipcMain, safeStorage, session } = require("electron");
const { autoUpdater } = require("electron-updater");
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
  const allowedStorageKeys = new Set([
    "jurnalcuan_v1", "jurnalcuan_set", "jurnalcuan_rate", "jurnalcuan_acc",
    "jurnalcuan_w", "jc_fh", "jc_goapi", "ledgerly_marketstack_key",
    "ledgerly_first_run_done", "ledgerly_pin_hash"
  ]);
  const allowedNetworkOrigins = new Set([
    "https://api.coingecko.com",
    "https://api.marketstack.com",
    "https://open.er-api.com",
    "https://api.frankfurter.dev"
  ]);
  const maxNetworkResponseBytes = 2 * 1024 * 1024;

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

  function assertStorageKey(key) {
    if (typeof key !== "string" || !allowedStorageKeys.has(key)) {
      throw new Error("Storage key tidak diizinkan");
    }
  }

  function assertTrustedSender(event) {
    if (!mainWindow || event.sender !== mainWindow.webContents) {
      throw new Error("IPC sender tidak tepercaya");
    }
  }

  function validateNetworkUrl(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("URL jaringan tidak valid");
    }
    if (parsed.protocol !== "https:" || !allowedNetworkOrigins.has(parsed.origin)) {
      throw new Error("Origin jaringan tidak diizinkan");
    }
    return parsed;
  }

  async function fetchJson(url) {
    const parsed = validateNetworkUrl(url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(parsed, { method: "GET", signal: controller.signal });
      const length = Number(response.headers.get("content-length") || 0);
      if (length > maxNetworkResponseBytes) throw new Error("Respons jaringan terlalu besar");
      const text = await response.text();
      if (Buffer.byteLength(text, "utf8") > maxNetworkResponseBytes) {
        throw new Error("Respons jaringan terlalu besar");
      }
      const body = JSON.parse(text);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return body;
    } finally {
      clearTimeout(timeout);
    }
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
          { label: "Periksa pembaruan", click: checkForUpdates },
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

  async function checkForUpdates() {
    if (!app.isPackaged) {
      await dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Pembaruan Ledgerly",
        message: "Pembaruan otomatis hanya tersedia pada aplikasi terpasang."
      });
      return;
    }
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      await dialog.showMessageBox(mainWindow, {
        type: "error",
        title: "Pembaruan gagal",
        message: `Tidak dapat memeriksa pembaruan: ${error.message}`
      });
    }
  }

  function configureUpdater() {
    if (!app.isPackaged) return;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on("update-available", async (info) => {
      const result = await dialog.showMessageBox(mainWindow, {
        type: "info",
        buttons: ["Unduh sekarang", "Nanti"],
        defaultId: 0,
        cancelId: 1,
        title: "Pembaruan Ledgerly tersedia",
        message: `Versi ${info.version} tersedia. Unduh sekarang?`
      });
      if (result.response === 0) {
        try {
          await autoUpdater.downloadUpdate();
        } catch (error) {
          await dialog.showMessageBox(mainWindow, {
            type: "error",
            title: "Unduhan gagal",
            message: `Pembaruan gagal diunduh: ${error.message}`
          });
        }
      }
    });
    autoUpdater.on("update-not-available", () => {
      dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Pembaruan Ledgerly",
        message: "Ledgerly sudah menggunakan versi terbaru."
      });
    });
    autoUpdater.on("update-downloaded", async () => {
      const result = await dialog.showMessageBox(mainWindow, {
        type: "info",
        buttons: ["Mulai ulang sekarang", "Nanti"],
        defaultId: 0,
        cancelId: 1,
        title: "Pembaruan siap dipasang",
        message: "Pembaruan sudah diunduh dan siap dipasang."
      });
      if (result.response === 0) autoUpdater.quitAndInstall();
    });
    autoUpdater.on("error", (error) => {
      console.error("Ledgerly update failed:", error);
    });
    setTimeout(checkForUpdates, 3000);
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
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    mainWindow.webContents.on("will-navigate", (event, url) => {
      let pathname = "";
      try { pathname = decodeURIComponent(new URL(url).pathname); } catch {}
      if (!url.startsWith("file://") || !pathname.endsWith("/Ledgerly-live.html")) {
        event.preventDefault();
      }
    });
    mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());
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
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    ipcMain.on("storage:get", (event, key) => {
      assertTrustedSender(event); assertStorageKey(key); event.returnValue = storage.get(key);
    });
    ipcMain.on("storage:set", (event, key, value) => {
      assertTrustedSender(event); assertStorageKey(key);
      if (typeof value !== "string" || value.length > 2 * 1024 * 1024) throw new Error("Nilai storage tidak valid");
      storage.set(key, value); event.returnValue = true;
    });
    ipcMain.on("storage:remove", (event, key) => {
      assertTrustedSender(event); assertStorageKey(key); storage.remove(key); event.returnValue = true;
    });
    ipcMain.on("api-key:get", (event) => {
      assertTrustedSender(event);
      event.returnValue = safeStorage.isEncryptionAvailable() && Boolean(storage.get("ledgerly_marketstack_key"))
        ? "Tersimpan aman"
        : "";
    });
    ipcMain.on("api-key:set", (event, value) => {
      assertTrustedSender(event);
      if (typeof value !== "string" || value.length > 256) throw new Error("API key tidak valid");
      if (!value) storage.remove("ledgerly_marketstack_key");
      else if (safeStorage.isEncryptionAvailable()) storage.set("ledgerly_marketstack_key", safeStorage.encryptString(value).toString("base64"));
      event.returnValue = true;
    });
    ipcMain.handle("network:json", async (_event, url, options) => {
      assertTrustedSender(_event);
      if (options && Object.keys(options).length) throw new Error("Opsi jaringan tidak diizinkan");
      return fetchJson(url);
    });
    ipcMain.handle("network:marketstack", async (_event, symbols) => {
      assertTrustedSender(_event);
      if (!Array.isArray(symbols) || symbols.length === 0 || symbols.length > 50 ||
          symbols.some((symbol) => typeof symbol !== "string" || !/^[A-Za-z0-9._/-]{1,20}$/.test(symbol))) {
        throw new Error("Daftar simbol tidak valid");
      }
      let key = "";
      const encrypted = storage.get("ledgerly_marketstack_key");
      if (encrypted && safeStorage.isEncryptionAvailable()) key = safeStorage.decryptString(Buffer.from(encrypted, "base64"));
      if (!key) throw new Error("API key Marketstack belum diisi");
      const url = `https://api.marketstack.com/v2/eod?access_key=${encodeURIComponent(key)}&symbols=${encodeURIComponent(symbols.join(","))}&limit=${symbols.length}`;
      const body = await fetchJson(url);
      if (body.error) throw new Error(body.error?.message || "Marketstack gagal");
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
    configureUpdater();
  });

  app.on("before-quit", () => createBackup());
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
