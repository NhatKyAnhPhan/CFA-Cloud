const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

let backendProcess;
let backendError;
let appUrl;
let mainWindow;

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

async function waitForBackend(port) {
  const url = `http://127.0.0.1:${port}`;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (backendError) throw backendError;
    if (backendProcess.exitCode !== null) {
      throw new Error(`Backend exited with code ${backendProcess.exitCode}`);
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return url;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error('The local app server did not start in time.');
}

async function createWindow() {
  if (!appUrl) {
    const port = await findAvailablePort();
    const appPath = app.getAppPath();
    const serverPath = path.join(appPath, 'dist-electron', 'server.mjs');

    backendProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        HOST: '127.0.0.1',
        NODE_ENV: 'production',
        PORT: String(port),
        WEB_DIST_DIR: path.join(appPath, 'dist'),
      },
      stdio: 'ignore',
    });

    backendProcess.once('error', (error) => {
      backendError = error;
      console.error('Failed to start the local app server:', error);
    });

    appUrl = await waitForBackend(port);
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 640,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(app.getAppPath(), 'electron', 'preload.cjs'),
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== appUrl) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  await mainWindow.loadURL(appUrl);
}

app.whenReady().then(createWindow).catch((error) => {
  console.error('Failed to start OmniConvert:', error);
  dialog.showErrorBox(
    'Không thể khởi động OmniConvert',
    error instanceof Error ? error.message : String(error),
  );
  app.quit();
});

app.on('before-quit', () => {
  if (backendProcess && backendProcess.exitCode === null) {
    backendProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow().catch((error) => {
    console.error('Failed to reopen OmniConvert:', error);
  });
});
