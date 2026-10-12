"use strict";
const preload = require("@electron-toolkit/preload");
const electron = require("electron");
const api = {
  minimize: () => electron.ipcRenderer.send("minimize-window"),
  maximize: () => electron.ipcRenderer.send("maximize-window"),
  close: () => electron.ipcRenderer.send("close-window"),
  quitApp: () => electron.ipcRenderer.send("quit-app"),
  dragStart: (data) => electron.ipcRenderer.send("drag-start", data),
  miniTray: () => electron.ipcRenderer.send("mini-tray"),
  miniWindow: () => electron.ipcRenderer.send("mini-window"),
  restore: () => electron.ipcRenderer.send("restore-window"),
  restart: () => electron.ipcRenderer.send("restart"),
  resizeWindow: (width, height) => electron.ipcRenderer.send("resize-window", width, height),
  resizeMiniWindow: (showPlaylist) => electron.ipcRenderer.send("resize-mini-window", showPlaylist),
  openLyric: () => electron.ipcRenderer.send("open-lyric"),
  sendLyric: (data) => electron.ipcRenderer.send("send-lyric", data),
  sendSong: (data) => electron.ipcRenderer.send("update-current-song", data),
  unblockMusic: (id, data, enabledSources) => electron.ipcRenderer.invoke("unblock-music", id, data, enabledSources),
  importCustomApiPlugin: () => electron.ipcRenderer.invoke("import-custom-api-plugin"),
  importLxMusicScript: () => electron.ipcRenderer.invoke("import-lx-music-script"),
  onLyricWindowClosed: (callback) => {
    electron.ipcRenderer.on("lyric-window-closed", () => callback());
  },
  onLyricWindowReady: (callback) => {
    electron.ipcRenderer.on("lyric-window-ready", () => callback());
  },
  getAppUpdateState: () => electron.ipcRenderer.invoke("app-update:get-state"),
  checkAppUpdate: (manual = false) => electron.ipcRenderer.invoke("app-update:check", { manual }),
  downloadAppUpdate: () => electron.ipcRenderer.invoke("app-update:download"),
  installAppUpdate: () => electron.ipcRenderer.invoke("app-update:quit-and-install"),
  openAppUpdatePage: () => electron.ipcRenderer.invoke("app-update:open-release-page"),
  onAppUpdateState: (callback) => {
    electron.ipcRenderer.on("app-update:state", (_event, state) => callback(state));
  },
  removeAppUpdateListeners: () => {
    electron.ipcRenderer.removeAllListeners("app-update:state");
  },
  onLanguageChanged: (callback) => {
    electron.ipcRenderer.on("language-changed", (_event, locale) => {
      callback(locale);
    });
  },
  invoke: (channel, ...args) => {
    const validChannels = [
      "get-lyrics",
      "clear-lyrics-cache",
      "get-system-fonts",
      "get-cached-lyric",
      "cache-lyric",
      "clear-lyric-cache",
      "scan-local-music",
      "scan-local-music-with-stats",
      "parse-local-music-metadata",
      "get-system-accent-color"
    ];
    if (validChannels.includes(channel)) {
      return electron.ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Unauthorized IPC aisle: ${channel}`));
  },
  getSearchSuggestions: (keyword) => electron.ipcRenderer.invoke("get-search-suggestions", keyword),
  getSystemAccentColor: () => electron.ipcRenderer.invoke("get-system-accent-color"),
  lxMusicHttpRequest: (request) => electron.ipcRenderer.invoke("lx-music-http-request", request),
  lxMusicHttpCancel: (requestId) => electron.ipcRenderer.invoke("lx-music-http-cancel", requestId),
  scanLocalMusic: (folderPath) => electron.ipcRenderer.invoke("scan-local-music", folderPath),
  scanLocalMusicWithStats: (folderPath) => electron.ipcRenderer.invoke("scan-local-music-with-stats", folderPath),
  parseLocalMusicMetadata: (filePaths) => electron.ipcRenderer.invoke("parse-local-music-metadata", filePaths),
  downloadAdd: (task) => electron.ipcRenderer.invoke("download:add", task),
  downloadAddBatch: (tasks) => electron.ipcRenderer.invoke("download:add-batch", tasks),
  downloadPause: (taskId) => electron.ipcRenderer.invoke("download:pause", taskId),
  downloadResume: (taskId) => electron.ipcRenderer.invoke("download:resume", taskId),
  downloadCancel: (taskId) => electron.ipcRenderer.invoke("download:cancel", taskId),
  downloadCancelAll: () => electron.ipcRenderer.invoke("download:cancel-all"),
  downloadGetQueue: () => electron.ipcRenderer.invoke("download:get-queue"),
  downloadSetConcurrency: (n) => electron.ipcRenderer.send("download:set-concurrency", n),
  downloadGetCompleted: () => electron.ipcRenderer.invoke("download:get-completed"),
  downloadDeleteCompleted: (filePath) => electron.ipcRenderer.invoke("download:delete-completed", filePath),
  downloadClearCompleted: () => electron.ipcRenderer.invoke("download:clear-completed"),
  getEmbeddedLyrics: (filePath) => electron.ipcRenderer.invoke("download:get-embedded-lyrics", filePath),
  downloadProvideUrl: (taskId, url) => electron.ipcRenderer.invoke("download:provide-url", { taskId, url }),
  onDownloadProgress: (cb) => {
    electron.ipcRenderer.on("download:progress", (_event, data) => cb(data));
  },
  onDownloadStateChange: (cb) => {
    electron.ipcRenderer.on("download:state-change", (_event, data) => cb(data));
  },
  onDownloadBatchComplete: (cb) => {
    electron.ipcRenderer.on("download:batch-complete", (_event, data) => cb(data));
  },
  onDownloadRequestUrl: (cb) => {
    electron.ipcRenderer.on("download:request-url", (_event, data) => cb(data));
  },
  removeDownloadListeners: () => {
    electron.ipcRenderer.removeAllListeners("download:progress");
    electron.ipcRenderer.removeAllListeners("download:state-change");
    electron.ipcRenderer.removeAllListeners("download:batch-complete");
    electron.ipcRenderer.removeAllListeners("download:request-url");
  }
};
const ipc = {
  send: (channel, ...args) => {
    electron.ipcRenderer.send(channel, ...args);
  },
  invoke: (channel, ...args) => {
    return electron.ipcRenderer.invoke(channel, ...args);
  },
  on: (channel, listener) => {
    const wrappedListener = (_event, ...args) => listener(...args);
    electron.ipcRenderer.on(channel, wrappedListener);
    return () => {
      electron.ipcRenderer.removeListener(channel, wrappedListener);
    };
  },
  removeAllListeners: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  }
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
    electron.contextBridge.exposeInMainWorld("ipcRenderer", ipc);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
  window.ipcRenderer = ipc;
}
