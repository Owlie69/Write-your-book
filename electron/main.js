const { app, BrowserWindow, globalShortcut, screen } = require("electron");
const path = require("path");

let mainWindow;
let isLocked = false;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "icon.png"),
    title: "JustWrite",
    // Start normal, go fullscreen when session starts
    fullscreen: false,
    frame: true,
    autoHideMenuBar: true,
  });

  // Load the Next.js app (dev or production)
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    // In production, serve the exported Next.js app
    mainWindow.loadFile(path.join(__dirname, "../out/index.html"));
  }

  // Listen for lock/unlock messages from renderer
  const { ipcMain } = require("electron");

  ipcMain.on("lock-session", (_event, minutes) => {
    isLocked = true;
    lockDown();
    // Auto-unlock after timer
    setTimeout(() => {
      unlock();
    }, minutes * 60 * 1000);
  });

  ipcMain.on("unlock-session", () => {
    unlock();
  });

  mainWindow.on("close", (e) => {
    if (isLocked) {
      e.preventDefault(); // Prevent closing during session
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function lockDown() {
  if (!mainWindow) return;

  // Go fullscreen
  mainWindow.setFullScreen(true);

  // Make it always on top
  mainWindow.setAlwaysOnTop(true, "screen-saver");

  // Prevent minimizing
  mainWindow.setMinimizable(false);

  // Block keyboard shortcuts that could escape
  globalShortcut.register("Alt+Tab", () => {});
  globalShortcut.register("Alt+F4", () => {});
  globalShortcut.register("CommandOrControl+Q", () => {});
  globalShortcut.register("CommandOrControl+W", () => {});
  globalShortcut.register("Super", () => {}); // Windows key
  globalShortcut.register("CommandOrControl+Escape", () => {});
}

function unlock() {
  isLocked = false;

  if (!mainWindow) return;

  mainWindow.setFullScreen(false);
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setMinimizable(true);

  // Unregister all shortcuts
  globalShortcut.unregisterAll();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Clean up on quit
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
