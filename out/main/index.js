"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const utils$2 = require("@electron-toolkit/utils");
const electron = require("electron");
const path = require("path");
const Store = require("electron-store");
const node_crypto = require("node:crypto");
const FormData$1 = require("form-data");
const crypto = require("crypto");
const url = require("url");
const require$$0$1 = require("net");
const require$$1$1 = require("tls");
const require$$3 = require("assert");
const require$$1 = require("tty");
const util = require("util");
const os = require("os");
const require$$0 = require("events");
const http = require("http");
const https = require("https");
const http2 = require("http2");
const stream = require("stream");
const zlib = require("zlib");
const fs = require("fs");
const fileType = require("file-type");
const flacTagger = require("flac-tagger");
const mm = require("music-metadata");
const NodeID3 = require("node-id3");
const fontList = require("font-list");
const fetch$1 = require("node-fetch");
const Player = require("mpris-service");
const cors = require("cors");
const express = require("express");
const electronUpdater = require("electron-updater");
const WebSocket = require("ws");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const crypto__namespace = /* @__PURE__ */ _interopNamespaceDefault(crypto);
const os__namespace = /* @__PURE__ */ _interopNamespaceDefault(os);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const mm__namespace = /* @__PURE__ */ _interopNamespaceDefault(mm);
const NodeID3__namespace = /* @__PURE__ */ _interopNamespaceDefault(NodeID3);
const shortcutActionOrder = [
  "togglePlay",
  "prevPlay",
  "nextPlay",
  "volumeUp",
  "volumeDown",
  "toggleFavorite",
  "toggleWindow"
];
const shortcutModifierOrder = ["CommandOrControl", "Alt", "Shift"];
const shortcutScopeDefaults = {
  togglePlay: "global",
  prevPlay: "global",
  nextPlay: "global",
  volumeUp: "app",
  volumeDown: "app",
  toggleFavorite: "app",
  toggleWindow: "global"
};
const shortcutKeyDefaults = {
  togglePlay: "CommandOrControl+Alt+P",
  prevPlay: "CommandOrControl+Alt+Left",
  nextPlay: "CommandOrControl+Alt+Right",
  volumeUp: "CommandOrControl+Alt+Up",
  volumeDown: "CommandOrControl+Alt+Down",
  toggleFavorite: "CommandOrControl+Alt+L",
  toggleWindow: "CommandOrControl+Alt+Shift+M"
};
const modifierAliases = {
  commandorcontrol: "CommandOrControl",
  cmdorctrl: "CommandOrControl",
  cmd: "CommandOrControl",
  command: "CommandOrControl",
  control: "CommandOrControl",
  ctrl: "CommandOrControl",
  meta: "CommandOrControl",
  super: "CommandOrControl",
  win: "CommandOrControl",
  windows: "CommandOrControl",
  alt: "Alt",
  option: "Alt",
  shift: "Shift"
};
const namedKeyAliases = {
  left: "Left",
  arrowleft: "Left",
  right: "Right",
  arrowright: "Right",
  up: "Up",
  arrowup: "Up",
  down: "Down",
  arrowdown: "Down",
  esc: "Escape",
  escape: "Escape",
  enter: "Enter",
  return: "Enter",
  tab: "Tab",
  space: "Space",
  spacebar: "Space",
  " ": "Space",
  backspace: "Backspace",
  delete: "Delete",
  del: "Delete",
  insert: "Insert",
  ins: "Insert",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
  plus: "Plus",
  "+": "Plus",
  equal: "Plus",
  "=": "Plus",
  minus: "Minus",
  "-": "Minus",
  mediaplaypause: "MediaPlayPause",
  mediaplay: "MediaPlayPause",
  medianexttrack: "MediaNextTrack",
  mediaprevioustrack: "MediaPreviousTrack",
  mediastop: "MediaStop"
};
const allowedNamedKeys = /* @__PURE__ */ new Set([
  "Left",
  "Right",
  "Up",
  "Down",
  "Escape",
  "Enter",
  "Tab",
  "Space",
  "Backspace",
  "Delete",
  "Insert",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Plus",
  "Minus",
  "MediaPlayPause",
  "MediaNextTrack",
  "MediaPreviousTrack",
  "MediaStop"
]);
const functionKeyRegExp = /^F([1-9]|1\d|2[0-4])$/i;
const sharedReservedAccelerators = ["CommandOrControl+Shift+I", "F5"];
const platformReservedAccelerators = {
  darwin: ["CommandOrControl+Q", "CommandOrControl+W", "CommandOrControl+H"],
  win32: ["Alt+F4"],
  linux: ["Alt+F4"]
};
function normalizeModifierToken(token) {
  return modifierAliases[token.trim().toLowerCase()] ?? null;
}
function normalizeKeyToken(token) {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    return null;
  }
  if (normalizedToken.length === 1 && /[A-Za-z0-9]/.test(normalizedToken)) {
    return normalizedToken.toUpperCase();
  }
  const functionKeyMatch = normalizedToken.match(functionKeyRegExp);
  if (functionKeyMatch) {
    return `F${functionKeyMatch[1]}`;
  }
  const aliasKey = namedKeyAliases[normalizedToken.toLowerCase()];
  if (aliasKey) {
    return aliasKey;
  }
  if (allowedNamedKeys.has(normalizedToken)) {
    return normalizedToken;
  }
  return null;
}
function createDefaultShortcutConfig(action) {
  return {
    key: shortcutKeyDefaults[action],
    enabled: true,
    scope: shortcutScopeDefaults[action]
  };
}
function createDefaultShortcuts() {
  return shortcutActionOrder.reduce((result, action) => {
    result[action] = createDefaultShortcutConfig(action);
    return result;
  }, {});
}
createDefaultShortcuts();
function normalizeShortcutAccelerator(raw) {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  const segments = raw.split("+").map((item) => item.trim()).filter(Boolean);
  if (segments.length === 0) {
    return null;
  }
  const modifiers = /* @__PURE__ */ new Set();
  let mainKey = null;
  for (const segment of segments) {
    const modifier = normalizeModifierToken(segment);
    if (modifier) {
      modifiers.add(modifier);
      continue;
    }
    const normalizedKey = normalizeKeyToken(segment);
    if (!normalizedKey || mainKey) {
      return null;
    }
    mainKey = normalizedKey;
  }
  if (!mainKey) {
    return null;
  }
  const orderedModifiers = shortcutModifierOrder.filter((modifier) => modifiers.has(modifier));
  return [...orderedModifiers, mainKey].join("+");
}
function normalizeShortcutScope(scope, action) {
  return scope === "global" || scope === "app" ? scope : shortcutScopeDefaults[action];
}
function normalizeShortcutConfig(action, value) {
  if (typeof value === "string") {
    const normalizedKey2 = normalizeShortcutAccelerator(value);
    return {
      key: normalizedKey2 ?? shortcutKeyDefaults[action],
      enabled: true,
      scope: shortcutScopeDefaults[action]
    };
  }
  if (!value || typeof value !== "object") {
    return createDefaultShortcutConfig(action);
  }
  const config = value;
  const normalizedKey = normalizeShortcutAccelerator(config.key ?? "");
  return {
    key: normalizedKey ?? shortcutKeyDefaults[action],
    enabled: config.enabled !== false,
    scope: normalizeShortcutScope(config.scope, action)
  };
}
function normalizeShortcutsConfig(input) {
  const result = createDefaultShortcuts();
  if (!input || typeof input !== "object") {
    return result;
  }
  const rawConfig = input;
  shortcutActionOrder.forEach((action) => {
    result[action] = normalizeShortcutConfig(action, rawConfig[action]);
  });
  return result;
}
function getShortcutConflicts(shortcuts) {
  const shortcutBuckets = /* @__PURE__ */ new Map();
  shortcutActionOrder.forEach((action) => {
    const config = shortcuts[action];
    if (!config.enabled) {
      return;
    }
    const normalizedKey = normalizeShortcutAccelerator(config.key);
    if (!normalizedKey) {
      return;
    }
    const bucketKey = `${config.scope}::${normalizedKey}`;
    const actions = shortcutBuckets.get(bucketKey) ?? [];
    actions.push(action);
    shortcutBuckets.set(bucketKey, actions);
  });
  const conflicts = [];
  shortcutBuckets.forEach((actions, key) => {
    if (actions.length < 2) {
      return;
    }
    const [scope, accelerator] = key.split("::");
    conflicts.push({
      key: accelerator,
      scope,
      actions
    });
  });
  return conflicts;
}
function getReservedAccelerators(platform2) {
  if (platform2 === "web") {
    return [...sharedReservedAccelerators];
  }
  return [...sharedReservedAccelerators, ...platformReservedAccelerators[platform2]];
}
function isModifierOnlyShortcut(shortcut) {
  const normalized = normalizeShortcutAccelerator(shortcut);
  if (!normalized) {
    return true;
  }
  const segments = normalized.split("+");
  const mainKey = segments[segments.length - 1];
  return shortcutModifierOrder.includes(mainKey);
}
const isProxy = false;
const proxyConfig = { "enable": false, "protocol": "http", "host": "127.0.0.1", "port": 7890 };
const enableRealIP = false;
const realIP = "";
const noAnimate = false;
const animationSpeed = 1;
const author = "pushkarverse";
const authorUrl = "https://github.com/slice-of-fun";
const musicApiPort = 30488;
const closeAction = "ask";
const musicQuality = "higher";
const lyricTranslationEngine = "none";
const fontFamily = "system-ui";
const fontScope = "global";
const autoPlay = false;
const downloadPath = "";
const alwaysShowDownloadButton = false;
const unlimitedDownload = false;
const showTopAction = false;
const contentZoomFactor = 1;
const autoTheme = false;
const manualTheme = "light";
const isMenuExpanded = false;
const customApiPlugin = "";
const customApiPluginName = "";
const enableDiskCache = true;
const diskCacheDir = "";
const diskCacheMaxSizeMB = 4096;
const diskCacheCleanupPolicy = "lru";
const aiProvider = "OpenRouter";
const openRouterApiKey = "";
const openRouterBaseUrl = "https://openrouter.ai/api/v1/chat/completions";
const openRouterModel = "google/gemini-2.5-flash-lite";
const translateLanguage = "en";
const translateMode = "Literal";
const autoTranslate = false;
const aiRecommendations = false;
const deeplApiKey = "";
const deeplFormality = "default";
const pauseListenHistory = false;
const pauseSearchHistory = false;
const disableScreenshot = false;
const dataSaverEnabled = false;
const crossfadeEnabled = false;
const crossfadeDuration = 5;
const crossfadeGapless = true;
const automixCrossfade = false;
const automixDebugOverlay = false;
const historyDuration = 1;
const skipSilence = false;
const skipSilenceInstant = false;
const audioNormalization = true;
const audioOffload = false;
const preloadNextSongEnabled = true;
const preloadNextSongLimit = 10;
const preloadLyricsEnabled = true;
const seekExtraSeconds = false;
const persistentQueue = true;
const autoLoadMore = true;
const disableLoadMoreWhenRepeatAll = false;
const dynamicTheme = true;
const enableHighRefreshRate = true;
const enableHaptics = false;
const selectedThemeColor = "#default";
const showCodecOnPlayer = false;
const hidePlayerThumbnail = false;
const cropAlbumArt = true;
const playerBackgroundStyle = "GRADIENT";
const miniPlayerBackgroundStyle = "DEFAULT";
const defaultOpenTab = "HOME";
const playerButtonsStyle = "DEFAULT";
const lyricsTextPosition = "LEFT";
const lyricsClick = true;
const lyricsScroll = true;
const lyricsAnimationStyle = "chorusmusic_1";
const lyricsTextSize = 24;
const lyricsLineSpacing = 1.3;
const lyricsGlowEffect = false;
const appleMusicLyricsBlur = true;
const lyricsStandardBlur = false;
const swipeLyrics = false;
const enableLyricsThumbnailPlayPause = false;
const hideStatusBarOnFullscreen = false;
const sliderStyle = "DEFAULT";
const squigglySlider = false;
const swipeThumbnail = true;
const swipeSensitivity = 0.73;
const canvasThumbnailAnimation = false;
const rotatingThumbnail = false;
const gridItemsSize = "SMALL";
const densityScale = 1;
const swipeToSong = true;
const swipeToRemoveSong = false;
const showLikedPlaylist = true;
const showDownloadedPlaylist = true;
const showExportedPlaylist = true;
const showTopPlaylist = true;
const showCachedPlaylist = true;
const showCommentButton = false;
const defaultLibChips = "LIBRARY";
const contentLanguage = "system";
const contentCountry = "system";
const suggestionRegion = "system";
const hideExplicit = false;
const hideVideoSongs = false;
const hideYoutubeShorts = false;
const sponsorBlockEnabled = false;
const showArtistDescription = true;
const showArtistSubscriberCount = true;
const showMonthlyListeners = true;
const showArtistVideo = true;
const showArtistBackgroundVideo = true;
const lengthTop = "50";
const quickPicks = "QUICK_PICKS";
const showSpeedDial = true;
const randomizeHomeOrder = false;
const ipVersion = "IPV4";
const albumCanvasEnabled = false;
const discordClientId = "1554131750899163186";
const discordRPCEnabled = false;
const discordActivityDetails = "ARTIST";
const discordActivityState = "ALBUM";
const discordActivityButton1Label = "Listen on Chorus Music";
const discordActivityButton1Enabled = true;
const discordActivityButton2Label = "Go to Chorus Music";
const discordActivityButton2Enabled = false;
const discordActivityButton1UrlSource = "songurl";
const discordActivityButton1CustomUrl = "";
const discordActivityButton2UrlSource = "custom";
const discordActivityButton2CustomUrl = "https://github.com/slice-of-fun/Chorus-Music";
const discordActivityType = "LISTENING";
const discordShowWhenPaused = false;
const lastFMUseNowPlaying = false;
const lastFMUseSendLikes = false;
const enableLastFMScrobbling = false;
const scrobbleDelayPercent = 50;
const scrobbleMinSongDuration = 30;
const scrobbleDelaySeconds = 0;
const autoDownloadOnLike = false;
const similarContent = true;
const autoSkipNextOnError = false;
const persistentShuffleAcrossQueues = false;
const rememberShuffleAndRepeat = true;
const shufflePlaylistFirst = false;
const preventDuplicateTracksInQueue = true;
const stopMusicOnTaskClear = true;
const pauseOnMute = false;
const resumeOnBluetoothConnect = false;
const keepScreenOn = false;
const downloadQuality = "YOUTUBE";
const enableExportAsMp3 = false;
const enableGoogleCast = true;
const lyricsRomanizeAsMain = false;
const lyricsRomanizeJapanese = true;
const lyricsRomanizeKorean = true;
const lyricsRomanizeChinese = true;
const lyricsRomanizeHindi = true;
const lyricsRomanizePunjabi = true;
const lyricsRomanizeRussian = true;
const lyricsRomanizeUkrainian = true;
const lyricsRomanizeSerbian = true;
const lyricsRomanizeBulgarian = true;
const lyricsRomanizeBelarusian = true;
const lyricsRomanizeKyrgyz = true;
const lyricsRomanizeMacedonian = true;
const lyricsRomanizeCyrillicByLine = false;
const maxImageCacheSize = 512;
const maxSongCacheSize = 1024;
const pureBlack = false;
const pureBlackMiniPlayer = false;
const slimNavBar = false;
const useNewMiniPlayerDesign = false;
const hidePlayerSlider = false;
const thumbnailCornerRadius = 12;
const developerMode = false;
const ytmSync = false;
const selectedYtmPlaylists = "";
const showAudioFallbackToast = true;
const audioQuality = "OPUS";
const shuffleMode = false;
const exportDirectoryUri = "";
const exportingSongIds = "";
const exportedSongIds = "";
const lastfmSession = "";
const lastfmUsername = "";
const chipSortType = "";
const songSortType = "";
const songSortDescending = false;
const playlistSongSortType = "";
const playlistSongSortDescending = false;
const autoPlaylistSongSortType = "";
const autoPlaylistSongSortDescending = false;
const artistSortType = "";
const artistSortDescending = false;
const albumSortType = "";
const albumSortDescending = false;
const playlistSortType = "";
const playlistSortDescending = false;
const addToPlaylistSortType = "";
const addToPlaylistSortDescending = false;
const artistSongSortType = "";
const artistSongSortDescending = false;
const mixSortType = "";
const mixSortDescending = false;
const localSongsMinDurationSeconds = 0;
const localSongsExcludedFolders = [];
const localStorageDirs = [];
const discordToken = "";
const discordRefreshToken = "";
const discordTokenExpiresAt = 0;
const discordName = "";
const discordUsername = "";
const discordAvatarUrl = "";
const discordPresenceStatus = "online";
const discordActivityName = "SONG";
const discordActivityPlatform = "android";
const discordLargeImageType = "thumbnail";
const discordLargeImageCustomUrl = "";
const discordSmallImageType = "artist";
const discordSmallImageCustomUrl = "";
const localSongsSortType = "";
const localSongsSortDescending = false;
const songFilter = "LIBRARY";
const artistFilter = "LIBRARY";
const albumFilter = "LIBRARY";
const lastLikeSongSync = 0;
const lastLibSongSync = 0;
const lastAlbumSync = 0;
const lastArtistSync = 0;
const lastPlaylistSync = 0;
const lastFullSync = 0;
const artistViewType = "LIST";
const albumViewType = "LIST";
const playlistViewType = "LIST";
const playlistEditLock = false;
const queueEditLockV2 = false;
const showUploadedPlaylist = true;
const enablePlayerSwipe = true;
const spatialAudioEnabled = false;
const spatialAudioStrength = 0.5;
const crossfeedEnabled = false;
const bassBoost = 0;
const virtualizer = 0;
const listenBrainzEnabled = false;
const listenBrainzToken = "";
const useLoginForBrowse = true;
const set = {
  isProxy,
  proxyConfig,
  enableRealIP,
  realIP,
  noAnimate,
  animationSpeed,
  author,
  authorUrl,
  musicApiPort,
  closeAction,
  musicQuality,
  lyricTranslationEngine,
  fontFamily,
  fontScope,
  autoPlay,
  downloadPath,
  alwaysShowDownloadButton,
  unlimitedDownload,
  showTopAction,
  contentZoomFactor,
  autoTheme,
  manualTheme,
  isMenuExpanded,
  customApiPlugin,
  customApiPluginName,
  enableDiskCache,
  diskCacheDir,
  diskCacheMaxSizeMB,
  diskCacheCleanupPolicy,
  aiProvider,
  openRouterApiKey,
  openRouterBaseUrl,
  openRouterModel,
  translateLanguage,
  translateMode,
  autoTranslate,
  aiRecommendations,
  deeplApiKey,
  deeplFormality,
  pauseListenHistory,
  pauseSearchHistory,
  disableScreenshot,
  dataSaverEnabled,
  crossfadeEnabled,
  crossfadeDuration,
  crossfadeGapless,
  automixCrossfade,
  automixDebugOverlay,
  historyDuration,
  skipSilence,
  skipSilenceInstant,
  audioNormalization,
  audioOffload,
  preloadNextSongEnabled,
  preloadNextSongLimit,
  preloadLyricsEnabled,
  seekExtraSeconds,
  persistentQueue,
  autoLoadMore,
  disableLoadMoreWhenRepeatAll,
  dynamicTheme,
  enableHighRefreshRate,
  enableHaptics,
  selectedThemeColor,
  showCodecOnPlayer,
  hidePlayerThumbnail,
  cropAlbumArt,
  playerBackgroundStyle,
  miniPlayerBackgroundStyle,
  defaultOpenTab,
  playerButtonsStyle,
  lyricsTextPosition,
  lyricsClick,
  lyricsScroll,
  lyricsAnimationStyle,
  lyricsTextSize,
  lyricsLineSpacing,
  lyricsGlowEffect,
  appleMusicLyricsBlur,
  lyricsStandardBlur,
  swipeLyrics,
  enableLyricsThumbnailPlayPause,
  hideStatusBarOnFullscreen,
  sliderStyle,
  squigglySlider,
  swipeThumbnail,
  swipeSensitivity,
  canvasThumbnailAnimation,
  rotatingThumbnail,
  gridItemsSize,
  densityScale,
  swipeToSong,
  swipeToRemoveSong,
  showLikedPlaylist,
  showDownloadedPlaylist,
  showExportedPlaylist,
  showTopPlaylist,
  showCachedPlaylist,
  showCommentButton,
  defaultLibChips,
  contentLanguage,
  contentCountry,
  suggestionRegion,
  hideExplicit,
  hideVideoSongs,
  hideYoutubeShorts,
  sponsorBlockEnabled,
  showArtistDescription,
  showArtistSubscriberCount,
  showMonthlyListeners,
  showArtistVideo,
  showArtistBackgroundVideo,
  lengthTop,
  quickPicks,
  showSpeedDial,
  randomizeHomeOrder,
  ipVersion,
  albumCanvasEnabled,
  discordClientId,
  discordRPCEnabled,
  discordActivityDetails,
  discordActivityState,
  discordActivityButton1Label,
  discordActivityButton1Enabled,
  discordActivityButton2Label,
  discordActivityButton2Enabled,
  discordActivityButton1UrlSource,
  discordActivityButton1CustomUrl,
  discordActivityButton2UrlSource,
  discordActivityButton2CustomUrl,
  discordActivityType,
  discordShowWhenPaused,
  lastFMUseNowPlaying,
  lastFMUseSendLikes,
  enableLastFMScrobbling,
  scrobbleDelayPercent,
  scrobbleMinSongDuration,
  scrobbleDelaySeconds,
  autoDownloadOnLike,
  similarContent,
  autoSkipNextOnError,
  persistentShuffleAcrossQueues,
  rememberShuffleAndRepeat,
  shufflePlaylistFirst,
  preventDuplicateTracksInQueue,
  stopMusicOnTaskClear,
  pauseOnMute,
  resumeOnBluetoothConnect,
  keepScreenOn,
  downloadQuality,
  enableExportAsMp3,
  enableGoogleCast,
  lyricsRomanizeAsMain,
  lyricsRomanizeJapanese,
  lyricsRomanizeKorean,
  lyricsRomanizeChinese,
  lyricsRomanizeHindi,
  lyricsRomanizePunjabi,
  lyricsRomanizeRussian,
  lyricsRomanizeUkrainian,
  lyricsRomanizeSerbian,
  lyricsRomanizeBulgarian,
  lyricsRomanizeBelarusian,
  lyricsRomanizeKyrgyz,
  lyricsRomanizeMacedonian,
  lyricsRomanizeCyrillicByLine,
  maxImageCacheSize,
  maxSongCacheSize,
  pureBlack,
  pureBlackMiniPlayer,
  slimNavBar,
  useNewMiniPlayerDesign,
  hidePlayerSlider,
  thumbnailCornerRadius,
  developerMode,
  ytmSync,
  selectedYtmPlaylists,
  showAudioFallbackToast,
  audioQuality,
  shuffleMode,
  exportDirectoryUri,
  exportingSongIds,
  exportedSongIds,
  lastfmSession,
  lastfmUsername,
  chipSortType,
  songSortType,
  songSortDescending,
  playlistSongSortType,
  playlistSongSortDescending,
  autoPlaylistSongSortType,
  autoPlaylistSongSortDescending,
  artistSortType,
  artistSortDescending,
  albumSortType,
  albumSortDescending,
  playlistSortType,
  playlistSortDescending,
  addToPlaylistSortType,
  addToPlaylistSortDescending,
  artistSongSortType,
  artistSongSortDescending,
  mixSortType,
  mixSortDescending,
  localSongsMinDurationSeconds,
  localSongsExcludedFolders,
  localStorageDirs,
  discordToken,
  discordRefreshToken,
  discordTokenExpiresAt,
  discordName,
  discordUsername,
  discordAvatarUrl,
  discordPresenceStatus,
  discordActivityName,
  discordActivityPlatform,
  discordLargeImageType,
  discordLargeImageCustomUrl,
  discordSmallImageType,
  discordSmallImageCustomUrl,
  localSongsSortType,
  localSongsSortDescending,
  songFilter,
  artistFilter,
  albumFilter,
  lastLikeSongSync,
  lastLibSongSync,
  lastAlbumSync,
  lastArtistSync,
  lastPlaylistSync,
  lastFullSync,
  artistViewType,
  albumViewType,
  playlistViewType,
  playlistEditLock,
  queueEditLockV2,
  showUploadedPlaylist,
  enablePlayerSwipe,
  spatialAudioEnabled,
  spatialAudioStrength,
  crossfeedEnabled,
  bassBoost,
  virtualizer,
  listenBrainzEnabled,
  listenBrainzToken,
  useLoginForBrowse
};
const store$3 = new Store({
  name: "config",
  defaults: {
    set,
    shortcuts: createDefaultShortcuts()
  }
});
let initialized = false;
function initializeConfig() {
  if (initialized) {
    return store$3;
  }
  initialized = true;
  try {
    store$3.get("set.downloadPath") || store$3.set("set.downloadPath", electron.app.getPath("downloads"));
    store$3.get("set.diskCacheDir") || store$3.set("set.diskCacheDir", path__namespace.join(electron.app.getPath("userData"), "cache"));
    if (store$3.get("set.diskCacheMaxSizeMB") === void 0) {
      store$3.set("set.diskCacheMaxSizeMB", 4096);
    }
    if (!store$3.get("set.diskCacheCleanupPolicy")) {
      store$3.set("set.diskCacheCleanupPolicy", "lru");
    }
    if (store$3.get("set.enableDiskCache") === void 0) {
      store$3.set("set.enableDiskCache", true);
    }
  } catch (error) {
    console.error("[config] Failed to initialize default configuration:", error);
  }
  electron.ipcMain.on("set-store-value", (_, key, value) => {
    try {
      store$3.set(key, value);
    } catch (error) {
      console.error(`[config] Failed to write configuration key=${key}:`, error);
    }
  });
  electron.ipcMain.on("get-store-value", (event, key) => {
    try {
      const value = store$3.get(key);
      event.returnValue = value || "";
    } catch (error) {
      console.error(`[config] Failed to read configuration key=${key}:`, error);
      event.returnValue = "";
    }
  });
  return store$3;
}
function getStore() {
  return store$3;
}
function getSharedStore() {
  return store$3;
}
const store$2 = getSharedStore();
let lyricWindow = null;
let lyricBoundsSaveTimer = null;
const saveLyricWindowBounds = (bounds) => {
  if (lyricBoundsSaveTimer) {
    clearTimeout(lyricBoundsSaveTimer);
  }
  lyricBoundsSaveTimer = setTimeout(() => {
    lyricBoundsSaveTimer = null;
    try {
      store$2.set("lyricWindowBounds", bounds);
    } catch (error) {
      console.error("Failed to save lyrics window location:", error);
    }
  }, 500);
};
let isDragging = false;
let originalSize = { width: 0, height: 0 };
let mousePresenceTimer = null;
let lastMouseInside = null;
let isLyricLocked = false;
let isLyricWindowVisible = false;
const isPointInsideWindow = (point, bounds) => {
  return point.x >= bounds.x && point.x < bounds.x + bounds.width && point.y >= bounds.y && point.y < bounds.y + bounds.height;
};
const stopMousePresenceTracking = () => {
  if (mousePresenceTimer) {
    clearInterval(mousePresenceTimer);
    mousePresenceTimer = null;
  }
  lastMouseInside = null;
};
const emitMousePresence = () => {
  if (!lyricWindow || lyricWindow.isDestroyed()) return;
  const mousePoint = electron.screen.getCursorScreenPoint();
  const bounds = lyricWindow.getBounds();
  const isInside = isPointInsideWindow(mousePoint, bounds);
  if (isInside === lastMouseInside) return;
  lastMouseInside = isInside;
  lyricWindow.webContents.send("lyric-mouse-presence", isInside);
};
const startMousePresenceTracking = () => {
  if (mousePresenceTimer) return;
  emitMousePresence();
  mousePresenceTimer = setInterval(() => {
    if (!lyricWindow || lyricWindow.isDestroyed()) {
      stopMousePresenceTracking();
      return;
    }
    emitMousePresence();
  }, 50);
};
const syncMousePresenceTracking = () => {
  if (isLyricLocked && isLyricWindowVisible && lyricWindow && !lyricWindow.isDestroyed()) {
    startMousePresenceTracking();
  } else {
    stopMousePresenceTracking();
  }
};
const createWin = () => {
  console.log("Creating lyric window");
  const windowBounds = store$2.get("lyricWindowBounds") || {};
  const { x, y, width, height, displayId } = windowBounds;
  const displays = electron.screen.getAllDisplays();
  let isValidPosition = false;
  let targetDisplay = displays[0];
  if (displayId) {
    const matchedDisplay = displays.find((d) => d.id === displayId);
    if (matchedDisplay) {
      targetDisplay = matchedDisplay;
      console.log("Found matching display by ID:", displayId);
    }
  }
  if (x !== void 0 && y !== void 0) {
    for (const display of displays) {
      const { bounds } = display;
      if (x >= bounds.x - 50 && x < bounds.x + bounds.width + 50 && y >= bounds.y - 50 && y < bounds.y + bounds.height + 50) {
        isValidPosition = true;
        targetDisplay = display;
        break;
      }
    }
  }
  const defaultWidth = 800;
  const defaultHeight = 200;
  const maxWidth = 1600;
  const maxHeight = 800;
  const validWidth = width && width > 0 && width <= maxWidth ? width : defaultWidth;
  const validHeight = height && height > 0 && height <= maxHeight ? height : defaultHeight;
  let windowX = isValidPosition ? x : void 0;
  let windowY = isValidPosition ? y : void 0;
  if (windowX === void 0 || windowY === void 0) {
    windowX = targetDisplay.bounds.x + (targetDisplay.bounds.width - validWidth) / 2;
    windowY = targetDisplay.bounds.y + (targetDisplay.bounds.height - validHeight) / 2;
  }
  lyricWindow = new electron.BrowserWindow({
    width: validWidth,
    height: validHeight,
    x: windowX,
    y: windowY,
    frame: false,
    show: false,
    transparent: true,
    opacity: 1,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: true,
    roundedCorners: false,
    titleBarStyle: "hidden",
    titleBarOverlay: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true
    },
    backgroundColor: "#00000000"
  });
  lyricWindow.on("closed", () => {
    stopMousePresenceTracking();
    isLyricLocked = false;
    isLyricWindowVisible = false;
    if (lyricWindow) {
      lyricWindow.destroy();
      lyricWindow = null;
    }
  });
  lyricWindow.on("show", () => {
    isLyricWindowVisible = true;
    syncMousePresenceTracking();
  });
  lyricWindow.on("hide", () => {
    isLyricWindowVisible = false;
    stopMousePresenceTracking();
  });
  lyricWindow.on("minimize", () => {
    isLyricWindowVisible = false;
    stopMousePresenceTracking();
  });
  lyricWindow.on("restore", () => {
    isLyricWindowVisible = true;
    syncMousePresenceTracking();
  });
  lyricWindow.on("resize", () => {
    if (isDragging) return;
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      const [width2, height2] = lyricWindow.getSize();
      const [x2, y2] = lyricWindow.getPosition();
      saveLyricWindowBounds({ x: x2, y: y2, width: width2, height: height2 });
    }
  });
  lyricWindow.on("blur", () => lyricWindow && lyricWindow.setMaximizable(false));
  return lyricWindow;
};
const loadLyricWindow = (ipcMain, mainWin) => {
  const showLyricWindow = () => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      if (lyricWindow.isMinimized()) {
        lyricWindow.restore();
      }
      lyricWindow.focus();
      lyricWindow.show();
      return true;
    }
    return false;
  };
  ipcMain.on("open-lyric", () => {
    console.log("Received open-lyric request");
    if (showLyricWindow()) {
      return;
    }
    console.log("Creating new lyric window");
    const win = createWin();
    if (!win) {
      console.error("Failed to create lyric window");
      return;
    }
    if (process.env.NODE_ENV === "development") {
      win.webContents.openDevTools({ mode: "detach" });
      win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/#/lyric`);
    } else {
      const distPath = path.resolve(__dirname, "../renderer");
      win.loadURL(`file://${distPath}/index.html#/lyric`);
    }
    win.setMinimumSize(600, 200);
    win.setSkipTaskbar(true);
    win.once("ready-to-show", () => {
      console.log("Lyric window ready to show");
      win.show();
    });
  });
  ipcMain.on("lyric-ready", () => {
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send("lyric-window-ready");
    }
  });
  ipcMain.on("send-lyric", (_, data) => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      try {
        lyricWindow.webContents.send("receive-lyric", data);
      } catch (error) {
        console.error("Error processing lyric data:", error);
      }
    }
  });
  ipcMain.on("top-lyric", (_, data) => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.setAlwaysOnTop(data);
    }
  });
  ipcMain.on("close-lyric", () => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.webContents.send("lyric-window-close");
      mainWin.webContents.send("lyric-control-back", "close");
      mainWin.webContents.send("lyric-window-closed");
      lyricWindow.destroy();
      lyricWindow = null;
    }
  });
  ipcMain.on("set-lyric-lock-state", (_, isLocked) => {
    isLyricLocked = isLocked;
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.setResizable(!isLocked);
      lyricWindow.setIgnoreMouseEvents(isLocked, { forward: true });
    }
    syncMousePresenceTracking();
  });
  ipcMain.on("mouseenter-lyric", () => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.setIgnoreMouseEvents(true);
    }
  });
  ipcMain.on("mouseleave-lyric", () => {
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.setIgnoreMouseEvents(false);
    }
  });
  ipcMain.on("lyric-drag-start", () => {
    isDragging = true;
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      const [width, height] = lyricWindow.getSize();
      originalSize = { width, height };
    }
  });
  ipcMain.on("lyric-drag-end", () => {
    isDragging = false;
    if (lyricWindow && !lyricWindow.isDestroyed()) {
      lyricWindow.setSize(originalSize.width, originalSize.height);
    }
  });
  ipcMain.on("lyric-drag-move", (_, { deltaX, deltaY }) => {
    if (!lyricWindow || lyricWindow.isDestroyed() || !isDragging) return;
    const [currentX, currentY] = lyricWindow.getPosition();
    const windowWidth = originalSize.width;
    const windowHeight = originalSize.height;
    const newX = currentX + deltaX;
    const newY = currentY + deltaY;
    try {
      const mousePoint = electron.screen.getCursorScreenPoint();
      const currentDisplay = electron.screen.getDisplayNearestPoint(mousePoint);
      lyricWindow.setBounds(
        {
          x: newX,
          y: newY,
          width: windowWidth,
          height: windowHeight
        },
        false
      );
      const windowBounds = {
        x: newX,
        y: newY,
        width: windowWidth,
        height: windowHeight,
        displayId: currentDisplay.id
      };
      saveLyricWindowBounds(windowBounds);
    } catch (error) {
      console.error("Error during window drag:", error);
      lyricWindow.setPosition(newX, newY);
    }
  });
  ipcMain.on("set-ignore-mouse", (_, shouldIgnore) => {
    if (!lyricWindow || lyricWindow.isDestroyed()) return;
    lyricWindow.setIgnoreMouseEvents(shouldIgnore, { forward: true });
  });
  ipcMain.on("control-back", (_, command) => {
    console.log("command", command);
    if (mainWin && !mainWin.isDestroyed()) {
      console.log("Sending control-back command:", command);
      mainWin.webContents.send("lyric-control-back", command);
    }
  });
};
function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}
const { toString } = Object.prototype;
const { getPrototypeOf } = Object;
const { iterator, toStringTag } = Symbol;
const hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
const isUnsafeObjectKey = (prop) => typeof prop === "string" && (prop === "__proto__" || prop === "constructor" || prop === "prototype");
const isPrototypeBoundary = (obj, prototype2, source) => obj === Object.prototype || !source && prototype2 === null;
const isSafeAndFullyMutable = (obj) => {
  if (!Object.isExtensible(obj)) {
    return false;
  }
  const props = Object.getOwnPropertyNames(obj);
  if (Object.getOwnPropertySymbols) {
    props.push(...Object.getOwnPropertySymbols(obj));
  }
  return props.every((prop) => {
    if (isUnsafeObjectKey(prop)) {
      return false;
    }
    const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    return !!descriptor && descriptor.configurable && descriptor.writable === true;
  });
};
const hasOwnInPrototypeChain = (thing, prop) => {
  let obj = thing;
  const seen = [];
  while (obj != null) {
    if (seen.indexOf(obj) !== -1) {
      return false;
    }
    seen.push(obj);
    const prototype2 = getPrototypeOf(obj);
    if (isPrototypeBoundary(obj, prototype2, obj === thing)) {
      return false;
    }
    if (hasOwnProperty(obj, prop)) {
      return true;
    }
    obj = prototype2;
  }
  return false;
};
const getSafeProp = (obj, prop) => obj != null && hasOwnInPrototypeChain(obj, prop) ? obj[prop] : void 0;
const toSafeFlatObject = (thing) => {
  if (thing == null || typeof thing !== "object" && typeof thing !== "function") {
    return thing;
  }
  const sourcePrototype = getPrototypeOf(thing);
  if (sourcePrototype === null && isSafeAndFullyMutable(thing)) {
    return thing;
  }
  const result = /* @__PURE__ */ Object.create(null);
  const merged = /* @__PURE__ */ Object.create(null);
  const seen = [];
  let current = thing;
  while (current != null) {
    if (seen.indexOf(current) !== -1) {
      break;
    }
    seen.push(current);
    const prototype2 = current === thing ? sourcePrototype : getPrototypeOf(current);
    if (isPrototypeBoundary(current, prototype2, current === thing)) {
      break;
    }
    const props = Object.getOwnPropertyNames(current);
    if (Object.getOwnPropertySymbols) {
      props.push(...Object.getOwnPropertySymbols(current));
    }
    for (const prop of props) {
      if (isUnsafeObjectKey(prop)) {
        continue;
      }
      if (!hasOwnProperty(merged, prop)) {
        result[prop] = thing[prop];
        merged[prop] = true;
      }
    }
    current = prototype2;
  }
  return result;
};
const kindOf = /* @__PURE__ */ ((cache) => (thing) => {
  const str = toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(/* @__PURE__ */ Object.create(null));
const kindOfTest = (type) => {
  type = type.toLowerCase();
  return (thing) => kindOf(thing) === type;
};
const typeOfTest = (type) => (thing) => typeof thing === type;
const { isArray } = Array;
const isUndefined = typeOfTest("undefined");
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction$1(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}
const isArrayBuffer = kindOfTest("ArrayBuffer");
function isArrayBufferView(val) {
  let result;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
    result = ArrayBuffer.isView(val);
  } else {
    result = val && val.buffer && isArrayBuffer(val.buffer);
  }
  return result;
}
const isString = typeOfTest("string");
const isFunction$1 = typeOfTest("function");
const isNumber = typeOfTest("number");
const isObject = (thing) => thing !== null && typeof thing === "object";
const isBoolean = (thing) => thing === true || thing === false;
const isPlainObject = (val) => {
  if (!isObject(val)) {
    return false;
  }
  const prototype2 = getPrototypeOf(val);
  return (prototype2 === null || prototype2 === Object.prototype || getPrototypeOf(prototype2) === null) && // Treat safe own/inherited Symbol.toStringTag or Symbol.iterator members as
  // evidence the value is tagged/iterable, while ignoring members reachable
  // only through shared or terminal prototype boundaries.
  !hasOwnInPrototypeChain(val, toStringTag) && !hasOwnInPrototypeChain(val, iterator);
};
const isEmptyObject = (val) => {
  if (!isObject(val) || isBuffer(val)) {
    return false;
  }
  try {
    return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
  } catch (e) {
    return false;
  }
};
const isDate = kindOfTest("Date");
const isFile = kindOfTest("File");
const isReactNativeBlob = (value) => {
  return !!(value && typeof value.uri !== "undefined");
};
const isReactNative = (formData) => formData && typeof formData.getParts !== "undefined";
const isBlob = kindOfTest("Blob");
const isFileList = kindOfTest("FileList");
const isSet = kindOfTest("Set");
const isStream = (val) => isObject(val) && isFunction$1(val.pipe);
function getGlobal() {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof self !== "undefined") return self;
  if (typeof window !== "undefined") return window;
  if (typeof global !== "undefined") return global;
  return {};
}
const G = getGlobal();
const FormDataCtor = typeof G.FormData !== "undefined" ? G.FormData : void 0;
const isFormData = (thing) => {
  if (!thing) return false;
  if (FormDataCtor && thing instanceof FormDataCtor) return true;
  const proto = getPrototypeOf(thing);
  if (!proto || proto === Object.prototype) return false;
  if (!isFunction$1(thing.append)) return false;
  const kind = kindOf(thing);
  return kind === "formdata" || // detect form-data instance
  kind === "object" && isFunction$1(thing.toString) && thing.toString() === "[object FormData]";
};
const isURLSearchParams = kindOfTest("URLSearchParams");
const [isReadableStream, isRequest, isResponse, isHeaders] = [
  "ReadableStream",
  "Request",
  "Response",
  "Headers"
].map(kindOfTest);
const trim = (str) => {
  return str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
};
function forEach(obj, fn, { allOwnKeys = false } = {}) {
  if (obj === null || typeof obj === "undefined") {
    return;
  }
  let i;
  let l;
  if (typeof obj !== "object") {
    obj = [obj];
  }
  if (isArray(obj)) {
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    if (isBuffer(obj)) {
      return;
    }
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;
    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}
function findKey(obj, key) {
  if (isBuffer(obj)) {
    return null;
  }
  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}
const _global = (() => {
  if (typeof globalThis !== "undefined") return globalThis;
  return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
})();
const isContextDefined = (context) => !isUndefined(context) && context !== _global;
function merge(...objs) {
  const { caseless, skipUndefined } = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = (val, key) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return;
    }
    const targetKey = caseless && typeof key === "string" && findKey(result, key) || key;
    const existing = hasOwnProperty(result, targetKey) ? result[targetKey] : void 0;
    if (isPlainObject(existing) && isPlainObject(val)) {
      result[targetKey] = merge(existing, val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else if (!skipUndefined || !isUndefined(val)) {
      result[targetKey] = val;
    }
  };
  for (let i = 0, l = objs.length; i < l; i++) {
    const source = objs[i];
    if (!source || isBuffer(source)) {
      continue;
    }
    forEach(source, assignValue);
    if (typeof source !== "object" || isArray(source)) {
      continue;
    }
    const symbols = Object.getOwnPropertySymbols(source);
    for (let j = 0; j < symbols.length; j++) {
      const symbol = symbols[j];
      if (propertyIsEnumerable.call(source, symbol)) {
        assignValue(source[symbol], symbol);
      }
    }
  }
  return result;
}
const extend = (a, b, thisArg, { allOwnKeys } = {}) => {
  forEach(
    b,
    (val, key) => {
      if (thisArg && isFunction$1(val)) {
        Object.defineProperty(a, key, {
          // Null-proto descriptor so a polluted Object.prototype.get cannot
          // hijack defineProperty's accessor-vs-data resolution.
          __proto__: null,
          value: bind(val, thisArg),
          writable: true,
          enumerable: true,
          configurable: true
        });
      } else {
        Object.defineProperty(a, key, {
          __proto__: null,
          value: val,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    },
    { allOwnKeys }
  );
  return a;
};
const stripBOM = (content) => {
  if (content.charCodeAt(0) === 65279) {
    content = content.slice(1);
  }
  return content;
};
const inherits = (constructor, superConstructor, props, descriptors) => {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  Object.defineProperty(constructor.prototype, "constructor", {
    __proto__: null,
    value: constructor,
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(constructor, "super", {
    __proto__: null,
    value: superConstructor.prototype
  });
  props && Object.assign(constructor.prototype, props);
};
const toFlatObject = (sourceObj, destObj, filter2, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};
  destObj = destObj || {};
  if (sourceObj == null) return destObj;
  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter2 !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter2 || filter2(sourceObj, destObj)) && sourceObj !== Object.prototype);
  return destObj;
};
const endsWith = (str, searchString, position) => {
  str = String(str);
  if (position === void 0 || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
};
const toArray = (thing) => {
  if (!thing) return null;
  if (isArray(thing)) return thing;
  let i = thing.length;
  if (!isNumber(i)) return null;
  const arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
};
const isTypedArray = /* @__PURE__ */ ((TypedArray) => {
  return (thing) => {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
const forEachEntry = (obj, fn) => {
  const generator = obj && obj[iterator];
  const _iterator = generator.call(obj);
  let result;
  while ((result = _iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
};
const matchAll = (regExp, str) => {
  let matches;
  const arr = [];
  while ((matches = regExp.exec(str)) !== null) {
    arr.push(matches);
  }
  return arr;
};
const isHTMLForm = kindOfTest("HTMLFormElement");
const toCamelCase = (str) => {
  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
    return p1.toUpperCase() + p2;
  });
};
const { propertyIsEnumerable } = Object.prototype;
const isRegExp = kindOfTest("RegExp");
const reduceDescriptors = (obj, reducer) => {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};
  forEach(descriptors, (descriptor, name) => {
    let ret;
    if ((ret = reducer(descriptor, name, obj)) !== false) {
      reducedDescriptors[name] = ret || descriptor;
    }
  });
  Object.defineProperties(obj, reducedDescriptors);
};
const freezeMethods = (obj) => {
  reduceDescriptors(obj, (descriptor, name) => {
    if (isFunction$1(obj) && ["arguments", "caller", "callee"].includes(name)) {
      return false;
    }
    const value = obj[name];
    if (!isFunction$1(value)) return;
    descriptor.enumerable = false;
    if ("writable" in descriptor) {
      descriptor.writable = false;
      return;
    }
    if (!descriptor.set) {
      descriptor.set = () => {
        throw Error("Can not rewrite read-only method '" + name + "'");
      };
    }
  });
};
const toObjectSet = (arrayOrString, delimiter) => {
  const obj = {};
  const define = (arr) => {
    arr.forEach((value) => {
      obj[value] = true;
    });
  };
  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
  return obj;
};
const noop = () => {
};
const toFiniteNumber = (value, defaultValue) => {
  return value != null && Number.isFinite(value = +value) ? value : defaultValue;
};
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction$1(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
}
const toJSONObject = (obj) => {
  const visited = /* @__PURE__ */ new WeakSet();
  const visit = (source) => {
    if (isObject(source)) {
      if (visited.has(source)) {
        return;
      }
      if (isBuffer(source)) {
        return source;
      }
      if (!("toJSON" in source)) {
        visited.add(source);
        let target;
        if (isSet(source)) {
          target = [];
          for (const value of source) {
            const reducedValue = visit(value);
            !isUndefined(reducedValue) && target.push(reducedValue);
          }
        } else {
          target = isArray(source) ? [] : {};
          forEach(source, (value, key) => {
            const reducedValue = visit(value);
            !isUndefined(reducedValue) && (target[key] = reducedValue);
          });
        }
        visited.delete(source);
        return target;
      }
    }
    return source;
  };
  return visit(obj);
};
const isAsyncFn = kindOfTest("AsyncFunction");
const isThenable = (thing) => thing && (isObject(thing) || isFunction$1(thing)) && isFunction$1(thing.then) && isFunction$1(thing.catch);
const _setImmediate = ((setImmediateSupported, postMessageSupported) => {
  if (setImmediateSupported) {
    return setImmediate;
  }
  return postMessageSupported ? ((token, callbacks) => {
    _global.addEventListener(
      "message",
      ({ source, data }) => {
        if (source === _global && data === token) {
          callbacks.length && callbacks.shift()();
        }
      },
      false
    );
    return (cb) => {
      callbacks.push(cb);
      _global.postMessage(token, "*");
    };
  })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
})(typeof setImmediate === "function", isFunction$1(_global.postMessage));
const asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
const isIterable = (thing) => thing != null && isFunction$1(thing[iterator]);
const isSafeIterable = (thing) => thing != null && hasOwnInPrototypeChain(thing, iterator) && isIterable(thing);
const utils$1 = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isEmptyObject,
  isReadableStream,
  isRequest,
  isResponse,
  isHeaders,
  isUndefined,
  isDate,
  isFile,
  isReactNativeBlob,
  isReactNative,
  isBlob,
  isRegExp,
  isFunction: isFunction$1,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty,
  // an alias to avoid ESLint no-prototype-builtins detection
  hasOwnInPrototypeChain,
  getSafeProp,
  toSafeFlatObject,
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable,
  setImmediate: _setImmediate,
  asap,
  isIterable,
  isSafeIterable
};
const ignoreDuplicateOf = utils$1.toObjectSet([
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "user-agent"
]);
const parseHeaders = (rawHeaders) => {
  const parsed = {};
  let key;
  let val;
  let i;
  rawHeaders && rawHeaders.split("\n").forEach(function parser(line) {
    i = line.indexOf(":");
    key = line.substring(0, i).trim().toLowerCase();
    val = line.substring(i + 1).trim();
    const hasKey = utils$1.hasOwnProp(parsed, key);
    if (!key || hasKey && utils$1.hasOwnProp(ignoreDuplicateOf, key)) {
      return;
    }
    if (key === "set-cookie") {
      if (hasKey) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = hasKey ? parsed[key] + ", " + val : val;
    }
  });
  return parsed;
};
function trimSPorHTAB(str) {
  let start = 0;
  let end = str.length;
  while (start < end) {
    const code = str.charCodeAt(start);
    if (code !== 9 && code !== 32) {
      break;
    }
    start += 1;
  }
  while (end > start) {
    const code = str.charCodeAt(end - 1);
    if (code !== 9 && code !== 32) {
      break;
    }
    end -= 1;
  }
  return start === 0 && end === str.length ? str : str.slice(start, end);
}
const INVALID_UNICODE_HEADER_VALUE_CHARS = new RegExp("[\\u0000-\\u0008\\u000a-\\u001f\\u007f]+", "g");
const INVALID_BYTE_STRING_HEADER_VALUE_CHARS = new RegExp("[^\\u0009\\u0020-\\u007e\\u0080-\\u00ff]+", "g");
function sanitizeValue(value, invalidChars) {
  if (utils$1.isArray(value)) {
    return value.map((item) => sanitizeValue(item, invalidChars));
  }
  return trimSPorHTAB(String(value).replace(invalidChars, ""));
}
const sanitizeHeaderValue = (value) => sanitizeValue(value, INVALID_UNICODE_HEADER_VALUE_CHARS);
const sanitizeByteStringHeaderValue = (value) => sanitizeValue(value, INVALID_BYTE_STRING_HEADER_VALUE_CHARS);
function toByteStringHeaderObject(headers) {
  const byteStringHeaders = /* @__PURE__ */ Object.create(null);
  utils$1.forEach(headers.toJSON(), (value, header) => {
    byteStringHeaders[header] = sanitizeByteStringHeaderValue(value);
  });
  return byteStringHeaders;
}
const $internals$1 = Symbol("internals");
function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}
function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }
  return utils$1.isArray(value) ? value.map(normalizeValue) : sanitizeHeaderValue(String(value));
}
function parseTokens(str) {
  const tokens = /* @__PURE__ */ Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;
  while (match = tokensRE.exec(str)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}
const parameterNameRE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
function trimOWS(value) {
  let start = 0;
  let end = value.length;
  while (start < end) {
    const code = value.charCodeAt(start);
    if (code !== 9 && code !== 32) {
      break;
    }
    start += 1;
  }
  while (end > start) {
    const code = value.charCodeAt(end - 1);
    if (code !== 9 && code !== 32) {
      break;
    }
    end -= 1;
  }
  return start === 0 && end === value.length ? value : value.slice(start, end);
}
function decodeQuotedString(value) {
  const last = value.length - 1;
  if (last < 1 || value.charCodeAt(0) !== 34 || value.charCodeAt(last) !== 34) {
    return value;
  }
  let decoded = "";
  for (let i = 1; i < last; i++) {
    const code = value.charCodeAt(i);
    if (code === 34) {
      return value;
    }
    if (code === 92) {
      i += 1;
      if (i >= last) {
        return value;
      }
    }
    decoded += value[i];
  }
  return decoded;
}
function parseParameters(value) {
  const parameters = /* @__PURE__ */ Object.create(null);
  const str = String(value);
  let start = 0;
  let quoted = false;
  let escaped = false;
  function parseParameter(end) {
    const part = trimOWS(str.slice(start, end));
    const equals = part.indexOf("=");
    if (equals < 1) {
      return;
    }
    const name = trimOWS(part.slice(0, equals));
    if (!parameterNameRE.test(name)) {
      return;
    }
    const normalizedName = name.toLowerCase();
    if (normalizedName === "__proto__" || normalizedName === "constructor" || normalizedName === "prototype") {
      return;
    }
    const parameterValue = trimOWS(part.slice(equals + 1));
    parameters[normalizedName] = decodeQuotedString(parameterValue);
  }
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (quoted) {
      if (escaped) {
        escaped = false;
      } else if (code === 92) {
        escaped = true;
      } else if (code === 34) {
        quoted = false;
      }
    } else if (code === 34) {
      quoted = true;
    } else if (code === 44 || code === 59) {
      parseParameter(i);
      start = i + 1;
    }
  }
  parseParameter(str.length);
  return parameters;
}
const isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
function matchHeaderValue(context, value, header, filter2, isHeaderNameFilter) {
  if (utils$1.isFunction(filter2)) {
    return filter2.call(this, value, header);
  }
  if (isHeaderNameFilter) {
    value = header;
  }
  if (!utils$1.isString(value)) return;
  if (utils$1.isString(filter2)) {
    return value.indexOf(filter2) !== -1;
  }
  if (utils$1.isRegExp(filter2)) {
    return filter2.test(value);
  }
}
function formatHeader(header) {
  return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
    return char.toUpperCase() + str;
  });
}
function buildAccessors(obj, header) {
  const accessorName = utils$1.toCamelCase(" " + header);
  ["get", "set", "has"].forEach((methodName) => {
    Object.defineProperty(obj, methodName + accessorName, {
      // Null-proto descriptor so a polluted Object.prototype.get cannot turn
      // this data descriptor into an accessor descriptor on the way in.
      __proto__: null,
      value: function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}
let AxiosHeaders$1 = class AxiosHeaders {
  constructor(headers) {
    headers && this.set(headers);
  }
  set(header, valueOrRewrite, rewrite) {
    const self2 = this;
    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);
      if (!lHeader) {
        return;
      }
      const key = utils$1.findKey(self2, lHeader);
      if (!key || self2[key] === void 0 || _rewrite === true || _rewrite === void 0 && self2[key] !== false) {
        self2[key || _header] = normalizeValue(_value);
      }
    }
    const setHeaders = (headers, _rewrite) => utils$1.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
    if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if (utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders(header), valueOrRewrite);
    } else if (utils$1.isObject(header) && utils$1.isSafeIterable(header)) {
      let obj = /* @__PURE__ */ Object.create(null), dest, key;
      for (const entry of header) {
        if (!utils$1.isArray(entry)) {
          throw new TypeError("Object iterator must return a key-value pair");
        }
        key = entry[0];
        if (utils$1.hasOwnProp(obj, key)) {
          dest = obj[key];
          obj[key] = utils$1.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]];
        } else {
          obj[key] = entry[1];
        }
      }
      setHeaders(obj, valueOrRewrite);
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }
    return this;
  }
  get(header, parser) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils$1.findKey(this, header);
      if (key) {
        const value = this[key];
        if (!parser) {
          return value;
        }
        if (parser === true) {
          return parseTokens(value);
        }
        if (utils$1.isFunction(parser)) {
          return parser.call(this, value, key);
        }
        if (utils$1.isRegExp(parser)) {
          return parser.exec(value);
        }
        throw new TypeError("parser must be boolean|regexp|function");
      }
    }
  }
  has(header, matcher) {
    header = normalizeHeader(header);
    if (header) {
      const key = utils$1.findKey(this, header);
      return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }
    return false;
  }
  delete(header, matcher) {
    const self2 = this;
    let deleted = false;
    function deleteHeader(_header) {
      _header = normalizeHeader(_header);
      if (_header) {
        const key = utils$1.findKey(self2, _header);
        if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
          delete self2[key];
          deleted = true;
        }
      }
    }
    if (utils$1.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }
    return deleted;
  }
  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;
    while (i--) {
      const key = keys[i];
      if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }
    return deleted;
  }
  normalize(format) {
    const self2 = this;
    const headers = {};
    utils$1.forEach(this, (value, header) => {
      const key = utils$1.findKey(headers, header);
      if (key) {
        self2[key] = normalizeValue(value);
        delete self2[header];
        return;
      }
      const normalized = format ? formatHeader(header) : String(header).trim();
      if (normalized !== header) {
        delete self2[header];
      }
      self2[normalized] = normalizeValue(value);
      headers[normalized] = true;
    });
    return this;
  }
  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }
  toJSON(asStrings) {
    const obj = /* @__PURE__ */ Object.create(null);
    utils$1.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && utils$1.isArray(value) ? value.join(", ") : value);
    });
    return obj;
  }
  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }
  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
  }
  getSetCookie() {
    const value = this.get("set-cookie");
    return utils$1.isArray(value) ? value : value == null || value === false ? [] : [value];
  }
  get [Symbol.toStringTag]() {
    return "AxiosHeaders";
  }
  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }
  static parseParameters(value) {
    return parseParameters(value);
  }
  static concat(first, ...targets) {
    const computed = new this(first);
    targets.forEach((target) => computed.set(target));
    return computed;
  }
  static accessor(header) {
    const internals = this[$internals$1] = this[$internals$1] = {
      accessors: {}
    };
    const accessors = internals.accessors;
    const prototype2 = this.prototype;
    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);
      if (!accessors[lHeader]) {
        buildAccessors(prototype2, _header);
        accessors[lHeader] = true;
      }
    }
    utils$1.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
    return this;
  }
};
AxiosHeaders$1.accessor([
  "Content-Type",
  "Content-Length",
  "Accept",
  "Accept-Encoding",
  "User-Agent",
  "Authorization"
]);
utils$1.reduceDescriptors(AxiosHeaders$1.prototype, ({ value }, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1);
  return {
    get: () => value,
    set(headerValue) {
      this[mapped] = headerValue;
    }
  };
});
utils$1.freezeMethods(AxiosHeaders$1);
const REDACTED = "[REDACTED ****]";
function hasOwnOrPrototypeToJSON(source) {
  if (utils$1.hasOwnProp(source, "toJSON")) {
    return true;
  }
  let prototype2 = Object.getPrototypeOf(source);
  while (prototype2 && prototype2 !== Object.prototype) {
    if (utils$1.hasOwnProp(prototype2, "toJSON")) {
      return true;
    }
    prototype2 = Object.getPrototypeOf(prototype2);
  }
  return false;
}
function redactConfig(config, redactKeys) {
  const lowerKeys = new Set(redactKeys.map((k) => String(k).toLowerCase()));
  const seen = [];
  const visit = (source) => {
    if (source === null || typeof source !== "object") return source;
    if (utils$1.isBuffer(source)) return source;
    if (seen.indexOf(source) !== -1) return void 0;
    if (source instanceof AxiosHeaders$1) {
      source = source.toJSON();
    }
    seen.push(source);
    let result;
    if (utils$1.isArray(source)) {
      result = [];
      source.forEach((v, i) => {
        const reducedValue = visit(v);
        if (!utils$1.isUndefined(reducedValue)) {
          result[i] = reducedValue;
        }
      });
    } else {
      if (!utils$1.isPlainObject(source) && hasOwnOrPrototypeToJSON(source)) {
        seen.pop();
        return source;
      }
      result = /* @__PURE__ */ Object.create(null);
      for (const [key, value] of Object.entries(source)) {
        const reducedValue = lowerKeys.has(key.toLowerCase()) ? REDACTED : visit(value);
        if (!utils$1.isUndefined(reducedValue)) {
          result[key] = reducedValue;
        }
      }
    }
    seen.pop();
    return result;
  };
  return visit(config);
}
function stringifySafely$1(value) {
  try {
    return String(value);
  } catch (err) {
    return "";
  }
}
function aggregateErrorMessage(error) {
  const message = error.errors.map((entry) => {
    try {
      return entry && entry.message ? stringifySafely$1(entry.message) : stringifySafely$1(entry);
    } catch (err) {
      return "";
    }
  }).filter(Boolean).join("; ");
  return message || error.name || "AggregateError";
}
let AxiosError$1 = class AxiosError extends Error {
  static from(error, code, config, request, response, customProps) {
    let message = error.message;
    if (!message && utils$1.isArray(error.errors) && error.errors.length) {
      message = aggregateErrorMessage(error);
    }
    const axiosError = new AxiosError(message, code || error.code, config, request, response);
    Object.defineProperty(axiosError, "cause", {
      __proto__: null,
      value: error,
      writable: true,
      enumerable: false,
      configurable: true
    });
    axiosError.name = error.name;
    if (error.status != null && axiosError.status == null) {
      axiosError.status = error.status;
    }
    customProps && Object.assign(axiosError, customProps);
    return axiosError;
  }
  /**
   * Create an Error with the specified message, config, error code, request and response.
   *
   * @param {string} message The error message.
   * @param {string} [code] The error code (for example, 'ECONNABORTED').
   * @param {Object} [config] The config.
   * @param {Object} [request] The request.
   * @param {Object} [response] The response.
   *
   * @returns {Error} The created error.
   */
  constructor(message, code, config, request, response) {
    super(message);
    Object.defineProperty(this, "message", {
      // Null-proto descriptor so a polluted Object.prototype.get cannot turn
      // this data descriptor into an accessor descriptor on the way in.
      __proto__: null,
      value: message,
      enumerable: true,
      writable: true,
      configurable: true
    });
    this.name = "AxiosError";
    this.isAxiosError = true;
    code && (this.code = code);
    config && (this.config = config);
    request && (this.request = request);
    if (response) {
      this.response = response;
      this.status = response.status;
    }
  }
  toJSON() {
    const config = this.config;
    const redactKeys = config && utils$1.hasOwnProp(config, "redact") ? config.redact : void 0;
    const serializedConfig = utils$1.isArray(redactKeys) && redactKeys.length > 0 ? redactConfig(config, redactKeys) : utils$1.toJSONObject(config);
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: serializedConfig,
      code: this.code,
      status: this.status
    };
  }
};
AxiosError$1.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
AxiosError$1.ERR_BAD_OPTION = "ERR_BAD_OPTION";
AxiosError$1.ECONNABORTED = "ECONNABORTED";
AxiosError$1.ETIMEDOUT = "ETIMEDOUT";
AxiosError$1.ECONNREFUSED = "ECONNREFUSED";
AxiosError$1.ERR_NETWORK = "ERR_NETWORK";
AxiosError$1.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
AxiosError$1.ERR_DEPRECATED = "ERR_DEPRECATED";
AxiosError$1.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
AxiosError$1.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
AxiosError$1.ERR_CANCELED = "ERR_CANCELED";
AxiosError$1.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
AxiosError$1.ERR_INVALID_URL = "ERR_INVALID_URL";
AxiosError$1.ERR_FORM_DATA_DEPTH_EXCEEDED = "ERR_FORM_DATA_DEPTH_EXCEEDED";
const PlatformBuffer = {
  isBufferAvailable() {
    return typeof Buffer !== "undefined";
  },
  from(value) {
    return Buffer.from(value);
  }
};
const DEFAULT_FORM_DATA_MAX_DEPTH = 100;
function isVisitable(thing) {
  return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
}
function removeBrackets(key) {
  return utils$1.endsWith(key, "[]") ? key.slice(0, -2) : key;
}
function renderKey(path2, key, dots) {
  if (!path2) return key;
  return path2.concat(key).map(function each(token, i) {
    token = removeBrackets(token);
    return !dots && i ? "[" + token + "]" : token;
  }).join(dots ? "." : "");
}
function isFlatArray(arr) {
  return utils$1.isArray(arr) && !arr.some(isVisitable);
}
const predicates = utils$1.toFlatObject(utils$1, {}, null, function filter(prop) {
  return /^is[A-Z]/.test(prop);
});
function toFormData$1(obj, formData, options) {
  if (!utils$1.isObject(obj)) {
    throw new TypeError("target must be an object");
  }
  formData = formData || new (FormData$1 || FormData)();
  const option = (name, fallback) => {
    const value = utils$1.getSafeProp(options, name);
    return utils$1.isUndefined(value) ? fallback : value;
  };
  const metaTokens = option("metaTokens", true);
  const visitor = option("visitor") || defaultVisitor;
  const dots = option("dots", false);
  const indexes = option("indexes", false);
  const _Blob = option("Blob") || typeof Blob !== "undefined" && Blob;
  const maxDepth = option("maxDepth", DEFAULT_FORM_DATA_MAX_DEPTH);
  const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);
  const stack = [];
  if (!utils$1.isFunction(visitor)) {
    throw new TypeError("visitor must be a function");
  }
  function convertValue(value) {
    if (value === null) return "";
    if (utils$1.isDate(value)) {
      return value.toISOString();
    }
    if (utils$1.isBoolean(value)) {
      return value.toString();
    }
    if (!useBlob && utils$1.isBlob(value)) {
      throw new AxiosError$1("Blob is not supported. Use a Buffer instead.");
    }
    if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
      if (useBlob && typeof _Blob === "function") {
        return new _Blob([value]);
      }
      if (PlatformBuffer && PlatformBuffer.isBufferAvailable()) {
        return PlatformBuffer.from(value);
      }
      throw new AxiosError$1(
        "Blob is not supported. Use a Buffer instead.",
        AxiosError$1.ERR_NOT_SUPPORT
      );
    }
    return value;
  }
  function throwIfMaxDepthExceeded(depth) {
    if (depth > maxDepth) {
      throw new AxiosError$1(
        "Object is too deeply nested (" + depth + " levels). Max depth: " + maxDepth,
        AxiosError$1.ERR_FORM_DATA_DEPTH_EXCEEDED
      );
    }
  }
  function stringifyWithDepthLimit(value, depth) {
    if (maxDepth === Infinity) {
      return JSON.stringify(value);
    }
    const ancestors = [];
    return JSON.stringify(value, function limitDepth(_key, currentValue) {
      if (!utils$1.isObject(currentValue)) {
        return currentValue;
      }
      while (ancestors.length && ancestors[ancestors.length - 1] !== this) {
        ancestors.pop();
      }
      ancestors.push(currentValue);
      throwIfMaxDepthExceeded(depth + ancestors.length - 1);
      return currentValue;
    });
  }
  function defaultVisitor(value, key, path2) {
    let arr = value;
    if (utils$1.isReactNative(formData) && utils$1.isReactNativeBlob(value)) {
      formData.append(renderKey(path2, key, dots), convertValue(value));
      return false;
    }
    if (value && !path2 && typeof value === "object") {
      if (utils$1.endsWith(key, "{}")) {
        key = metaTokens ? key : key.slice(0, -2);
        value = stringifyWithDepthLimit(value, 1);
      } else if (utils$1.isArray(value) && isFlatArray(value) || (utils$1.isFileList(value) || utils$1.endsWith(key, "[]")) && (arr = utils$1.toArray(value))) {
        key = removeBrackets(key);
        arr.forEach(function each(el, index) {
          !(utils$1.isUndefined(el) || el === null) && formData.append(
            // eslint-disable-next-line no-nested-ternary
            indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]",
            convertValue(el)
          );
        });
        return false;
      }
    }
    if (isVisitable(value)) {
      return true;
    }
    formData.append(renderKey(path2, key, dots), convertValue(value));
    return false;
  }
  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });
  function build(value, path2, depth = 0) {
    if (utils$1.isUndefined(value)) return;
    throwIfMaxDepthExceeded(depth);
    if (stack.indexOf(value) !== -1) {
      throw new Error("Circular reference detected in " + path2.join("."));
    }
    stack.push(value);
    utils$1.forEach(value, function each(el, key) {
      const result = !(utils$1.isUndefined(el) || el === null) && visitor.call(formData, el, utils$1.isString(key) ? key.trim() : key, path2, exposedHelpers);
      if (result === true) {
        build(el, path2 ? path2.concat(key) : [key], depth + 1);
      }
    });
    stack.pop();
  }
  if (!utils$1.isObject(obj)) {
    throw new TypeError("data must be an object");
  }
  build(obj);
  return formData;
}
function encode$1(str) {
  const charMap = {
    "!": "%21",
    "'": "%27",
    "(": "%28",
    ")": "%29",
    "~": "%7E",
    "%20": "+"
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20/g, function replacer(match) {
    return charMap[match];
  });
}
function AxiosURLSearchParams(params, options) {
  this._pairs = [];
  params && toFormData$1(params, this, options);
}
const prototype = AxiosURLSearchParams.prototype;
prototype.append = function append(name, value) {
  this._pairs.push([name, value]);
};
prototype.toString = function toString2(encoder) {
  const _encode = encoder ? (value) => encoder.call(this, value, encode$1) : encode$1;
  return this._pairs.map(function each(pair) {
    return _encode(pair[0]) + "=" + _encode(pair[1]);
  }, "").join("&");
};
function encode(val) {
  return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
}
function buildURL(url2, params, options) {
  if (!params) {
    return url2;
  }
  url2 = url2 || "";
  const _options = utils$1.isFunction(options) ? {
    serialize: options
  } : options;
  const _encode = utils$1.getSafeProp(_options, "encode") || encode;
  const serializeFn = utils$1.getSafeProp(_options, "serialize");
  let serializedParams;
  if (serializeFn) {
    serializedParams = serializeFn(params, _options);
  } else {
    serializedParams = utils$1.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams(params, _options).toString(_encode);
  }
  if (serializedParams) {
    const hashmarkIndex = url2.indexOf("#");
    if (hashmarkIndex !== -1) {
      url2 = url2.slice(0, hashmarkIndex);
    }
    url2 += (url2.indexOf("?") === -1 ? "?" : "&") + serializedParams;
  }
  return url2;
}
const $internals = Symbol("internals");
function countHandlers(handlers) {
  return handlers ? handlers.length : 0;
}
function trimHandlers(handlers) {
  if (!handlers) {
    return;
  }
  while (handlers.length && handlers[handlers.length - 1] === null) {
    handlers.pop();
  }
}
function syncHandlerEntries(manager, internals) {
  const handlers = manager.handlers;
  const length = countHandlers(handlers);
  if (handlers !== internals.handlersRef) {
    internals.handlersRef = handlers;
    internals.handlerEntries.clear();
  } else if (length !== internals.handlersLength) {
    if (!length) {
      internals.handlerEntries.clear();
    } else {
      internals.handlerEntries.forEach(function removeStaleEntry(entry, id) {
        if (handlers[entry.index] !== entry.handler) {
          internals.handlerEntries.delete(id);
        }
      });
    }
  }
  internals.handlersLength = length;
}
class InterceptorManager {
  constructor() {
    this.handlers = [];
    this[$internals] = {
      handlersRef: this.handlers,
      handlersLength: this.handlers.length,
      handlerEntries: /* @__PURE__ */ new Map(),
      iterationDepth: 0,
      nextId: 0
    };
  }
  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   * @param {Object} options The options for the interceptor, synchronous and runWhen
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(fulfilled, rejected, options) {
    const handler = {
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    };
    const internals = this[$internals];
    if (this.handlers == null) {
      this.handlers = [];
    }
    syncHandlerEntries(this, internals);
    const id = internals.nextId++;
    this.handlers.push(handler);
    internals.handlerEntries.set(id, {
      handler,
      index: this.handlers.length - 1
    });
    internals.handlersLength = this.handlers.length;
    return id;
  }
  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {void}
   */
  eject(id) {
    const internals = this[$internals];
    syncHandlerEntries(this, internals);
    const entry = internals.handlerEntries.get(id);
    if (entry) {
      internals.handlerEntries.delete(id);
      if (this.handlers[entry.index] !== entry.handler) {
        return;
      }
      this.handlers[entry.index] = null;
      if (!internals.iterationDepth) {
        trimHandlers(this.handlers);
        internals.handlersLength = this.handlers.length;
      }
    }
  }
  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    if (this.handlers) {
      this.handlers = [];
      syncHandlerEntries(this, this[$internals]);
    }
  }
  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(fn) {
    const internals = this[$internals];
    syncHandlerEntries(this, internals);
    internals.iterationDepth++;
    try {
      utils$1.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    } finally {
      if (!--internals.iterationDepth) {
        syncHandlerEntries(this, internals);
        trimHandlers(this.handlers);
        internals.handlersLength = countHandlers(this.handlers);
      }
    }
  }
}
const transitionalDefaults = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false,
  legacyInterceptorReqResOrdering: true,
  advertiseZstdAcceptEncoding: false,
  validateStatusUndefinedResolves: true
};
const URLSearchParams$1 = url.URLSearchParams;
const ALPHA = "abcdefghijklmnopqrstuvwxyz";
const DIGIT = "0123456789";
const ALPHABET = {
  DIGIT,
  ALPHA,
  ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
};
const generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
  let str = "";
  const { length } = alphabet;
  const randomValues = new Uint32Array(size);
  crypto.randomFillSync(randomValues);
  for (let i = 0; i < size; i++) {
    str += alphabet[randomValues[i] % length];
  }
  return str;
};
const platform$1 = {
  isNode: true,
  classes: {
    URLSearchParams: URLSearchParams$1,
    FormData: FormData$1,
    Blob: typeof Blob !== "undefined" && Blob || null
  },
  ALPHABET,
  generateString,
  protocols: ["http", "https", "file", "data"]
};
const hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
const _navigator = typeof navigator === "object" && navigator || void 0;
const hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
const hasStandardBrowserWebWorkerEnv = (() => {
  return typeof WorkerGlobalScope !== "undefined" && // eslint-disable-next-line no-undef
  self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
})();
const origin = hasBrowserEnv && window.location.href || "http://localhost";
const utils = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  hasBrowserEnv,
  hasStandardBrowserEnv,
  hasStandardBrowserWebWorkerEnv,
  navigator: _navigator,
  origin
}, Symbol.toStringTag, { value: "Module" }));
const platform = {
  ...utils,
  ...platform$1
};
function toURLEncodedForm(data, options) {
  return toFormData$1(data, new platform.classes.URLSearchParams(), {
    visitor: function(value, key, path2, helpers) {
      if (platform.isNode && utils$1.isBuffer(value)) {
        this.append(key, value.toString("base64"));
        return false;
      }
      return helpers.defaultVisitor.apply(this, arguments);
    },
    ...options
  });
}
const MAX_DEPTH = DEFAULT_FORM_DATA_MAX_DEPTH;
function throwIfDepthExceeded(index) {
  if (index > MAX_DEPTH) {
    throw new AxiosError$1(
      "FormData field is too deeply nested (" + index + " levels). Max depth: " + MAX_DEPTH,
      AxiosError$1.ERR_FORM_DATA_DEPTH_EXCEEDED
    );
  }
}
function parsePropPath(name) {
  const path2 = [];
  const pattern = /[^.[\]]+|\[([^.[\]]*)]/g;
  let match;
  while ((match = pattern.exec(name)) !== null) {
    throwIfDepthExceeded(path2.length);
    path2.push(match[0] === "[]" ? "" : match[1] || match[0]);
  }
  return path2;
}
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}
function formDataToJSON(formData) {
  function buildPath(path2, value, target, index) {
    throwIfDepthExceeded(index);
    let name = path2[index++];
    if (name === "__proto__") return true;
    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path2.length;
    name = !name && utils$1.isArray(target) ? target.length : name;
    if (isLast) {
      if (utils$1.hasOwnProp(target, name)) {
        target[name] = utils$1.isArray(target[name]) ? target[name].concat(value) : [target[name], value];
      } else {
        target[name] = value;
      }
      return !isNumericKey;
    }
    if (!utils$1.hasOwnProp(target, name) || !utils$1.isObject(target[name])) {
      target[name] = [];
    }
    const result = buildPath(path2, value, target[name], index);
    if (result && utils$1.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }
    return !isNumericKey;
  }
  if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
    const obj = {};
    utils$1.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });
    return obj;
  }
  return null;
}
const methodList = Object.freeze([
  "get",
  "delete",
  "head",
  "options",
  "post",
  "put",
  "patch",
  "purge",
  "link",
  "unlink",
  "query"
]);
const own = (obj, key) => obj != null && utils$1.hasOwnProp(obj, key) ? obj[key] : void 0;
function stringifySafely(rawValue, parser, encoder) {
  if (utils$1.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils$1.trim(rawValue);
    } catch (e) {
      if (e.name !== "SyntaxError") {
        throw e;
      }
    }
  }
  return (encoder || JSON.stringify)(rawValue);
}
const defaults = {
  transitional: transitionalDefaults,
  adapter: ["xhr", "http", "fetch"],
  transformRequest: [
    function transformRequest(data, headers) {
      const contentType = headers.getContentType() || "";
      const hasJSONContentType = contentType.indexOf("application/json") > -1;
      const isObjectPayload = utils$1.isObject(data);
      if (isObjectPayload && utils$1.isHTMLForm(data)) {
        data = new FormData(data);
      }
      const isFormData2 = utils$1.isFormData(data);
      if (isFormData2) {
        return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
      }
      if (utils$1.isArrayBuffer(data) || utils$1.isBuffer(data) || utils$1.isStream(data) || utils$1.isFile(data) || utils$1.isBlob(data) || utils$1.isReadableStream(data)) {
        return data;
      }
      if (utils$1.isArrayBufferView(data)) {
        return data.buffer;
      }
      if (utils$1.isURLSearchParams(data)) {
        headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
        return data.toString();
      }
      let isFileList2;
      if (isObjectPayload) {
        const formSerializer = own(this, "formSerializer");
        if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
          return toURLEncodedForm(data, formSerializer).toString();
        }
        if ((isFileList2 = utils$1.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
          const env = own(this, "env");
          const _FormData = env && env.FormData;
          return toFormData$1(
            isFileList2 ? { "files[]": data } : data,
            _FormData && new _FormData(),
            formSerializer
          );
        }
      }
      if (isObjectPayload || hasJSONContentType) {
        headers.setContentType("application/json", false);
        return stringifySafely(data);
      }
      return data;
    }
  ],
  transformResponse: [
    function transformResponse(data) {
      const transitional2 = own(this, "transitional") || defaults.transitional;
      const forcedJSONParsing = transitional2 && transitional2.forcedJSONParsing;
      const responseType = own(this, "responseType");
      const JSONRequested = responseType === "json";
      if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) {
        return data;
      }
      if (data && utils$1.isString(data) && (forcedJSONParsing && !responseType || JSONRequested)) {
        const silentJSONParsing = transitional2 && transitional2.silentJSONParsing;
        const strictJSONParsing = !silentJSONParsing && JSONRequested;
        try {
          return JSON.parse(data, own(this, "parseReviver"));
        } catch (e) {
          if (strictJSONParsing) {
            if (e.name === "SyntaxError") {
              throw AxiosError$1.from(e, AxiosError$1.ERR_BAD_RESPONSE, this, null, own(this, "response"));
            }
            throw e;
          }
        }
      }
      return data;
    }
  ],
  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  maxContentLength: -1,
  maxBodyLength: -1,
  env: {
    FormData: platform.classes.FormData,
    Blob: platform.classes.Blob
  },
  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },
  headers: {
    common: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": void 0
    }
  }
};
utils$1.forEach(methodList, (method) => {
  defaults.headers[method] = {};
});
function transformData(fns, response) {
  const config = this || defaults;
  const context = response || config;
  const headers = AxiosHeaders$1.from(context.headers);
  let data = context.data;
  utils$1.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
  });
  headers.normalize();
  return data;
}
function isCancel$1(value) {
  return !!(value && value.__CANCEL__);
}
let CanceledError$1 = class CanceledError extends AxiosError$1 {
  /**
   * A `CanceledError` is an object that is thrown when an operation is canceled.
   *
   * @param {string=} message The message.
   * @param {Object=} config The config.
   * @param {Object=} request The request.
   *
   * @returns {CanceledError} The created error.
   */
  constructor(message, config, request) {
    super(message == null ? "canceled" : message, AxiosError$1.ERR_CANCELED, config, request);
    this.name = "CanceledError";
    this.__CANCEL__ = true;
  }
};
function settle(resolve, reject, response) {
  const validateStatus2 = response.config.validateStatus;
  if (!response.status || !validateStatus2 || validateStatus2(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError$1(
      "Request failed with status code " + response.status,
      response.status >= 400 && response.status < 500 ? AxiosError$1.ERR_BAD_REQUEST : AxiosError$1.ERR_BAD_RESPONSE,
      response.config,
      response.request,
      response
    ));
  }
}
function isAbsoluteURL(url2) {
  if (typeof url2 !== "string") {
    return false;
  }
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url2);
}
function combineURLs(baseURL, relativeURL) {
  if (!relativeURL) {
    return baseURL;
  }
  let end = baseURL.length;
  while (end > 0 && baseURL.charCodeAt(end - 1) === 47) {
    end--;
  }
  return baseURL.slice(0, end) + "/" + relativeURL.replace(/^\/+/, "");
}
const urlParserControlCharacters = /[\t\n\r]/g;
function normalizeURLForProtocolCheck(url2) {
  if (typeof url2 !== "string") {
    return url2;
  }
  let start = 0;
  while (start < url2.length && url2.charCodeAt(start) <= 32) {
    start++;
  }
  return url2.slice(start).replace(urlParserControlCharacters, "");
}
const malformedHttpProtocol = /^https?:(?!\/\/)/i;
function redactFragment(fragment) {
  if (!fragment) {
    return fragment;
  }
  return fragment.replace(/(^|&)([^=&]*=)?[^&]+/g, (match, separator, parameterName = "") => {
    return `${separator}${parameterName}${REDACTED}`;
  });
}
function redactSensitiveURLParts(url2) {
  const redactedURL = url2.replace(/^(https?:\/{0,2})[^/?#]*@/i, `$1${REDACTED}@`);
  const fragmentIndex = redactedURL.indexOf("#");
  const urlWithoutFragment = fragmentIndex === -1 ? redactedURL : redactedURL.slice(0, fragmentIndex);
  const redactedURLWithoutFragment = urlWithoutFragment.replace(
    /([?&][^=&#]*=)[^&#]*/g,
    `$1${REDACTED}`
  );
  if (fragmentIndex === -1) {
    return redactedURLWithoutFragment;
  }
  return `${redactedURLWithoutFragment}#${redactFragment(redactedURL.slice(fragmentIndex + 1))}`;
}
function assertValidHttpProtocolURL(url2, config) {
  if (typeof url2 === "string") {
    const normalizedURL = normalizeURLForProtocolCheck(url2);
    if (malformedHttpProtocol.test(normalizedURL)) {
      throw new AxiosError$1(
        `Invalid URL ${JSON.stringify(redactSensitiveURLParts(normalizedURL))}: missing "//" after protocol`,
        AxiosError$1.ERR_INVALID_URL,
        config
      );
    }
  }
}
function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls, config) {
  assertValidHttpProtocolURL(requestedURL, config);
  let isRelativeUrl = !isAbsoluteURL(requestedURL);
  if (baseURL && (isRelativeUrl || allowAbsoluteUrls === false)) {
    assertValidHttpProtocolURL(baseURL, config);
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}
var DEFAULT_PORTS$1 = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
};
function parseUrl(urlString) {
  try {
    return new URL(urlString);
  } catch {
    return null;
  }
}
function getProxyForUrl(url2) {
  var parsedUrl = (typeof url2 === "string" ? parseUrl(url2) : url2) || {};
  var proto = parsedUrl.protocol;
  var hostname = parsedUrl.host;
  var port = parsedUrl.port;
  if (typeof hostname !== "string" || !hostname || typeof proto !== "string") {
    return "";
  }
  proto = proto.split(":", 1)[0];
  hostname = hostname.replace(/:\d*$/, "");
  port = parseInt(port) || DEFAULT_PORTS$1[proto] || 0;
  if (!shouldProxy(hostname, port)) {
    return "";
  }
  var proxy = getEnv(proto + "_proxy") || getEnv("all_proxy");
  if (proxy && proxy.indexOf("://") === -1) {
    proxy = proto + "://" + proxy;
  }
  return proxy;
}
function shouldProxy(hostname, port) {
  var NO_PROXY = getEnv("no_proxy").toLowerCase();
  if (!NO_PROXY) {
    return true;
  }
  if (NO_PROXY === "*") {
    return false;
  }
  return NO_PROXY.split(/[,\s]/).every(function(proxy) {
    if (!proxy) {
      return true;
    }
    var parsedProxy = proxy.match(/^(.+):(\d+)$/);
    var parsedProxyHostname = parsedProxy ? parsedProxy[1] : proxy;
    var parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2]) : 0;
    if (parsedProxyPort && parsedProxyPort !== port) {
      return true;
    }
    if (!/^[.*]/.test(parsedProxyHostname)) {
      return hostname !== parsedProxyHostname;
    }
    if (parsedProxyHostname.charAt(0) === "*") {
      parsedProxyHostname = parsedProxyHostname.slice(1);
    }
    return !hostname.endsWith(parsedProxyHostname);
  });
}
function getEnv(key) {
  return process.env[key.toLowerCase()] || process.env[key.toUpperCase()] || "";
}
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var agent = {};
var src$1 = { exports: {} };
var browser = { exports: {} };
var ms;
var hasRequiredMs;
function requireMs() {
  if (hasRequiredMs) return ms;
  hasRequiredMs = 1;
  var s = 1e3;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  ms = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse(val);
    } else if (type === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
    );
  };
  function parse(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
      str
    );
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return void 0;
    }
  }
  function fmtShort(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return Math.round(ms2 / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms2 / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms2 / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms2 / s) + "s";
    }
    return ms2 + "ms";
  }
  function fmtLong(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return plural(ms2, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms2, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms2, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms2, msAbs, s, "second");
    }
    return ms2 + " ms";
  }
  function plural(ms2, msAbs, n, name) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms2 / n) + " " + name + (isPlural ? "s" : "");
  }
  return ms;
}
var common;
var hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common;
  hasRequiredCommon = 1;
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = requireMs();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug(...args) {
        if (!debug.enabled) {
          return;
        }
        const self2 = debug;
        const curr = Number(/* @__PURE__ */ new Date());
        const ms2 = curr - (prevTime || curr);
        self2.diff = ms2;
        self2.prev = prevTime;
        self2.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index];
            match = formatter.call(self2, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        createDebug.formatArgs.call(self2, args);
        const logFn = self2.log || createDebug.log;
        logFn.apply(self2, args);
      }
      debug.namespace = namespace;
      debug.useColors = createDebug.useColors();
      debug.color = createDebug.selectColor(namespace);
      debug.extend = extend2;
      debug.destroy = createDebug.destroy;
      Object.defineProperty(debug, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug);
      }
      return debug;
    }
    function extend2(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const ns of split) {
        if (ns[0] === "-") {
          createDebug.skips.push(ns.slice(1));
        } else {
          createDebug.names.push(ns);
        }
      }
    }
    function matchesTemplate(search2, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search2.length) {
        if (templateIndex < template.length && (template[templateIndex] === search2[searchIndex] || template[templateIndex] === "*")) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else {
          return false;
        }
      }
      while (templateIndex < template.length && template[templateIndex] === "*") {
        templateIndex++;
      }
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [
        ...createDebug.names,
        ...createDebug.skips.map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips) {
        if (matchesTemplate(name, skip)) {
          return false;
        }
      }
      for (const ns of createDebug.names) {
        if (matchesTemplate(name, ns)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  common = setup;
  return common;
}
var hasRequiredBrowser;
function requireBrowser() {
  if (hasRequiredBrowser) return browser.exports;
  hasRequiredBrowser = 1;
  (function(module2, exports) {
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module2.exports = requireCommon()(exports);
    const { formatters } = module2.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  })(browser, browser.exports);
  return browser.exports;
}
var node = { exports: {} };
var hasFlag;
var hasRequiredHasFlag;
function requireHasFlag() {
  if (hasRequiredHasFlag) return hasFlag;
  hasRequiredHasFlag = 1;
  hasFlag = (flag, argv = process.argv) => {
    const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
    const position = argv.indexOf(prefix + flag);
    const terminatorPosition = argv.indexOf("--");
    return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
  };
  return hasFlag;
}
var supportsColor_1;
var hasRequiredSupportsColor;
function requireSupportsColor() {
  if (hasRequiredSupportsColor) return supportsColor_1;
  hasRequiredSupportsColor = 1;
  const os$1 = os;
  const tty = require$$1;
  const hasFlag2 = requireHasFlag();
  const { env } = process;
  let forceColor;
  if (hasFlag2("no-color") || hasFlag2("no-colors") || hasFlag2("color=false") || hasFlag2("color=never")) {
    forceColor = 0;
  } else if (hasFlag2("color") || hasFlag2("colors") || hasFlag2("color=true") || hasFlag2("color=always")) {
    forceColor = 1;
  }
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      forceColor = 1;
    } else if (env.FORCE_COLOR === "false") {
      forceColor = 0;
    } else {
      forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
    }
  }
  function translateLevel(level) {
    if (level === 0) {
      return false;
    }
    return {
      level,
      hasBasic: true,
      has256: level >= 2,
      has16m: level >= 3
    };
  }
  function supportsColor(haveStream, streamIsTTY) {
    if (forceColor === 0) {
      return 0;
    }
    if (hasFlag2("color=16m") || hasFlag2("color=full") || hasFlag2("color=truecolor")) {
      return 3;
    }
    if (hasFlag2("color=256")) {
      return 2;
    }
    if (haveStream && !streamIsTTY && forceColor === void 0) {
      return 0;
    }
    const min = forceColor || 0;
    if (env.TERM === "dumb") {
      return min;
    }
    if (process.platform === "win32") {
      const osRelease = os$1.release().split(".");
      if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
        return Number(osRelease[2]) >= 14931 ? 3 : 2;
      }
      return 1;
    }
    if ("CI" in env) {
      if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
        return 1;
      }
      return min;
    }
    if ("TEAMCITY_VERSION" in env) {
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
    }
    if (env.COLORTERM === "truecolor") {
      return 3;
    }
    if ("TERM_PROGRAM" in env) {
      const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env.TERM_PROGRAM) {
        case "iTerm.app":
          return version >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env.TERM)) {
      return 2;
    }
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
      return 1;
    }
    if ("COLORTERM" in env) {
      return 1;
    }
    return min;
  }
  function getSupportLevel(stream2) {
    const level = supportsColor(stream2, stream2 && stream2.isTTY);
    return translateLevel(level);
  }
  supportsColor_1 = {
    supportsColor: getSupportLevel,
    stdout: translateLevel(supportsColor(true, tty.isatty(1))),
    stderr: translateLevel(supportsColor(true, tty.isatty(2)))
  };
  return supportsColor_1;
}
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return node.exports;
  hasRequiredNode = 1;
  (function(module2, exports) {
    const tty = require$$1;
    const util$1 = util;
    exports.init = init;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util$1.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = requireSupportsColor();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util$1.formatWithOptions(exports.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    module2.exports = requireCommon()(exports);
    const { formatters } = module2.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util$1.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util$1.inspect(v, this.inspectOpts);
    };
  })(node, node.exports);
  return node.exports;
}
var hasRequiredSrc$1;
function requireSrc$1() {
  if (hasRequiredSrc$1) return src$1.exports;
  hasRequiredSrc$1 = 1;
  if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
    src$1.exports = requireBrowser();
  } else {
    src$1.exports = requireNode();
  }
  return src$1.exports;
}
var promisify = {};
var hasRequiredPromisify;
function requirePromisify() {
  if (hasRequiredPromisify) return promisify;
  hasRequiredPromisify = 1;
  Object.defineProperty(promisify, "__esModule", { value: true });
  function promisify$1(fn) {
    return function(req, opts) {
      return new Promise((resolve, reject) => {
        fn.call(this, req, opts, (err, rtn) => {
          if (err) {
            reject(err);
          } else {
            resolve(rtn);
          }
        });
      });
    };
  }
  promisify.default = promisify$1;
  return promisify;
}
var src;
var hasRequiredSrc;
function requireSrc() {
  if (hasRequiredSrc) return src;
  hasRequiredSrc = 1;
  var __importDefault = src && src.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  const events_1 = require$$0;
  const debug_12 = __importDefault(requireSrc$1());
  const promisify_1 = __importDefault(requirePromisify());
  const debug = debug_12.default("agent-base");
  function isAgent(v) {
    return Boolean(v) && typeof v.addRequest === "function";
  }
  function isSecureEndpoint() {
    const { stack } = new Error();
    if (typeof stack !== "string")
      return false;
    return stack.split("\n").some((l) => l.indexOf("(https.js:") !== -1 || l.indexOf("node:https:") !== -1);
  }
  function createAgent(callback, opts) {
    return new createAgent.Agent(callback, opts);
  }
  (function(createAgent2) {
    class Agent extends events_1.EventEmitter {
      constructor(callback, _opts) {
        super();
        let opts = _opts;
        if (typeof callback === "function") {
          this.callback = callback;
        } else if (callback) {
          opts = callback;
        }
        this.timeout = null;
        if (opts && typeof opts.timeout === "number") {
          this.timeout = opts.timeout;
        }
        this.maxFreeSockets = 1;
        this.maxSockets = 1;
        this.maxTotalSockets = Infinity;
        this.sockets = {};
        this.freeSockets = {};
        this.requests = {};
        this.options = {};
      }
      get defaultPort() {
        if (typeof this.explicitDefaultPort === "number") {
          return this.explicitDefaultPort;
        }
        return isSecureEndpoint() ? 443 : 80;
      }
      set defaultPort(v) {
        this.explicitDefaultPort = v;
      }
      get protocol() {
        if (typeof this.explicitProtocol === "string") {
          return this.explicitProtocol;
        }
        return isSecureEndpoint() ? "https:" : "http:";
      }
      set protocol(v) {
        this.explicitProtocol = v;
      }
      callback(req, opts, fn) {
        throw new Error('"agent-base" has no default implementation, you must subclass and override `callback()`');
      }
      /**
       * Called by node-core's "_http_client.js" module when creating
       * a new HTTP request with this Agent instance.
       *
       * @api public
       */
      addRequest(req, _opts) {
        const opts = Object.assign({}, _opts);
        if (typeof opts.secureEndpoint !== "boolean") {
          opts.secureEndpoint = isSecureEndpoint();
        }
        if (opts.host == null) {
          opts.host = "localhost";
        }
        if (opts.port == null) {
          opts.port = opts.secureEndpoint ? 443 : 80;
        }
        if (opts.protocol == null) {
          opts.protocol = opts.secureEndpoint ? "https:" : "http:";
        }
        if (opts.host && opts.path) {
          delete opts.path;
        }
        delete opts.agent;
        delete opts.hostname;
        delete opts._defaultAgent;
        delete opts.defaultPort;
        delete opts.createConnection;
        req._last = true;
        req.shouldKeepAlive = false;
        let timedOut = false;
        let timeoutId = null;
        const timeoutMs = opts.timeout || this.timeout;
        const onerror = (err) => {
          if (req._hadError)
            return;
          req.emit("error", err);
          req._hadError = true;
        };
        const ontimeout = () => {
          timeoutId = null;
          timedOut = true;
          const err = new Error(`A "socket" was not created for HTTP request before ${timeoutMs}ms`);
          err.code = "ETIMEOUT";
          onerror(err);
        };
        const callbackError = (err) => {
          if (timedOut)
            return;
          if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          onerror(err);
        };
        const onsocket = (socket) => {
          if (timedOut)
            return;
          if (timeoutId != null) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (isAgent(socket)) {
            debug("Callback returned another Agent instance %o", socket.constructor.name);
            socket.addRequest(req, opts);
            return;
          }
          if (socket) {
            socket.once("free", () => {
              this.freeSocket(socket, opts);
            });
            req.onSocket(socket);
            return;
          }
          const err = new Error(`no Duplex stream was returned to agent-base for \`${req.method} ${req.path}\``);
          onerror(err);
        };
        if (typeof this.callback !== "function") {
          onerror(new Error("`callback` is not defined"));
          return;
        }
        if (!this.promisifiedCallback) {
          if (this.callback.length >= 3) {
            debug("Converting legacy callback function to promise");
            this.promisifiedCallback = promisify_1.default(this.callback);
          } else {
            this.promisifiedCallback = this.callback;
          }
        }
        if (typeof timeoutMs === "number" && timeoutMs > 0) {
          timeoutId = setTimeout(ontimeout, timeoutMs);
        }
        if ("port" in opts && typeof opts.port !== "number") {
          opts.port = Number(opts.port);
        }
        try {
          debug("Resolving socket for %o request: %o", opts.protocol, `${req.method} ${req.path}`);
          Promise.resolve(this.promisifiedCallback(req, opts)).then(onsocket, callbackError);
        } catch (err) {
          Promise.reject(err).catch(callbackError);
        }
      }
      freeSocket(socket, opts) {
        debug("Freeing socket %o %o", socket.constructor.name, opts);
        socket.destroy();
      }
      destroy() {
        debug("Destroying agent %o", this.constructor.name);
      }
    }
    createAgent2.Agent = Agent;
    createAgent2.prototype = createAgent2.Agent.prototype;
  })(createAgent || (createAgent = {}));
  src = createAgent;
  return src;
}
var parseProxyResponse = {};
var hasRequiredParseProxyResponse;
function requireParseProxyResponse() {
  if (hasRequiredParseProxyResponse) return parseProxyResponse;
  hasRequiredParseProxyResponse = 1;
  var __importDefault = parseProxyResponse && parseProxyResponse.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  Object.defineProperty(parseProxyResponse, "__esModule", { value: true });
  const debug_12 = __importDefault(requireSrc$1());
  const debug = debug_12.default("https-proxy-agent:parse-proxy-response");
  function parseProxyResponse$1(socket) {
    return new Promise((resolve, reject) => {
      let buffersLength = 0;
      const buffers = [];
      function read() {
        const b = socket.read();
        if (b)
          ondata(b);
        else
          socket.once("readable", read);
      }
      function cleanup() {
        socket.removeListener("end", onend);
        socket.removeListener("error", onerror);
        socket.removeListener("close", onclose);
        socket.removeListener("readable", read);
      }
      function onclose(err) {
        debug("onclose had error %o", err);
      }
      function onend() {
        debug("onend");
      }
      function onerror(err) {
        cleanup();
        debug("onerror %o", err);
        reject(err);
      }
      function ondata(b) {
        buffers.push(b);
        buffersLength += b.length;
        const buffered = Buffer.concat(buffers, buffersLength);
        const endOfHeaders = buffered.indexOf("\r\n\r\n");
        if (endOfHeaders === -1) {
          debug("have not received end of HTTP headers yet...");
          read();
          return;
        }
        const firstLine = buffered.toString("ascii", 0, buffered.indexOf("\r\n"));
        const statusCode = +firstLine.split(" ")[1];
        debug("got proxy server response: %o", firstLine);
        resolve({
          statusCode,
          buffered
        });
      }
      socket.on("error", onerror);
      socket.on("close", onclose);
      socket.on("end", onend);
      read();
    });
  }
  parseProxyResponse.default = parseProxyResponse$1;
  return parseProxyResponse;
}
var hasRequiredAgent;
function requireAgent() {
  if (hasRequiredAgent) return agent;
  hasRequiredAgent = 1;
  var __awaiter = agent && agent.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __importDefault = agent && agent.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  Object.defineProperty(agent, "__esModule", { value: true });
  const net_1 = __importDefault(require$$0$1);
  const tls_1 = __importDefault(require$$1$1);
  const url_1 = __importDefault(url);
  const assert_1 = __importDefault(require$$3);
  const debug_12 = __importDefault(requireSrc$1());
  const agent_base_1 = requireSrc();
  const parse_proxy_response_1 = __importDefault(requireParseProxyResponse());
  const debug = debug_12.default("https-proxy-agent:agent");
  class HttpsProxyAgent2 extends agent_base_1.Agent {
    constructor(_opts) {
      let opts;
      if (typeof _opts === "string") {
        opts = url_1.default.parse(_opts);
      } else {
        opts = _opts;
      }
      if (!opts) {
        throw new Error("an HTTP(S) proxy server `host` and `port` must be specified!");
      }
      debug("creating new HttpsProxyAgent instance: %o", opts);
      super(opts);
      const proxy = Object.assign({}, opts);
      this.secureProxy = opts.secureProxy || isHTTPS(proxy.protocol);
      proxy.host = proxy.hostname || proxy.host;
      if (typeof proxy.port === "string") {
        proxy.port = parseInt(proxy.port, 10);
      }
      if (!proxy.port && proxy.host) {
        proxy.port = this.secureProxy ? 443 : 80;
      }
      if (this.secureProxy && !("ALPNProtocols" in proxy)) {
        proxy.ALPNProtocols = ["http 1.1"];
      }
      if (proxy.host && proxy.path) {
        delete proxy.path;
        delete proxy.pathname;
      }
      this.proxy = proxy;
    }
    /**
     * Called when the node-core HTTP client library is creating a
     * new HTTP request.
     *
     * @api protected
     */
    callback(req, opts) {
      return __awaiter(this, void 0, void 0, function* () {
        const { proxy, secureProxy } = this;
        let socket;
        if (secureProxy) {
          debug("Creating `tls.Socket`: %o", proxy);
          socket = tls_1.default.connect(proxy);
        } else {
          debug("Creating `net.Socket`: %o", proxy);
          socket = net_1.default.connect(proxy);
        }
        const headers = Object.assign({}, proxy.headers);
        const hostname = `${opts.host}:${opts.port}`;
        let payload = `CONNECT ${hostname} HTTP/1.1\r
`;
        if (proxy.auth) {
          headers["Proxy-Authorization"] = `Basic ${Buffer.from(proxy.auth).toString("base64")}`;
        }
        let { host, port, secureEndpoint } = opts;
        if (!isDefaultPort(port, secureEndpoint)) {
          host += `:${port}`;
        }
        headers.Host = host;
        headers.Connection = "close";
        for (const name of Object.keys(headers)) {
          payload += `${name}: ${headers[name]}\r
`;
        }
        const proxyResponsePromise = parse_proxy_response_1.default(socket);
        socket.write(`${payload}\r
`);
        const { statusCode, buffered } = yield proxyResponsePromise;
        if (statusCode === 200) {
          req.once("socket", resume);
          if (opts.secureEndpoint) {
            debug("Upgrading socket connection to TLS");
            const servername = opts.servername || opts.host;
            return tls_1.default.connect(Object.assign(Object.assign({}, omit(opts, "host", "hostname", "path", "port")), {
              socket,
              servername
            }));
          }
          return socket;
        }
        socket.destroy();
        const fakeSocket = new net_1.default.Socket({ writable: false });
        fakeSocket.readable = true;
        req.once("socket", (s) => {
          debug("replaying proxy buffer for failed request");
          assert_1.default(s.listenerCount("data") > 0);
          s.push(buffered);
          s.push(null);
        });
        return fakeSocket;
      });
    }
  }
  agent.default = HttpsProxyAgent2;
  function resume(socket) {
    socket.resume();
  }
  function isDefaultPort(port, secure) {
    return Boolean(!secure && port === 80 || secure && port === 443);
  }
  function isHTTPS(protocol) {
    return typeof protocol === "string" ? /^https:?$/i.test(protocol) : false;
  }
  function omit(obj, ...keys) {
    const ret = {};
    let key;
    for (key in obj) {
      if (!keys.includes(key)) {
        ret[key] = obj[key];
      }
    }
    return ret;
  }
  return agent;
}
var dist;
var hasRequiredDist;
function requireDist() {
  if (hasRequiredDist) return dist;
  hasRequiredDist = 1;
  var __importDefault = dist && dist.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  const agent_1 = __importDefault(requireAgent());
  function createHttpsProxyAgent(opts) {
    return new agent_1.default(opts);
  }
  (function(createHttpsProxyAgent2) {
    createHttpsProxyAgent2.HttpsProxyAgent = agent_1.default;
    createHttpsProxyAgent2.prototype = agent_1.default.prototype;
  })(createHttpsProxyAgent || (createHttpsProxyAgent = {}));
  dist = createHttpsProxyAgent;
  return dist;
}
var distExports = requireDist();
const HttpsProxyAgent = /* @__PURE__ */ getDefaultExportFromCjs(distExports);
var followRedirects$1 = { exports: {} };
var debug_1;
var hasRequiredDebug;
function requireDebug() {
  if (hasRequiredDebug) return debug_1;
  hasRequiredDebug = 1;
  var debug;
  debug_1 = function() {
    if (!debug) {
      try {
        debug = requireSrc$1()("follow-redirects");
      } catch (error) {
      }
      if (typeof debug !== "function") {
        debug = function() {
        };
      }
    }
    debug.apply(null, arguments);
  };
  return debug_1;
}
var hasRequiredFollowRedirects;
function requireFollowRedirects() {
  if (hasRequiredFollowRedirects) return followRedirects$1.exports;
  hasRequiredFollowRedirects = 1;
  var url$1 = url;
  var URL2 = url$1.URL;
  var http$1 = http;
  var https$1 = https;
  var Writable = stream.Writable;
  var assert = require$$3;
  var debug = requireDebug();
  (function detectUnsupportedEnvironment() {
    var looksLikeNode = typeof process !== "undefined";
    var looksLikeBrowser = typeof window !== "undefined" && typeof document !== "undefined";
    var looksLikeV8 = isFunction2(Error.captureStackTrace);
    if (!looksLikeNode && (looksLikeBrowser || !looksLikeV8)) {
      console.warn("The follow-redirects package should be excluded from browser builds.");
    }
  })();
  var useNativeURL = false;
  try {
    assert(new URL2(""));
  } catch (error) {
    useNativeURL = error.code === "ERR_INVALID_URL";
  }
  var sensitiveHeaders = [
    "Authorization",
    "Proxy-Authorization",
    "Cookie"
  ];
  var preservedUrlFields = [
    "auth",
    "host",
    "hostname",
    "href",
    "path",
    "pathname",
    "port",
    "protocol",
    "query",
    "search",
    "hash"
  ];
  var events = ["abort", "aborted", "connect", "error", "socket", "timeout"];
  var eventHandlers = /* @__PURE__ */ Object.create(null);
  events.forEach(function(event) {
    eventHandlers[event] = function(arg1, arg2, arg3) {
      this._redirectable.emit(event, arg1, arg2, arg3);
    };
  });
  var InvalidUrlError = createErrorType(
    "ERR_INVALID_URL",
    "Invalid URL",
    TypeError
  );
  var RedirectionError = createErrorType(
    "ERR_FR_REDIRECTION_FAILURE",
    "Redirected request failed"
  );
  var TooManyRedirectsError = createErrorType(
    "ERR_FR_TOO_MANY_REDIRECTS",
    "Maximum number of redirects exceeded",
    RedirectionError
  );
  var MaxBodyLengthExceededError = createErrorType(
    "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
    "Request body larger than maxBodyLength limit"
  );
  var WriteAfterEndError = createErrorType(
    "ERR_STREAM_WRITE_AFTER_END",
    "write after end"
  );
  var destroy = Writable.prototype.destroy || noop2;
  function RedirectableRequest(options, responseCallback) {
    Writable.call(this);
    this._sanitizeOptions(options);
    this._options = options;
    this._ended = false;
    this._ending = false;
    this._redirectCount = 0;
    this._redirects = [];
    this._requestBodyLength = 0;
    this._requestBodyBuffers = [];
    if (responseCallback) {
      this.on("response", responseCallback);
    }
    var self2 = this;
    this._onNativeResponse = function(response) {
      try {
        self2._processResponse(response);
      } catch (cause) {
        self2.emit("error", cause instanceof RedirectionError ? cause : new RedirectionError({ cause }));
      }
    };
    this._headerFilter = new RegExp("^(?:" + sensitiveHeaders.concat(options.sensitiveHeaders).map(escapeRegex).join("|") + ")$", "i");
    this._performRequest();
  }
  RedirectableRequest.prototype = Object.create(Writable.prototype);
  RedirectableRequest.prototype.abort = function() {
    destroyRequest(this._currentRequest);
    this._currentRequest.abort();
    this.emit("abort");
  };
  RedirectableRequest.prototype.destroy = function(error) {
    destroyRequest(this._currentRequest, error);
    destroy.call(this, error);
    return this;
  };
  RedirectableRequest.prototype.write = function(data, encoding, callback) {
    if (this._ending) {
      throw new WriteAfterEndError();
    }
    if (!isString2(data) && !isBuffer2(data)) {
      throw new TypeError("data should be a string, Buffer or Uint8Array");
    }
    if (isFunction2(encoding)) {
      callback = encoding;
      encoding = null;
    }
    if (data.length === 0) {
      if (callback) {
        callback();
      }
      return;
    }
    if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
      this._requestBodyLength += data.length;
      this._requestBodyBuffers.push({ data, encoding });
      this._currentRequest.write(data, encoding, callback);
    } else {
      this.emit("error", new MaxBodyLengthExceededError());
      this.abort();
    }
  };
  RedirectableRequest.prototype.end = function(data, encoding, callback) {
    if (isFunction2(data)) {
      callback = data;
      data = encoding = null;
    } else if (isFunction2(encoding)) {
      callback = encoding;
      encoding = null;
    }
    if (!data) {
      this._ended = this._ending = true;
      this._currentRequest.end(null, null, callback);
    } else {
      var self2 = this;
      var currentRequest = this._currentRequest;
      this.write(data, encoding, function() {
        self2._ended = true;
        currentRequest.end(null, null, callback);
      });
      this._ending = true;
    }
  };
  RedirectableRequest.prototype.setHeader = function(name, value) {
    this._options.headers[name] = value;
    this._currentRequest.setHeader(name, value);
  };
  RedirectableRequest.prototype.removeHeader = function(name) {
    delete this._options.headers[name];
    this._currentRequest.removeHeader(name);
  };
  RedirectableRequest.prototype.setTimeout = function(msecs, callback) {
    var self2 = this;
    function destroyOnTimeout(socket) {
      socket.setTimeout(msecs);
      socket.removeListener("timeout", socket.destroy);
      socket.addListener("timeout", socket.destroy);
    }
    function startTimer(socket) {
      if (self2._timeout) {
        clearTimeout(self2._timeout);
      }
      self2._timeout = setTimeout(function() {
        self2.emit("timeout");
        clearTimer();
      }, msecs);
      destroyOnTimeout(socket);
    }
    function clearTimer() {
      if (self2._timeout) {
        clearTimeout(self2._timeout);
        self2._timeout = null;
      }
      self2.removeListener("abort", clearTimer);
      self2.removeListener("error", clearTimer);
      self2.removeListener("response", clearTimer);
      self2.removeListener("close", clearTimer);
      if (callback) {
        self2.removeListener("timeout", callback);
      }
      if (!self2.socket) {
        self2._currentRequest.removeListener("socket", startTimer);
      }
    }
    if (callback) {
      this.on("timeout", callback);
    }
    if (this.socket) {
      startTimer(this.socket);
    } else {
      this._currentRequest.once("socket", startTimer);
    }
    this.on("socket", destroyOnTimeout);
    this.on("abort", clearTimer);
    this.on("error", clearTimer);
    this.on("response", clearTimer);
    this.on("close", clearTimer);
    return this;
  };
  [
    "flushHeaders",
    "getHeader",
    "setNoDelay",
    "setSocketKeepAlive"
  ].forEach(function(method) {
    RedirectableRequest.prototype[method] = function(a, b) {
      return this._currentRequest[method](a, b);
    };
  });
  ["aborted", "connection", "socket"].forEach(function(property) {
    Object.defineProperty(RedirectableRequest.prototype, property, {
      get: function() {
        return this._currentRequest[property];
      }
    });
  });
  RedirectableRequest.prototype._sanitizeOptions = function(options) {
    if (!options.headers) {
      options.headers = {};
    }
    if (!isArray2(options.sensitiveHeaders)) {
      options.sensitiveHeaders = [];
    }
    if (options.host) {
      if (!options.hostname) {
        options.hostname = options.host;
      }
      delete options.host;
    }
    if (!options.pathname && options.path) {
      var searchPos = options.path.indexOf("?");
      if (searchPos < 0) {
        options.pathname = options.path;
      } else {
        options.pathname = options.path.substring(0, searchPos);
        options.search = options.path.substring(searchPos);
      }
    }
  };
  RedirectableRequest.prototype._performRequest = function() {
    var protocol = this._options.protocol;
    var nativeProtocol = this._options.nativeProtocols[protocol];
    if (!nativeProtocol) {
      throw new TypeError("Unsupported protocol " + protocol);
    }
    if (this._options.agents) {
      var scheme = protocol.slice(0, -1);
      this._options.agent = this._options.agents[scheme];
    }
    var request = this._currentRequest = nativeProtocol.request(this._options, this._onNativeResponse);
    request._redirectable = this;
    for (var event of events) {
      request.on(event, eventHandlers[event]);
    }
    this._currentUrl = /^\//.test(this._options.path) ? url$1.format(this._options) : (
      // When making a request to a proxy, […]
      // a client MUST send the target URI in absolute-form […].
      this._options.path
    );
    if (this._isRedirect) {
      var i = 0;
      var self2 = this;
      var buffers = this._requestBodyBuffers;
      (function writeNext(error) {
        if (request === self2._currentRequest) {
          if (error) {
            self2.emit("error", error);
          } else if (i < buffers.length) {
            var buffer = buffers[i++];
            if (!request.finished) {
              request.write(buffer.data, buffer.encoding, writeNext);
            }
          } else if (self2._ended) {
            request.end();
          }
        }
      })();
    }
  };
  RedirectableRequest.prototype._processResponse = function(response) {
    var statusCode = response.statusCode;
    if (this._options.trackRedirects) {
      this._redirects.push({
        url: this._currentUrl,
        headers: response.headers,
        statusCode
      });
    }
    var location = response.headers.location;
    if (!location || this._options.followRedirects === false || statusCode < 300 || statusCode >= 400) {
      response.responseUrl = this._currentUrl;
      response.redirects = this._redirects;
      this.emit("response", response);
      this._requestBodyBuffers = [];
      return;
    }
    destroyRequest(this._currentRequest);
    response.destroy();
    if (++this._redirectCount > this._options.maxRedirects) {
      throw new TooManyRedirectsError();
    }
    var requestHeaders;
    var beforeRedirect = this._options.beforeRedirect;
    if (beforeRedirect) {
      requestHeaders = Object.assign({
        // The Host header was set by nativeProtocol.request
        Host: response.req.getHeader("host")
      }, this._options.headers);
    }
    var method = this._options.method;
    if ((statusCode === 301 || statusCode === 302) && this._options.method === "POST" || // RFC7231§6.4.4: The 303 (See Other) status code indicates that
    // the server is redirecting the user agent to a different resource […]
    // A user agent can perform a retrieval request targeting that URI
    // (a GET or HEAD request if using HTTP) […]
    statusCode === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) {
      this._options.method = "GET";
      this._requestBodyBuffers = [];
      removeMatchingHeaders(/^content-/i, this._options.headers);
    }
    var currentHostHeader = removeMatchingHeaders(/^host$/i, this._options.headers);
    var currentUrlParts = parseUrl2(this._currentUrl);
    var currentHost = currentHostHeader || currentUrlParts.host;
    var currentUrl = /^\w+:/.test(location) ? this._currentUrl : url$1.format(Object.assign(currentUrlParts, { host: currentHost }));
    var redirectUrl = resolveUrl(location, currentUrl);
    debug("redirecting to", redirectUrl.href);
    this._isRedirect = true;
    spreadUrlObject(redirectUrl, this._options);
    if (redirectUrl.protocol !== currentUrlParts.protocol && redirectUrl.protocol !== "https:" || redirectUrl.host !== currentHost && !isSubdomain(redirectUrl.host, currentHost)) {
      removeMatchingHeaders(this._headerFilter, this._options.headers);
    }
    if (isFunction2(beforeRedirect)) {
      var responseDetails = {
        headers: response.headers,
        statusCode
      };
      var requestDetails = {
        url: currentUrl,
        method,
        headers: requestHeaders
      };
      beforeRedirect(this._options, responseDetails, requestDetails);
      this._sanitizeOptions(this._options);
    }
    this._performRequest();
  };
  function wrap(protocols) {
    var exports = {
      maxRedirects: 21,
      maxBodyLength: 10 * 1024 * 1024
    };
    var nativeProtocols = {};
    Object.keys(protocols).forEach(function(scheme) {
      var protocol = scheme + ":";
      var nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
      var wrappedProtocol = exports[scheme] = Object.create(nativeProtocol);
      function request(input, options, callback) {
        if (isURL(input)) {
          input = spreadUrlObject(input);
        } else if (isString2(input)) {
          input = spreadUrlObject(parseUrl2(input));
        } else {
          callback = options;
          options = validateUrl(input);
          input = { protocol };
        }
        if (isFunction2(options)) {
          callback = options;
          options = null;
        }
        options = Object.assign({
          maxRedirects: exports.maxRedirects,
          maxBodyLength: exports.maxBodyLength
        }, input, options);
        options.nativeProtocols = nativeProtocols;
        if (!isString2(options.host) && !isString2(options.hostname)) {
          options.hostname = "::1";
        }
        assert.equal(options.protocol, protocol, "protocol mismatch");
        debug("options", options);
        return new RedirectableRequest(options, callback);
      }
      function get(input, options, callback) {
        var wrappedRequest = wrappedProtocol.request(input, options, callback);
        wrappedRequest.end();
        return wrappedRequest;
      }
      Object.defineProperties(wrappedProtocol, {
        request: { value: request, configurable: true, enumerable: true, writable: true },
        get: { value: get, configurable: true, enumerable: true, writable: true }
      });
    });
    return exports;
  }
  function noop2() {
  }
  function parseUrl2(input) {
    var parsed;
    if (useNativeURL) {
      parsed = new URL2(input);
    } else {
      parsed = validateUrl(url$1.parse(input));
      if (!isString2(parsed.protocol)) {
        throw new InvalidUrlError({ input });
      }
    }
    return parsed;
  }
  function resolveUrl(relative, base) {
    return useNativeURL ? new URL2(relative, base) : parseUrl2(url$1.resolve(base, relative));
  }
  function validateUrl(input) {
    if (/^\[/.test(input.hostname) && !/^\[[:0-9a-f]+\]$/i.test(input.hostname)) {
      throw new InvalidUrlError({ input: input.href || input });
    }
    if (/^\[/.test(input.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(input.host)) {
      throw new InvalidUrlError({ input: input.href || input });
    }
    return input;
  }
  function spreadUrlObject(urlObject, target) {
    var spread2 = target || {};
    for (var key of preservedUrlFields) {
      spread2[key] = urlObject[key];
    }
    if (spread2.hostname.startsWith("[")) {
      spread2.hostname = spread2.hostname.slice(1, -1);
    }
    if (spread2.port !== "") {
      spread2.port = Number(spread2.port);
    }
    spread2.path = spread2.search ? spread2.pathname + spread2.search : spread2.pathname;
    return spread2;
  }
  function removeMatchingHeaders(regex, headers) {
    var lastValue;
    for (var header in headers) {
      if (regex.test(header)) {
        lastValue = headers[header];
        delete headers[header];
      }
    }
    return lastValue === null || typeof lastValue === "undefined" ? void 0 : String(lastValue).trim();
  }
  function createErrorType(code, message, baseClass) {
    function CustomError(properties) {
      if (isFunction2(Error.captureStackTrace)) {
        Error.captureStackTrace(this, this.constructor);
      }
      Object.assign(this, properties || {});
      this.code = code;
      this.message = this.cause ? message + ": " + this.cause.message : message;
    }
    CustomError.prototype = new (baseClass || Error)();
    Object.defineProperties(CustomError.prototype, {
      constructor: {
        value: CustomError,
        enumerable: false
      },
      name: {
        value: "Error [" + code + "]",
        enumerable: false
      }
    });
    return CustomError;
  }
  function destroyRequest(request, error) {
    for (var event of events) {
      request.removeListener(event, eventHandlers[event]);
    }
    request.on("error", noop2);
    request.destroy(error);
  }
  function isSubdomain(subdomain, domain) {
    assert(isString2(subdomain) && isString2(domain));
    var dot = subdomain.length - domain.length - 1;
    return dot > 0 && subdomain[dot] === "." && subdomain.endsWith(domain);
  }
  function isArray2(value) {
    return value instanceof Array;
  }
  function isString2(value) {
    return typeof value === "string" || value instanceof String;
  }
  function isFunction2(value) {
    return typeof value === "function";
  }
  function isBuffer2(value) {
    return typeof value === "object" && "length" in value;
  }
  function isURL(value) {
    return URL2 && value instanceof URL2;
  }
  function escapeRegex(regex) {
    return regex.replace(/[\]\\/()*+?.$]/g, "\\$&");
  }
  followRedirects$1.exports = wrap({ http: http$1, https: https$1 });
  followRedirects$1.exports.wrap = wrap;
  return followRedirects$1.exports;
}
var followRedirectsExports = requireFollowRedirects();
const followRedirects = /* @__PURE__ */ getDefaultExportFromCjs(followRedirectsExports);
const VERSION$1 = "1.20.0";
function parseProtocol(url2) {
  const match = /^([-+\w]{1,25}):(?:\/\/)?/.exec(url2);
  return match && match[1] || "";
}
const DATA_URL_PATTERN = /^([^,;/]+\/[^,;/]+)?((?:;[^,;=]+=[^,;]+)*)(;base64)?,([\s\S]*)$/;
function fromDataURI(uri, asBlob, options) {
  const _Blob = options && options.Blob || platform.classes.Blob;
  const protocol = parseProtocol(uri);
  if (asBlob === void 0 && _Blob) {
    asBlob = true;
  }
  if (protocol === "data") {
    uri = protocol.length ? uri.slice(protocol.length + 1) : uri;
    const match = DATA_URL_PATTERN.exec(uri);
    if (!match) {
      throw new AxiosError$1("Invalid URL", AxiosError$1.ERR_INVALID_URL);
    }
    const type = match[1];
    const params = match[2];
    const encoding = match[3] ? "base64" : "utf8";
    const body = match[4];
    let mime = "";
    if (type) {
      mime = params ? type + params : type;
    } else if (params) {
      mime = "text/plain" + params;
    }
    const buffer = encoding === "base64" ? Buffer.from(body, "base64") : Buffer.from(decodeURIComponent(body), encoding);
    if (asBlob) {
      if (!_Blob) {
        throw new AxiosError$1("Blob is not supported", AxiosError$1.ERR_NOT_SUPPORT);
      }
      return new _Blob([buffer], { type: mime });
    }
    return buffer;
  }
  throw new AxiosError$1("Unsupported protocol " + protocol, AxiosError$1.ERR_NOT_SUPPORT);
}
const FORM_DATA_CONTENT_HEADERS = ["content-type", "content-length"];
function setFormDataHeaders(headers, formHeaders, policy) {
  if (policy !== "content-only") {
    headers.set(formHeaders);
    return;
  }
  Object.entries(formHeaders || {}).forEach(([key, val]) => {
    if (FORM_DATA_CONTENT_HEADERS.includes(key.toLowerCase())) {
      headers.set(key, val);
    }
  });
}
const kInternals = Symbol("internals");
class AxiosTransformStream extends stream.Transform {
  constructor(options) {
    options = utils$1.toFlatObject(
      options,
      {
        maxRate: 0,
        chunkSize: 64 * 1024,
        minChunkSize: 100,
        timeWindow: 500,
        ticksRate: 2,
        samplesCount: 15
      },
      null,
      (prop, source) => {
        return !utils$1.isUndefined(source[prop]);
      }
    );
    super({
      readableHighWaterMark: options.chunkSize
    });
    const internals = this[kInternals] = {
      timeWindow: options.timeWindow,
      chunkSize: options.chunkSize,
      maxRate: options.maxRate,
      minChunkSize: options.minChunkSize,
      bytesSeen: 0,
      isCaptured: false,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    };
    this.on("newListener", (event) => {
      if (event === "progress") {
        if (!internals.isCaptured) {
          internals.isCaptured = true;
        }
      }
    });
  }
  _read(size) {
    const internals = this[kInternals];
    if (internals.onReadCallback) {
      internals.onReadCallback();
    }
    return super._read(size);
  }
  _transform(chunk, encoding, callback) {
    const internals = this[kInternals];
    const maxRate = internals.maxRate;
    const readableHighWaterMark = this.readableHighWaterMark;
    const timeWindow = internals.timeWindow;
    const divider = 1e3 / timeWindow;
    const bytesThreshold = maxRate / divider;
    const minChunkSize = internals.minChunkSize !== false ? Math.max(internals.minChunkSize, bytesThreshold * 0.01) : 0;
    const pushChunk = (_chunk, _callback) => {
      const bytes = Buffer.byteLength(_chunk);
      internals.bytesSeen += bytes;
      internals.bytes += bytes;
      internals.isCaptured && this.emit("progress", internals.bytesSeen);
      if (this.push(_chunk)) {
        process.nextTick(_callback);
      } else {
        internals.onReadCallback = () => {
          internals.onReadCallback = null;
          process.nextTick(_callback);
        };
      }
    };
    const transformChunk = (_chunk, _callback) => {
      const chunkSize = Buffer.byteLength(_chunk);
      let chunkRemainder = null;
      let maxChunkSize = readableHighWaterMark;
      let bytesLeft;
      let passed = 0;
      if (maxRate) {
        const now = Date.now();
        if (!internals.ts || (passed = now - internals.ts) >= timeWindow) {
          internals.ts = now;
          bytesLeft = bytesThreshold - internals.bytes;
          internals.bytes = bytesLeft < 0 ? -bytesLeft : 0;
          passed = 0;
        }
        bytesLeft = bytesThreshold - internals.bytes;
      }
      if (maxRate) {
        if (bytesLeft <= 0) {
          return setTimeout(() => {
            _callback(null, _chunk);
          }, timeWindow - passed);
        }
        if (bytesLeft < maxChunkSize) {
          maxChunkSize = bytesLeft;
        }
      }
      if (maxChunkSize && chunkSize > maxChunkSize && chunkSize - maxChunkSize > minChunkSize) {
        chunkRemainder = _chunk.subarray(maxChunkSize);
        _chunk = _chunk.subarray(0, maxChunkSize);
      }
      pushChunk(
        _chunk,
        chunkRemainder ? () => {
          process.nextTick(_callback, null, chunkRemainder);
        } : _callback
      );
    };
    transformChunk(chunk, function transformNextChunk(err, _chunk) {
      if (err) {
        return callback(err);
      }
      if (_chunk) {
        transformChunk(_chunk, transformNextChunk);
      } else {
        callback(null);
      }
    });
  }
}
const { asyncIterator } = Symbol;
const readBlob = async function* (blob) {
  if (blob.stream) {
    yield* blob.stream();
  } else if (blob.arrayBuffer) {
    yield await blob.arrayBuffer();
  } else if (blob[asyncIterator]) {
    yield* blob[asyncIterator]();
  } else {
    yield blob;
  }
};
const BOUNDARY_ALPHABET = platform.ALPHABET.ALPHA_DIGIT + "-_";
const textEncoder = typeof TextEncoder === "function" ? new TextEncoder() : new util.TextEncoder();
const CRLF = "\r\n";
const CRLF_BYTES = textEncoder.encode(CRLF);
const CRLF_BYTES_COUNT = 2;
class FormDataPart {
  constructor(name, value) {
    const { escapeName } = this.constructor;
    const isStringValue = utils$1.isString(value);
    let headers = `Content-Disposition: form-data; name="${escapeName(name)}"${!isStringValue && value.name ? `; filename="${escapeName(value.name)}"` : ""}${CRLF}`;
    if (isStringValue) {
      value = textEncoder.encode(String(value).replace(/\r?\n|\r\n?/g, CRLF));
    } else {
      const safeType = String(value.type || "application/octet-stream").replace(/[\r\n]/g, "");
      headers += `Content-Type: ${safeType}${CRLF}`;
    }
    this.headers = textEncoder.encode(headers + CRLF);
    this.contentLength = isStringValue ? value.byteLength : value.size;
    this.size = this.headers.byteLength + this.contentLength + CRLF_BYTES_COUNT;
    this.name = name;
    this.value = value;
  }
  async *encode() {
    yield this.headers;
    const { value } = this;
    if (utils$1.isTypedArray(value)) {
      yield value;
    } else {
      yield* readBlob(value);
    }
    yield CRLF_BYTES;
  }
  static escapeName(name) {
    return String(name).replace(
      /[\r\n"]/g,
      (match) => ({
        "\r": "%0D",
        "\n": "%0A",
        '"': "%22"
      })[match]
    );
  }
}
const formDataToStream = (form, headersHandler, options) => {
  const {
    tag = "form-data-boundary",
    size = 25,
    boundary = tag + "-" + platform.generateString(size, BOUNDARY_ALPHABET)
  } = options || {};
  if (!utils$1.isFormData(form)) {
    throw new TypeError("FormData instance required");
  }
  if (boundary.length < 1 || boundary.length > 70) {
    throw new Error("boundary must be 1-70 characters long");
  }
  const boundaryBytes = textEncoder.encode("--" + boundary + CRLF);
  const footerBytes = textEncoder.encode("--" + boundary + "--" + CRLF);
  let contentLength = footerBytes.byteLength;
  const parts = Array.from(form.entries()).map(([name, value]) => {
    const part = new FormDataPart(name, value);
    contentLength += part.size;
    return part;
  });
  contentLength += boundaryBytes.byteLength * parts.length;
  contentLength = utils$1.toFiniteNumber(contentLength);
  const computedHeaders = {
    "Content-Type": `multipart/form-data; boundary=${boundary}`
  };
  if (Number.isFinite(contentLength)) {
    computedHeaders["Content-Length"] = contentLength;
  }
  headersHandler && headersHandler(computedHeaders);
  return stream.Readable.from(
    (async function* () {
      for (const part of parts) {
        yield boundaryBytes;
        yield* part.encode();
      }
      yield footerBytes;
    })()
  );
};
class ZlibHeaderTransformStream extends stream.Transform {
  __transform(chunk, encoding, callback) {
    this.push(chunk);
    callback();
  }
  _transform(chunk, encoding, callback) {
    if (chunk.length !== 0) {
      this._transform = this.__transform;
      if (chunk[0] !== 120) {
        const header = Buffer.alloc(2);
        header[0] = 120;
        header[1] = 156;
        this.push(header, encoding);
      }
    }
    this.__transform(chunk, encoding, callback);
  }
}
class Http2Sessions {
  constructor() {
    this.sessions = /* @__PURE__ */ Object.create(null);
  }
  getSession(authority, options) {
    options = Object.assign(
      /* @__PURE__ */ Object.create(null),
      {
        sessionTimeout: 1e3
      },
      options
    );
    let authoritySessions = this.sessions[authority];
    if (authoritySessions) {
      let len = authoritySessions.length;
      for (let i = 0; i < len; i++) {
        const [sessionHandle, sessionOptions] = authoritySessions[i];
        if (!sessionHandle.destroyed && !sessionHandle.closed && util.isDeepStrictEqual(sessionOptions, options)) {
          return sessionHandle;
        }
      }
    }
    const session = http2.connect(authority, options);
    let removed;
    let timer;
    const removeSession = () => {
      if (removed) {
        return;
      }
      removed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      let entries = authoritySessions, len = entries.length, i = len;
      while (i--) {
        if (entries[i][0] === session) {
          if (len === 1) {
            delete this.sessions[authority];
          } else {
            entries.splice(i, 1);
          }
          if (!session.closed) {
            session.close();
          }
          return;
        }
      }
    };
    const originalRequestFn = session.request;
    const { sessionTimeout } = options;
    if (sessionTimeout != null) {
      let streamsCount = 0;
      session.request = function() {
        const stream2 = originalRequestFn.apply(this, arguments);
        streamsCount++;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        stream2.once("close", () => {
          if (!--streamsCount) {
            timer = setTimeout(() => {
              timer = null;
              removeSession();
            }, sessionTimeout);
          }
        });
        return stream2;
      };
    }
    session.once("close", removeSession);
    session.once("error", removeSession);
    let entry = [session, options];
    authoritySessions ? authoritySessions.push(entry) : authoritySessions = this.sessions[authority] = [entry];
    return session;
  }
}
const callbackify = (fn, reducer) => {
  return utils$1.isAsyncFn(fn) ? function(...args) {
    const cb = args.pop();
    fn.apply(this, args).then((value) => {
      try {
        reducer ? cb(null, ...reducer(value)) : cb(null, value);
      } catch (err) {
        cb(err);
      }
    }, cb);
  } : fn;
};
const LOOPBACK_HOSTNAMES = /* @__PURE__ */ new Set(["localhost", "0.0.0.0"]);
const trimTrailingDots = (value) => {
  let end = value.length;
  while (end && value.charCodeAt(end - 1) === 46) {
    end--;
  }
  return end === value.length ? value : value.slice(0, end);
};
const isIPv4Loopback = (host) => {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  if (parts[0] !== "127") return false;
  return parts.every((p) => /^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
};
const parseIPv4Octet = (text) => {
  if (/^0[xX][0-9a-fA-F]+$/.test(text)) {
    const n = parseInt(text.slice(2), 16);
    return Number.isFinite(n) ? n : null;
  }
  if (text.length > 1 && /^0[0-7]+$/.test(text)) {
    const n = parseInt(text, 8);
    return Number.isFinite(n) ? n : null;
  }
  if (text.length > 1 && /^0[0-9]+$/.test(text)) {
    return null;
  }
  if (/^[0-9]+$/.test(text)) {
    const n = parseInt(text, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
const normalizeIPAddress = (host) => {
  if (typeof host !== "string" || !host || host.indexOf(":") !== -1) {
    return host;
  }
  let h = host;
  if (h.charAt(0) === "[" && h.charAt(h.length - 1) === "]") {
    h = h.slice(1, -1);
  }
  h = trimTrailingDots(h);
  if (!/^[0-9.xXa-fA-F]+$/.test(h)) return host;
  const parts = h.split(".");
  if (parts.some((p) => p === "")) return host;
  if (parts.length === 4) {
    const octets = parts.map(parseIPv4Octet);
    if (octets.some((n) => n === null || n < 0 || n > 255)) return host;
    return octets.join(".");
  }
  if (parts.length > 4) {
    return host;
  }
  if (parts.length === 1) return host;
  const literalOctets = parts.slice(0, -1);
  const tail = parts[parts.length - 1];
  const tailSlots = 4 - literalOctets.length;
  const tailValue = parseIPv4Octet(tail);
  if (tailValue === null) return host;
  const maxTail = (1 << 8 * tailSlots) - 1;
  if (tailValue < 0 || tailValue > maxTail) return host;
  const tailOctets = new Array(tailSlots).fill(0);
  for (let i = tailSlots - 1, v = tailValue; i >= 0; i--, v >>= 8) {
    tailOctets[i] = v & 255;
  }
  const literal = literalOctets.map(parseIPv4Octet);
  if (literal.some((n) => n === null || n < 0 || n > 255)) return host;
  return [...literal, ...tailOctets].join(".");
};
const isIPv6ZeroGroup = (group) => /^0{1,4}$/.test(group);
const isIPv6Unspecified = (host) => {
  if (host === "::") return true;
  const compressionIndex = host.indexOf("::");
  if (compressionIndex !== -1) {
    if (compressionIndex !== host.lastIndexOf("::")) return false;
    const left = host.slice(0, compressionIndex);
    const right = host.slice(compressionIndex + 2);
    const leftGroups = left ? left.split(":") : [];
    const rightGroups = right ? right.split(":") : [];
    const explicitGroups = leftGroups.length + rightGroups.length;
    return explicitGroups < 8 && leftGroups.every(isIPv6ZeroGroup) && rightGroups.every(isIPv6ZeroGroup);
  }
  const groups = host.split(":");
  return groups.length === 8 && groups.every(isIPv6ZeroGroup);
};
const isIPv6Loopback = (host) => {
  if (host === "::1") return true;
  const v4MappedDotted = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4MappedDotted) return isIPv4Loopback(v4MappedDotted[1]);
  const v4MappedHex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (v4MappedHex) {
    const high = parseInt(v4MappedHex[1], 16);
    return high >= 32512 && high <= 32767;
  }
  const groups = host.split(":");
  if (groups.length === 8) {
    for (let i = 0; i < 7; i++) {
      if (!/^0+$/.test(groups[i])) return false;
    }
    return /^0*1$/.test(groups[7]);
  }
  return false;
};
const isLoopback = (host) => {
  if (!host) return false;
  if (LOOPBACK_HOSTNAMES.has(host)) return true;
  if (isIPv4Loopback(host)) return true;
  if (isIPv6Unspecified(host)) return true;
  return isIPv6Loopback(host);
};
const DEFAULT_PORTS = {
  http: 80,
  https: 443,
  ws: 80,
  wss: 443,
  ftp: 21
};
const parseNoProxyEntry = (entry) => {
  let entryHost = entry;
  let entryPort = 0;
  if (entryHost.charAt(0) === "[") {
    const bracketIndex = entryHost.indexOf("]");
    if (bracketIndex !== -1) {
      const host = entryHost.slice(1, bracketIndex);
      const rest = entryHost.slice(bracketIndex + 1);
      if (rest.charAt(0) === ":" && /^\d+$/.test(rest.slice(1))) {
        entryPort = Number.parseInt(rest.slice(1), 10);
      }
      return [host, entryPort];
    }
  }
  const firstColon = entryHost.indexOf(":");
  const lastColon = entryHost.lastIndexOf(":");
  if (firstColon !== -1 && firstColon === lastColon && /^\d+$/.test(entryHost.slice(lastColon + 1))) {
    entryPort = Number.parseInt(entryHost.slice(lastColon + 1), 10);
    entryHost = entryHost.slice(0, lastColon);
  }
  return [entryHost, entryPort];
};
const IPV4_MAPPED_DOTTED_RE = /^(?:::|(?:0{1,4}:){1,4}:|(?:0{1,4}:){5})ffff:(\d+\.\d+\.\d+\.\d+)$/i;
const IPV4_MAPPED_HEX_RE = /^(?:::|(?:0{1,4}:){1,4}:|(?:0{1,4}:){5})ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i;
const unmapIPv4MappedIPv6 = (host) => {
  if (typeof host !== "string" || host.indexOf(":") === -1) return host;
  const dotted = host.match(IPV4_MAPPED_DOTTED_RE);
  if (dotted) return dotted[1];
  const hex = host.match(IPV4_MAPPED_HEX_RE);
  if (hex) {
    const high = parseInt(hex[1], 16);
    const low = parseInt(hex[2], 16);
    return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
  }
  return host;
};
const IPV4_OCTET_RE = /^(?:0|[1-9]\d{0,2})$/;
const ipv4ToBytes = (host) => {
  const parts = host.split(".");
  return parts.length === 4 && parts.every((part) => IPV4_OCTET_RE.test(part) && Number(part) <= 255) ? parts.map(Number) : null;
};
const IPV6_GROUP_RE = /^[0-9a-f]{1,4}$/i;
const ipv6ToBytes = (host) => {
  const halves = host.split("::");
  if (halves.length > 2) {
    return null;
  }
  const groups = halves[0] ? halves[0].split(":") : [];
  if (halves.length === 2) {
    const rear = halves[1] ? halves[1].split(":") : [];
    const missing = 8 - groups.length - rear.length;
    if (missing < 1) {
      return null;
    }
    groups.push(...new Array(missing).fill("0"), ...rear);
  }
  if (groups.length !== 8 || groups.some((group) => !IPV6_GROUP_RE.test(group))) {
    return null;
  }
  return groups.flatMap((group) => {
    const value = Number.parseInt(group, 16);
    return [value >> 8 & 255, value & 255];
  });
};
const ipToBytes = (host) => {
  if (typeof host !== "string" || !host) {
    return null;
  }
  return host.indexOf(":") !== -1 ? ipv6ToBytes(host) : ipv4ToBytes(host);
};
const normalizeNoProxyHost = (hostname) => {
  if (!hostname) {
    return hostname;
  }
  if (hostname.charAt(0) === "[" && hostname.charAt(hostname.length - 1) === "]") {
    hostname = hostname.slice(1, -1);
  }
  const trimmed = trimTrailingDots(hostname);
  const ipv4 = normalizeIPAddress(trimmed);
  if (ipv4 !== trimmed) {
    return ipv4;
  }
  return unmapIPv4MappedIPv6(trimmed);
};
const normalizeCidrBase = (input) => {
  let base = input;
  const startsBracket = base.charAt(0) === "[";
  const endsBracket = base.charAt(base.length - 1) === "]";
  const hasBracket = base.includes("[") || base.includes("]");
  if (startsBracket || endsBracket) {
    if (!startsBracket || !endsBracket) {
      return null;
    }
    base = base.slice(1, -1);
    if (base.indexOf(":") === -1 || base.includes("[") || base.includes("]")) {
      return null;
    }
  } else if (hasBracket) {
    return null;
  }
  if (!base || base.charAt(base.length - 1) === ".") {
    return null;
  }
  const wasIPv6 = base.indexOf(":") !== -1;
  if (wasIPv6) {
    try {
      base = new URL(`http://[${base}]/`).hostname.slice(1, -1);
    } catch (_err) {
      return null;
    }
  } else {
    base = normalizeIPAddress(base);
    if (!ipv4ToBytes(base)) {
      return null;
    }
  }
  return { normalized: unmapIPv4MappedIPv6(base), wasIPv6 };
};
const CIDR_ENTRY_RE = /^(.+)\/(0|[1-9]\d{0,2})$/;
const parseCidrEntry = (entry) => {
  if (entry.indexOf("/") === -1) {
    return void 0;
  }
  const match = CIDR_ENTRY_RE.exec(entry);
  if (!match) {
    return null;
  }
  let prefix = Number(match[2]);
  const parsedBase = normalizeCidrBase(match[1]);
  if (!parsedBase) {
    return null;
  }
  const { normalized, wasIPv6 } = parsedBase;
  if (wasIPv6 && normalized.indexOf(":") === -1) {
    if (prefix < 96) {
      return null;
    }
    prefix -= 96;
  }
  const bytes = ipToBytes(normalized);
  if (!bytes || prefix > bytes.length * 8) {
    return null;
  }
  return { bytes, prefix };
};
const isInSubnet = (addressBytes, networkBytes, prefix) => {
  const fullBytes = prefix >> 3;
  for (let i = 0; i < fullBytes; i++) {
    if (addressBytes[i] !== networkBytes[i]) {
      return false;
    }
  }
  const remainingBits = prefix & 7;
  if (remainingBits) {
    const mask = 255 << 8 - remainingBits & 255;
    if ((addressBytes[fullBytes] & mask) !== (networkBytes[fullBytes] & mask)) {
      return false;
    }
  }
  return true;
};
function shouldBypassProxy(location) {
  let parsed;
  try {
    parsed = new URL(location);
  } catch (_err) {
    return false;
  }
  const noProxy = (process.env.no_proxy || process.env.NO_PROXY || "").toLowerCase();
  if (!noProxy) {
    return false;
  }
  if (noProxy === "*") {
    return true;
  }
  const port = Number.parseInt(parsed.port, 10) || DEFAULT_PORTS[parsed.protocol.split(":", 1)[0]] || 0;
  const hostname = normalizeNoProxyHost(parsed.hostname.toLowerCase());
  const hostnameBytes = ipToBytes(hostname);
  return noProxy.split(/[\s,]+/).some((entry) => {
    if (!entry) {
      return false;
    }
    if (entry === "*") {
      return true;
    }
    const cidr = parseCidrEntry(entry);
    if (cidr !== void 0) {
      return cidr !== null && !!hostnameBytes && hostnameBytes.length === cidr.bytes.length && isInSubnet(hostnameBytes, cidr.bytes, cidr.prefix);
    }
    let [entryHost, entryPort] = parseNoProxyEntry(entry);
    entryHost = normalizeNoProxyHost(entryHost);
    if (!entryHost) {
      return false;
    }
    if (entryPort && entryPort !== port) {
      return false;
    }
    if (entryHost.charAt(0) === "*") {
      entryHost = entryHost.slice(1);
    }
    if (entryHost.charAt(0) === ".") {
      return hostname.endsWith(entryHost);
    }
    return hostname === entryHost || isLoopback(hostname) && isLoopback(entryHost);
  });
}
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;
  min = min !== void 0 ? min : 1e3;
  return function push(chunkLength) {
    const now = Date.now();
    const startedAt = timestamps[tail];
    if (!firstSampleTS) {
      firstSampleTS = now;
    }
    bytes[head] = chunkLength;
    timestamps[head] = now;
    let i = tail;
    let bytesCount = 0;
    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }
    head = (head + 1) % samplesCount;
    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }
    if (now - firstSampleTS < min) {
      return;
    }
    const passed = startedAt && now - startedAt;
    return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
  };
}
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1e3 / freq;
  let lastArgs;
  let timer;
  const invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn(...args);
  };
  const throttled = (...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if (passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  };
  const flush = () => lastArgs && invoke(lastArgs);
  const flushWith = (...args) => invoke(args);
  return [throttled, flush, flushWith];
}
const progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = speedometer(50, 250);
  return throttle((e) => {
    if (!e || !utils$1.isNumber(e.loaded)) {
      return;
    }
    const rawLoaded = e.loaded;
    const total = e.lengthComputable ? e.total : void 0;
    const loaded = Math.max(0, total != null ? Math.min(rawLoaded, total) : rawLoaded);
    const progressBytes = Math.max(0, loaded - bytesNotified);
    const rate = _speedometer(progressBytes);
    bytesNotified = Math.max(bytesNotified, loaded);
    const data = {
      loaded,
      total,
      progress: total ? loaded / total : void 0,
      bytes: progressBytes,
      rate: rate ? rate : void 0,
      estimated: rate && total ? (total - loaded) / rate : void 0,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? "download" : "upload"]: true
    };
    listener(data);
  }, freq);
};
const progressEventDecorator = (total, throttled) => {
  const lengthComputable = total != null;
  return [
    (loaded) => throttled[0]({
      lengthComputable,
      total,
      loaded
    }),
    throttled[1]
  ];
};
const asyncDecorator = (fn, scheduler = utils$1.asap) => (...args) => scheduler(() => fn(...args));
const isHexDigit = (charCode) => charCode >= 48 && charCode <= 57 || charCode >= 65 && charCode <= 70 || charCode >= 97 && charCode <= 102;
const isPercentEncodedByte = (str, i, len) => i + 2 < len && isHexDigit(str.charCodeAt(i + 1)) && isHexDigit(str.charCodeAt(i + 2));
const hexValue = (charCode) => charCode <= 57 ? charCode - 48 : (charCode & 223) - 55;
const isBase64Char = (charCode) => charCode >= 65 && charCode <= 90 || // A-Z
charCode >= 97 && charCode <= 122 || // a-z
charCode >= 48 && charCode <= 57 || // 0-9
charCode === 43 || // +
charCode === 47 || // /
charCode === 45 || // - (base64url)
charCode === 95;
const isBase64Whitespace = (charCode) => charCode === 9 || charCode === 10 || charCode === 12 || charCode === 13 || charCode === 32;
const base64Bytes = (significant) => {
  const groups = Math.floor(significant / 4);
  const remainder = significant % 4;
  return groups * 3 + (remainder === 2 ? 1 : remainder === 3 ? 2 : 0);
};
const estimateBase64BufferAllocation = (body) => {
  const len = body.length;
  let padding = 0;
  if (len > 0 && body.charCodeAt(len - 1) === 61) {
    padding++;
    if (len > 1 && body.charCodeAt(len - 2) === 61) {
      padding++;
    }
  }
  return Math.floor((len - padding) * 3 / 4);
};
const estimatePercentDecodedBase64Bytes = (body) => {
  const len = body.length;
  let significant = 0;
  let padding = 0;
  let invalid = false;
  for (let i = 0; i < len; i++) {
    let code = body.charCodeAt(i);
    if (code === 37 && isPercentEncodedByte(body, i, len)) {
      code = hexValue(body.charCodeAt(i + 1)) * 16 + hexValue(body.charCodeAt(i + 2));
      i += 2;
    }
    if (isBase64Whitespace(code)) {
      continue;
    }
    if (code === 61) {
      padding++;
      continue;
    }
    if (!isBase64Char(code) || padding > 0) {
      invalid = true;
      continue;
    }
    significant++;
  }
  if (invalid || padding > 2 || padding > 0 && (significant + padding) % 4 !== 0 || significant % 4 === 1) {
    return estimateBase64BufferAllocation(body);
  }
  return base64Bytes(significant);
};
const estimateDataURLBytes = (url2, estimateBase64) => {
  if (!url2 || typeof url2 !== "string") return 0;
  if (!url2.startsWith("data:")) return 0;
  const comma = url2.indexOf(",");
  if (comma < 0) return 0;
  const meta = url2.slice(5, comma);
  const body = url2.slice(comma + 1);
  const isBase64 = /;base64/i.test(meta);
  if (isBase64) {
    return estimateBase64(body);
  }
  let bytes = 0;
  for (let i = 0, len = body.length; i < len; i++) {
    const c = body.charCodeAt(i);
    if (c === 37 && isPercentEncodedByte(body, i, len)) {
      bytes += 1;
      i += 2;
    } else if (c < 128) {
      bytes += 1;
    } else if (c < 2048) {
      bytes += 2;
    } else if (c >= 55296 && c <= 56319 && i + 1 < len) {
      const next = body.charCodeAt(i + 1);
      if (next >= 56320 && next <= 57343) {
        bytes += 4;
        i++;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
};
function estimateDataURLDecodedBytes(url2) {
  const fragmentIndex = typeof url2 === "string" ? url2.indexOf("#") : -1;
  return estimateDataURLBytes(
    fragmentIndex === -1 ? url2 : url2.slice(0, fragmentIndex),
    estimatePercentDecodedBase64Bytes
  );
}
function estimateDataURLBufferAllocation(url2) {
  return estimateDataURLBytes(url2, estimateBase64BufferAllocation);
}
const zlibOptions = {
  flush: zlib.constants.Z_SYNC_FLUSH,
  finishFlush: zlib.constants.Z_SYNC_FLUSH
};
const brotliOptions = {
  flush: zlib.constants.BROTLI_OPERATION_FLUSH,
  finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH
};
const zstdOptions = {
  flush: zlib.constants.ZSTD_e_flush,
  finishFlush: zlib.constants.ZSTD_e_flush
};
const isBrotliSupported = utils$1.isFunction(zlib.createBrotliDecompress);
const isZstdSupported = utils$1.isFunction(zlib.createZstdDecompress);
const ACCEPT_ENCODING = "gzip, compress, deflate" + (isBrotliSupported ? ", br" : "");
const ACCEPT_ENCODING_WITH_ZSTD = ACCEPT_ENCODING + (isZstdSupported ? ", zstd" : "");
const scheduleProgress = typeof process !== "undefined" && process.nextTick ? process.nextTick.bind(process) : utils$1.asap;
const { http: httpFollow, https: httpsFollow } = followRedirects;
const isHttps = /https:?/;
const kAxiosSocketListener = Symbol("axios.http.socketListener");
const kAxiosCurrentReq = Symbol("axios.http.currentReq");
function handleSocketError(err) {
  const current = this[kAxiosCurrentReq];
  if (current && !current.destroyed) {
    current.destroy(err);
  }
}
const kAxiosInstalledTunnel = Symbol("axios.http.installedTunnel");
const tunnelingAgentCache = /* @__PURE__ */ new Map();
const tunnelingAgentCacheUser = /* @__PURE__ */ new WeakMap();
const NODE_NATIVE_ENV_PROXY_SUPPORT = {
  22: 21,
  24: 5
};
function isNodeNativeEnvProxySupported(nodeVersion = process.versions && process.versions.node) {
  if (!nodeVersion) {
    return false;
  }
  const [major, minor] = nodeVersion.split(".").map((part) => Number(part));
  if (!Number.isInteger(major) || !Number.isInteger(minor)) {
    return false;
  }
  if (major > 24) {
    return true;
  }
  return NODE_NATIVE_ENV_PROXY_SUPPORT[major] != null && minor >= NODE_NATIVE_ENV_PROXY_SUPPORT[major];
}
function isNodeEnvProxyEnabled(agent2, nodeVersion = process.versions && process.versions.node) {
  if (!isNodeNativeEnvProxySupported(nodeVersion)) {
    return false;
  }
  const agentOptions = agent2 && agent2.options;
  return Boolean(
    agentOptions && utils$1.hasOwnProp(agentOptions, "proxyEnv") && agentOptions.proxyEnv != null
  );
}
function getProxyEnvAgent(options, configHttpAgent, configHttpsAgent) {
  return isHttps.test(options.protocol) ? configHttpsAgent || https.globalAgent : configHttpAgent || http.globalAgent;
}
function getTunnelingAgent(agentOptions, userHttpsAgent) {
  const key = agentOptions.protocol + "//" + agentOptions.hostname + ":" + (agentOptions.port || "") + "#" + (agentOptions.auth || "");
  const cache = userHttpsAgent ? tunnelingAgentCacheUser.get(userHttpsAgent) || tunnelingAgentCacheUser.set(userHttpsAgent, /* @__PURE__ */ new Map()).get(userHttpsAgent) : tunnelingAgentCache;
  let agent2 = cache.get(key);
  if (agent2) return agent2;
  const merged = userHttpsAgent && userHttpsAgent.options ? { ...userHttpsAgent.options, ...agentOptions } : agentOptions;
  agent2 = new HttpsProxyAgent(merged);
  if (userHttpsAgent && userHttpsAgent.options) {
    const originTLSOptions = { ...userHttpsAgent.options };
    const callback = agent2.callback;
    agent2.callback = function axiosTunnelingAgentCallback(req, opts) {
      return callback.call(this, req, { ...originTLSOptions, ...opts });
    };
  }
  agent2[kAxiosInstalledTunnel] = true;
  cache.set(key, agent2);
  return agent2;
}
const supportedProtocols = platform.protocols.map((protocol) => {
  return protocol + ":";
});
const decodeURIComponentSafe$1 = (value) => {
  if (!utils$1.isString(value)) {
    return value;
  }
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
};
const flushOnFinish = (stream2, [throttled, flush]) => {
  stream2.on("end", flush).on("error", flush);
  return throttled;
};
const http2Sessions = new Http2Sessions();
function dispatchBeforeRedirect(options, responseDetails, requestDetails) {
  if (options.beforeRedirects.proxy) {
    options.beforeRedirects.proxy(options);
  }
  if (options.beforeRedirects.auth) {
    options.beforeRedirects.auth(options);
  }
  if (options.beforeRedirects.sensitiveHeaders) {
    options.beforeRedirects.sensitiveHeaders(options, requestDetails);
  }
  if (options.beforeRedirects.config) {
    options.beforeRedirects.config(options, responseDetails, requestDetails);
  }
}
function stripMatchingHeaders(headers, sensitiveSet) {
  if (!headers) {
    return;
  }
  Object.keys(headers).forEach((header) => {
    if (sensitiveSet.has(header.toLowerCase())) {
      delete headers[header];
    }
  });
}
function isSameOriginRedirect(redirectOptions, requestDetails) {
  if (!requestDetails) {
    return false;
  }
  try {
    return new URL(requestDetails.url).origin === new URL(redirectOptions.href).origin;
  } catch (e) {
    return false;
  }
}
function setProxy(options, configProxy, location, isRedirect, configHttpsAgent, configHttpAgent, allowEnvProxy = true) {
  let proxy = configProxy;
  const proxyEnvAgent = getProxyEnvAgent(options, configHttpAgent, configHttpsAgent);
  if (!proxy && proxy !== false && allowEnvProxy && !isNodeEnvProxyEnabled(proxyEnvAgent)) {
    const proxyUrl = getProxyForUrl(location);
    if (proxyUrl) {
      if (!shouldBypassProxy(location)) {
        proxy = new URL(proxyUrl);
      }
    }
  }
  if (isRedirect && options.headers) {
    for (const name of Object.keys(options.headers)) {
      if (name.toLowerCase() === "proxy-authorization") {
        delete options.headers[name];
      }
    }
  }
  if (isRedirect && options.agent && options.agent[kAxiosInstalledTunnel]) {
    options.agent = void 0;
  }
  if (proxy) {
    const isProxyURL = proxy instanceof URL;
    const readProxyField = (key) => isProxyURL || utils$1.hasOwnProp(proxy, key) ? proxy[key] : void 0;
    const proxyUsername = readProxyField("username");
    const proxyPassword = readProxyField("password");
    let proxyAuth = utils$1.hasOwnProp(proxy, "auth") ? proxy.auth : void 0;
    if (proxyUsername) {
      proxyAuth = (proxyUsername || "") + ":" + (proxyPassword || "");
    }
    if (proxyAuth) {
      const authIsObject = typeof proxyAuth === "object";
      const authUsername = authIsObject && utils$1.hasOwnProp(proxyAuth, "username") ? proxyAuth.username : void 0;
      const authPassword = authIsObject && utils$1.hasOwnProp(proxyAuth, "password") ? proxyAuth.password : void 0;
      const validProxyAuth = Boolean(authUsername || authPassword);
      if (validProxyAuth) {
        proxyAuth = (authUsername || "") + ":" + (authPassword || "");
      } else if (authIsObject) {
        throw new AxiosError$1("Invalid proxy authorization", AxiosError$1.ERR_BAD_OPTION, { proxy });
      }
    }
    const targetIsHttps = isHttps.test(options.protocol);
    if (targetIsHttps) {
      if (!(configHttpsAgent instanceof HttpsProxyAgent)) {
        const proxyHost = readProxyField("hostname") || readProxyField("host");
        const proxyPort = readProxyField("port");
        const rawProxyProtocol = readProxyField("protocol");
        const normalizedProtocol = rawProxyProtocol ? rawProxyProtocol.includes(":") ? rawProxyProtocol : `${rawProxyProtocol}:` : "http:";
        const proxyHostForURL = proxyHost && proxyHost.includes(":") && !proxyHost.startsWith("[") ? `[${proxyHost}]` : proxyHost;
        const proxyURL = new URL(
          `${normalizedProtocol}//${proxyHostForURL}${proxyPort ? ":" + proxyPort : ""}`
        );
        const agentOptions = {
          protocol: proxyURL.protocol,
          hostname: proxyURL.hostname.replace(/^\[|\]$/g, ""),
          port: proxyURL.port,
          auth: proxyAuth && typeof proxyAuth === "string" ? proxyAuth : void 0
        };
        if (proxyURL.protocol === "https:") {
          agentOptions.ALPNProtocols = ["http/1.1"];
        }
        const tunnelingAgent = getTunnelingAgent(agentOptions, configHttpsAgent);
        options.agent = tunnelingAgent;
        if (options.agents) {
          options.agents.https = tunnelingAgent;
        }
      }
    } else {
      if (proxyAuth) {
        const base64 = Buffer.from(proxyAuth, "utf8").toString("base64");
        options.headers["Proxy-Authorization"] = "Basic " + base64;
      }
      let hasUserHostHeader = false;
      for (const name of Object.keys(options.headers)) {
        if (name.toLowerCase() === "host") {
          hasUserHostHeader = true;
          break;
        }
      }
      if (!hasUserHostHeader) {
        options.headers.host = options.hostname + (options.port ? ":" + options.port : "");
      }
      const proxyHost = readProxyField("hostname") || readProxyField("host");
      options.hostname = proxyHost;
      options.host = proxyHost;
      options.port = readProxyField("port");
      options.path = location;
      const proxyProtocol = readProxyField("protocol");
      if (proxyProtocol) {
        options.protocol = proxyProtocol.includes(":") ? proxyProtocol : `${proxyProtocol}:`;
      }
    }
  }
  options.beforeRedirects.proxy = function beforeRedirect(redirectOptions) {
    setProxy(
      redirectOptions,
      configProxy,
      redirectOptions.href,
      true,
      configHttpsAgent,
      configHttpAgent,
      allowEnvProxy
    );
  };
  return Boolean(
    proxy || configProxy !== false && allowEnvProxy && isNodeEnvProxyEnabled(proxyEnvAgent)
  );
}
const isHttpAdapterSupported = typeof process !== "undefined" && utils$1.kindOf(process) === "process";
const wrapAsync = (asyncExecutor) => {
  return new Promise((resolve, reject) => {
    let onDone;
    let isDone;
    const done = (value, isRejected) => {
      if (isDone) return;
      isDone = true;
      onDone && onDone(value, isRejected);
    };
    const _resolve = (value) => {
      done(value);
      resolve(value);
    };
    const _reject = (reason) => {
      done(reason, true);
      reject(reason);
    };
    asyncExecutor(_resolve, _reject, (onDoneHandler) => onDone = onDoneHandler).catch(_reject);
  });
};
const resolveFamily = ({ address, family }) => {
  if (!utils$1.isString(address)) {
    throw new AxiosError$1("address must be a string", AxiosError$1.ERR_BAD_OPTION_VALUE);
  }
  return {
    address,
    family: family || (address.indexOf(".") < 0 ? 6 : 4)
  };
};
const buildAddressEntry = (address, family) => resolveFamily(utils$1.isObject(address) ? address : { address, family });
const normalizedLookupCache = /* @__PURE__ */ new WeakMap();
const normalizeLookup = (lookup) => {
  let normalized = normalizedLookupCache.get(lookup);
  if (normalized) {
    return normalized;
  }
  const callbackLookup = callbackify(lookup, (value) => utils$1.isArray(value) ? value : [value]);
  normalized = (hostname, opt, cb) => {
    callbackLookup(hostname, opt, (err, arg0, arg1) => {
      if (err) {
        return cb(err);
      }
      let addresses;
      try {
        addresses = utils$1.isArray(arg0) ? arg0.map((addr) => buildAddressEntry(addr)) : [buildAddressEntry(arg0, arg1)];
      } catch (error) {
        return cb(error);
      }
      opt.all ? cb(err, addresses) : cb(err, addresses[0].address, addresses[0].family);
    });
  };
  normalizedLookupCache.set(lookup, normalized);
  return normalized;
};
const http2Transport = {
  request(options, cb) {
    const authority = options.protocol + "//" + options.hostname + ":" + (options.port || (options.protocol === "https:" ? 443 : 80));
    const { http2Options, headers } = options;
    const session = http2Sessions.getSession(authority, http2Options);
    const { HTTP2_HEADER_SCHEME, HTTP2_HEADER_METHOD, HTTP2_HEADER_PATH, HTTP2_HEADER_STATUS } = http2.constants;
    const http2Headers = {
      [HTTP2_HEADER_SCHEME]: options.protocol.replace(":", ""),
      [HTTP2_HEADER_METHOD]: options.method,
      [HTTP2_HEADER_PATH]: options.path
    };
    utils$1.forEach(headers, (header, name) => {
      name.charAt(0) !== ":" && (http2Headers[name] = header);
    });
    const req = session.request(http2Headers);
    req.once("response", (responseHeaders) => {
      const response = req;
      responseHeaders = Object.assign({}, responseHeaders);
      const status = responseHeaders[HTTP2_HEADER_STATUS];
      delete responseHeaders[HTTP2_HEADER_STATUS];
      response.headers = responseHeaders;
      response.statusCode = +status;
      cb(response);
    });
    return req;
  }
};
const httpAdapter = isHttpAdapterSupported && function httpAdapter2(config) {
  return wrapAsync(async function dispatchHttpRequest(resolve, reject, onDone) {
    const own2 = (key) => utils$1.getSafeProp(config, key);
    const transitional2 = own2("transitional") || transitionalDefaults;
    let data = own2("data");
    let lookup = own2("lookup");
    let family = own2("family");
    let httpVersion = own2("httpVersion");
    if (httpVersion === void 0) httpVersion = 1;
    const rawHttpVersion = httpVersion;
    let http2Options = own2("http2Options");
    const httpAgent = own2("httpAgent");
    const httpsAgent = own2("httpsAgent");
    const configProxy = own2("proxy");
    const responseType = own2("responseType");
    const responseEncoding = own2("responseEncoding");
    const socketPath = own2("socketPath");
    const method = own2("method").toUpperCase();
    const maxRedirects = own2("maxRedirects");
    const maxBodyLength = own2("maxBodyLength");
    const maxContentLength = own2("maxContentLength");
    const decompress = own2("decompress");
    let isDone;
    let rejected = false;
    let req;
    let connectPhaseTimer;
    try {
      httpVersion = +httpVersion;
    } catch (err) {
      throw new AxiosError$1(
        "Invalid protocol version: value is not a number",
        AxiosError$1.ERR_BAD_OPTION_VALUE,
        config
      );
    }
    if (Number.isNaN(httpVersion)) {
      throw new AxiosError$1(
        `Invalid protocol version: '${rawHttpVersion}' is not a number`,
        AxiosError$1.ERR_BAD_OPTION_VALUE,
        config
      );
    }
    if (httpVersion !== 1 && httpVersion !== 2) {
      throw new AxiosError$1(
        `Unsupported protocol version '${httpVersion}'`,
        AxiosError$1.ERR_BAD_OPTION_VALUE,
        config
      );
    }
    const isHttp2 = httpVersion === 2;
    if (lookup) {
      lookup = normalizeLookup(lookup);
    }
    const abortEmitter = new require$$0.EventEmitter();
    function abort(reason) {
      try {
        abortEmitter.emit(
          "abort",
          !reason || reason.type ? new CanceledError$1(null, config, req) : reason
        );
      } catch (err) {
      }
    }
    function clearConnectPhaseTimer() {
      if (connectPhaseTimer) {
        clearTimeout(connectPhaseTimer);
        connectPhaseTimer = null;
      }
    }
    function createTimeoutError() {
      const configTimeout = own2("timeout");
      let timeoutErrorMessage = configTimeout ? "timeout of " + configTimeout + "ms exceeded" : "timeout exceeded";
      const configTimeoutErrorMessage = own2("timeoutErrorMessage");
      if (configTimeoutErrorMessage) {
        timeoutErrorMessage = configTimeoutErrorMessage;
      }
      return new AxiosError$1(
        timeoutErrorMessage,
        transitional2.clarifyTimeoutError ? AxiosError$1.ETIMEDOUT : AxiosError$1.ECONNABORTED,
        config,
        req
      );
    }
    abortEmitter.once("abort", reject);
    const onFinished = () => {
      clearConnectPhaseTimer();
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(abort);
      }
      if (config.signal) {
        config.signal.removeEventListener("abort", abort);
      }
      abortEmitter.removeAllListeners();
    };
    if (config.cancelToken || config.signal) {
      config.cancelToken && config.cancelToken.subscribe(abort);
      if (config.signal) {
        config.signal.aborted ? abort() : config.signal.addEventListener("abort", abort);
      }
    }
    onDone((response, isRejected) => {
      isDone = true;
      clearConnectPhaseTimer();
      if (isRejected) {
        rejected = true;
        onFinished();
        return;
      }
      const { data: data2 } = response;
      if (data2 instanceof stream.Readable || data2 instanceof stream.Duplex) {
        const offListeners = stream.finished(data2, () => {
          offListeners();
          onFinished();
        });
      } else {
        onFinished();
      }
    });
    const fullPath = buildFullPath(own2("baseURL"), own2("url"), own2("allowAbsoluteUrls"), config);
    const urlBase = socketPath ? "http://localhost" : platform.hasBrowserEnv ? platform.origin : void 0;
    const parsed = new URL(fullPath, urlBase);
    const protocol = parsed.protocol || supportedProtocols[0];
    if (protocol === "data:") {
      if (maxContentLength > -1) {
        const dataUrl = String(own2("url") || fullPath || "");
        const estimated = estimateDataURLBufferAllocation(dataUrl);
        if (estimated > maxContentLength) {
          return reject(
            new AxiosError$1(
              "maxContentLength size of " + maxContentLength + " exceeded",
              AxiosError$1.ERR_BAD_RESPONSE,
              config
            )
          );
        }
      }
      let convertedData;
      if (method !== "GET") {
        return settle(resolve, reject, {
          status: 405,
          statusText: "method not allowed",
          headers: {},
          config
        });
      }
      try {
        convertedData = fromDataURI(own2("url"), responseType === "blob", {
          Blob: config.env && config.env.Blob
        });
      } catch (err) {
        throw AxiosError$1.from(err, AxiosError$1.ERR_BAD_REQUEST, config);
      }
      if (responseType === "text") {
        convertedData = convertedData.toString(responseEncoding);
        if (!responseEncoding || responseEncoding === "utf8") {
          convertedData = utils$1.stripBOM(convertedData);
        }
      } else if (responseType === "stream") {
        convertedData = stream.Readable.from(convertedData);
      }
      return settle(resolve, reject, {
        data: convertedData,
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders$1(),
        config
      });
    }
    if (supportedProtocols.indexOf(protocol) === -1) {
      return reject(
        new AxiosError$1("Unsupported protocol " + protocol, AxiosError$1.ERR_BAD_REQUEST, config)
      );
    }
    const headers = AxiosHeaders$1.from(config.headers).normalize();
    headers.set("User-Agent", "axios/" + VERSION$1, false);
    const { onUploadProgress, onDownloadProgress } = config;
    const maxRate = config.maxRate;
    let maxUploadRate = void 0;
    let maxDownloadRate = void 0;
    if (utils$1.isSpecCompliantForm(data)) {
      const userBoundary = headers.getContentType(/boundary=([-_\w\d]{10,70})/i);
      data = formDataToStream(
        data,
        (formHeaders) => {
          headers.set(formHeaders);
        },
        {
          tag: `axios-${VERSION$1}-boundary`,
          boundary: userBoundary && userBoundary[1] || void 0
        }
      );
    } else if (utils$1.isFormData(data) && utils$1.isFunction(data.getHeaders) && data.getHeaders !== Object.prototype.getHeaders) {
      setFormDataHeaders(headers, data.getHeaders(), own2("formDataHeaderPolicy"));
      if (!headers.hasContentLength()) {
        try {
          const knownLength = await util.promisify(data.getLength).call(data);
          Number.isFinite(knownLength) && knownLength >= 0 && headers.setContentLength(knownLength);
        } catch (e) {
        }
      }
    } else if (utils$1.isBlob(data) || utils$1.isFile(data)) {
      data.size && headers.setContentType(data.type || "application/octet-stream");
      headers.setContentLength(data.size || 0);
      data = stream.Readable.from(readBlob(data));
    } else if (data && !utils$1.isStream(data)) {
      if (Buffer.isBuffer(data)) ;
      else if (utils$1.isArrayBuffer(data)) {
        data = Buffer.from(new Uint8Array(data));
      } else if (utils$1.isString(data)) {
        data = Buffer.from(data, "utf-8");
      } else {
        return reject(
          new AxiosError$1(
            "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
            AxiosError$1.ERR_BAD_REQUEST,
            config
          )
        );
      }
      headers.setContentLength(data.length, false);
      if (maxBodyLength > -1 && data.length > maxBodyLength) {
        return reject(
          new AxiosError$1(
            "Request body larger than maxBodyLength limit",
            AxiosError$1.ERR_BAD_REQUEST,
            config
          )
        );
      }
    }
    const contentLength = utils$1.toFiniteNumber(headers.getContentLength());
    if (utils$1.isArray(maxRate)) {
      maxUploadRate = maxRate[0];
      maxDownloadRate = maxRate[1];
    } else {
      maxUploadRate = maxDownloadRate = maxRate;
    }
    if (data && (onUploadProgress || maxUploadRate)) {
      if (!utils$1.isStream(data)) {
        data = stream.Readable.from(data, { objectMode: false });
      }
      data = stream.pipeline(
        [
          data,
          new AxiosTransformStream({
            maxRate: utils$1.toFiniteNumber(maxUploadRate)
          })
        ],
        utils$1.noop
      );
      onUploadProgress && data.on(
        "progress",
        flushOnFinish(
          data,
          progressEventDecorator(
            contentLength,
            progressEventReducer(asyncDecorator(onUploadProgress, scheduleProgress), false, 3)
          )
        )
      );
    }
    let auth = void 0;
    const configAuth = own2("auth");
    if (configAuth) {
      const username = utils$1.getSafeProp(configAuth, "username") || "";
      const password = utils$1.getSafeProp(configAuth, "password") || "";
      auth = username + ":" + password;
    }
    if (!auth && (parsed.username || parsed.password)) {
      const urlUsername = decodeURIComponentSafe$1(parsed.username);
      const urlPassword = decodeURIComponentSafe$1(parsed.password);
      auth = urlUsername + ":" + urlPassword;
    }
    auth && headers.delete("authorization");
    let path$1;
    try {
      path$1 = buildURL(
        parsed.pathname + parsed.search,
        own2("params"),
        own2("paramsSerializer")
      ).replace(/^\?/, "");
    } catch (err) {
      return reject(
        AxiosError$1.from(err, AxiosError$1.ERR_BAD_REQUEST, config, null, null, {
          url: own2("url"),
          exists: true
        })
      );
    }
    headers.set(
      "Accept-Encoding",
      utils$1.hasOwnProp(transitional2, "advertiseZstdAcceptEncoding") && transitional2.advertiseZstdAcceptEncoding === true ? ACCEPT_ENCODING_WITH_ZSTD : ACCEPT_ENCODING,
      false
    );
    if (isHttp2 && lookup) {
      http2Options = Object.assign(/* @__PURE__ */ Object.create(null), http2Options, { lookup });
    }
    const options = Object.assign(/* @__PURE__ */ Object.create(null), {
      path: path$1,
      method,
      headers: toByteStringHeaderObject(headers),
      agents: { http: httpAgent, https: httpsAgent },
      auth,
      protocol,
      family,
      beforeRedirect: dispatchBeforeRedirect,
      beforeRedirects: /* @__PURE__ */ Object.create(null),
      http2Options,
      createConnection: void 0
    });
    !utils$1.isUndefined(lookup) && (options.lookup = lookup);
    let proxyApplied = false;
    if (socketPath) {
      if (typeof socketPath !== "string") {
        return reject(
          new AxiosError$1("socketPath must be a string", AxiosError$1.ERR_BAD_OPTION_VALUE, config)
        );
      }
      const allowedSocketPaths = own2("allowedSocketPaths");
      if (allowedSocketPaths != null) {
        const allowed = Array.isArray(allowedSocketPaths) ? allowedSocketPaths : [allowedSocketPaths];
        const resolvedSocket = path.resolve(socketPath);
        const isAllowed = allowed.some(
          (entry) => typeof entry === "string" && path.resolve(entry) === resolvedSocket
        );
        if (!isAllowed) {
          return reject(
            new AxiosError$1(
              `socketPath "${socketPath}" is not permitted by allowedSocketPaths`,
              AxiosError$1.ERR_BAD_OPTION_VALUE,
              config
            )
          );
        }
      }
      options.socketPath = socketPath;
    } else {
      options.hostname = parsed.hostname.startsWith("[") ? parsed.hostname.slice(1, -1) : parsed.hostname;
      options.port = parsed.port;
      proxyApplied = setProxy(
        options,
        configProxy,
        protocol + "//" + parsed.hostname + (parsed.port ? ":" + parsed.port : "") + options.path,
        false,
        httpsAgent,
        httpAgent,
        // The HTTP/2 transport connects independently of HTTP/1 agents, so it
        // cannot apply either axios-resolved or agent-local environment proxies.
        // Explicit proxy config is still processed and rejected below.
        !isHttp2
      );
    }
    let transport;
    let isNativeTransport = false;
    let transportEnforcesMaxBodyLength = false;
    const isHttpsRequest = isHttps.test(options.protocol);
    if (options.agent == null) {
      options.agent = isHttpsRequest ? httpsAgent : httpAgent;
    }
    if (isHttp2) {
      if (proxyApplied) {
        return reject(
          new AxiosError$1(
            "HTTP/2 requests with a proxy are not supported",
            AxiosError$1.ERR_NOT_SUPPORT,
            config
          )
        );
      }
      transport = http2Transport;
    } else {
      const configTransport = own2("transport");
      if (configTransport) {
        transport = configTransport;
      } else if (maxRedirects === 0) {
        transport = isHttpsRequest ? https : http;
        isNativeTransport = true;
      } else {
        transportEnforcesMaxBodyLength = true;
        options.sensitiveHeaders = [];
        if (maxRedirects) {
          options.maxRedirects = maxRedirects;
        }
        const configBeforeRedirect = own2("beforeRedirect");
        if (configBeforeRedirect) {
          options.beforeRedirects.config = configBeforeRedirect;
        }
        if (auth) {
          const requestOrigin = parsed.origin;
          const authToRestore = auth;
          options.beforeRedirects.auth = function beforeRedirectAuth(redirectOptions) {
            try {
              if (new URL(redirectOptions.href).origin === requestOrigin) {
                redirectOptions.auth = authToRestore;
              }
            } catch (e) {
            }
          };
        }
        const sensitiveHeaders = own2("sensitiveHeaders");
        if (sensitiveHeaders != null) {
          if (!utils$1.isArray(sensitiveHeaders)) {
            return reject(
              new AxiosError$1(
                "sensitiveHeaders must be an array of strings",
                AxiosError$1.ERR_BAD_OPTION_VALUE,
                config
              )
            );
          }
          const sensitiveSet = /* @__PURE__ */ new Set();
          for (const header of sensitiveHeaders) {
            if (!utils$1.isString(header)) {
              return reject(
                new AxiosError$1(
                  "sensitiveHeaders must be an array of strings",
                  AxiosError$1.ERR_BAD_OPTION_VALUE,
                  config
                )
              );
            }
            sensitiveSet.add(header.toLowerCase());
          }
          if (sensitiveSet.size) {
            options.sensitiveHeaders = Array.from(sensitiveSet);
            options.beforeRedirects.sensitiveHeaders = function beforeRedirectSensitiveHeaders(redirectOptions, requestDetails) {
              if (!isSameOriginRedirect(redirectOptions, requestDetails)) {
                stripMatchingHeaders(redirectOptions.headers, sensitiveSet);
              }
            };
          }
        }
        transport = isHttpsRequest ? httpsFollow : httpFollow;
      }
    }
    if (maxBodyLength > -1) {
      options.maxBodyLength = maxBodyLength;
    } else {
      options.maxBodyLength = Infinity;
    }
    options.insecureHTTPParser = Boolean(own2("insecureHTTPParser"));
    req = transport.request(options, function handleResponse(res) {
      clearConnectPhaseTimer();
      if (req.destroyed) return;
      const streams = [res];
      const responseLength = utils$1.toFiniteNumber(res.headers["content-length"]);
      if (onDownloadProgress || maxDownloadRate) {
        const transformStream = new AxiosTransformStream({
          maxRate: utils$1.toFiniteNumber(maxDownloadRate)
        });
        onDownloadProgress && transformStream.on(
          "progress",
          flushOnFinish(
            transformStream,
            progressEventDecorator(
              responseLength,
              progressEventReducer(
                asyncDecorator(onDownloadProgress, scheduleProgress),
                true,
                3
              )
            )
          )
        );
        streams.push(transformStream);
      }
      let responseStream = res;
      const lastRequest = res.req || req;
      if (decompress !== false && res.headers["content-encoding"]) {
        if (method === "HEAD" || res.statusCode === 204) {
          delete res.headers["content-encoding"];
        }
        switch ((res.headers["content-encoding"] || "").toLowerCase()) {
          /*eslint default-case:0*/
          case "gzip":
          case "x-gzip":
          case "compress":
          case "x-compress":
            streams.push(zlib.createUnzip(zlibOptions));
            delete res.headers["content-encoding"];
            break;
          case "deflate":
            streams.push(new ZlibHeaderTransformStream());
            streams.push(zlib.createUnzip(zlibOptions));
            delete res.headers["content-encoding"];
            break;
          case "br":
            if (isBrotliSupported) {
              streams.push(zlib.createBrotliDecompress(brotliOptions));
              delete res.headers["content-encoding"];
            }
            break;
          case "zstd":
            if (isZstdSupported) {
              streams.push(zlib.createZstdDecompress(zstdOptions));
              delete res.headers["content-encoding"];
            }
            break;
        }
      }
      responseStream = streams.length > 1 ? stream.pipeline(streams, utils$1.noop) : streams[0];
      const response = {
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: new AxiosHeaders$1(res.headers),
        config,
        request: lastRequest
      };
      if (responseType === "stream") {
        if (maxContentLength > -1) {
          const limit = maxContentLength;
          const source = responseStream;
          async function* enforceMaxContentLength() {
            let totalResponseBytes = 0;
            for await (const chunk of source) {
              totalResponseBytes += chunk.length;
              if (totalResponseBytes > limit) {
                throw new AxiosError$1(
                  "maxContentLength size of " + limit + " exceeded",
                  AxiosError$1.ERR_BAD_RESPONSE,
                  config,
                  lastRequest
                );
              }
              yield chunk;
            }
          }
          responseStream = stream.Readable.from(enforceMaxContentLength(), {
            objectMode: false
          });
        }
        response.data = responseStream;
        settle(resolve, reject, response);
      } else {
        const responseBuffer = [];
        let totalResponseBytes = 0;
        responseStream.on("data", function handleStreamData(chunk) {
          responseBuffer.push(chunk);
          totalResponseBytes += chunk.length;
          if (maxContentLength > -1 && totalResponseBytes > maxContentLength) {
            rejected = true;
            responseStream.destroy();
            abort(
              new AxiosError$1(
                "maxContentLength size of " + maxContentLength + " exceeded",
                AxiosError$1.ERR_BAD_RESPONSE,
                config,
                lastRequest
              )
            );
          }
        });
        responseStream.on("aborted", function handlerStreamAborted() {
          if (rejected) {
            return;
          }
          const err = new AxiosError$1(
            "stream has been aborted",
            AxiosError$1.ERR_BAD_RESPONSE,
            config,
            lastRequest,
            response
          );
          responseStream.destroy(err);
          reject(err);
        });
        responseStream.on("error", function handleStreamError(err) {
          if (rejected) return;
          reject(AxiosError$1.from(err, null, config, lastRequest, response));
        });
        responseStream.on("end", function handleStreamEnd() {
          try {
            let responseData = responseBuffer.length === 1 ? responseBuffer[0] : Buffer.concat(responseBuffer);
            if (responseType !== "arraybuffer") {
              responseData = responseData.toString(responseEncoding);
              if (!responseEncoding || responseEncoding === "utf8") {
                responseData = utils$1.stripBOM(responseData);
              }
            }
            response.data = responseData;
          } catch (err) {
            return reject(AxiosError$1.from(err, null, config, response.request, response));
          }
          settle(resolve, reject, response);
        });
      }
      abortEmitter.once("abort", (err) => {
        if (!responseStream.destroyed) {
          responseStream.emit("error", err);
          responseStream.destroy();
        }
      });
    });
    abortEmitter.once("abort", (err) => {
      if (req.close) {
        req.close();
      } else {
        req.destroy(err);
      }
    });
    req.on("error", function handleRequestError(err) {
      reject(AxiosError$1.from(err, null, config, req));
    });
    const boundSockets = /* @__PURE__ */ new Set();
    req.on("socket", function handleRequestSocket(socket) {
      if (typeof socket.setKeepAlive === "function") {
        socket.setKeepAlive(true, 1e3 * 60);
      }
      if (!socket[kAxiosSocketListener]) {
        socket.on("error", handleSocketError);
        socket[kAxiosSocketListener] = true;
      }
      socket[kAxiosCurrentReq] = req;
      boundSockets.add(socket);
    });
    req.once("close", function clearCurrentReq() {
      clearConnectPhaseTimer();
      for (const socket of boundSockets) {
        if (socket[kAxiosCurrentReq] === req) {
          socket[kAxiosCurrentReq] = null;
        }
      }
      boundSockets.clear();
    });
    if (own2("timeout")) {
      const timeout = parseInt(own2("timeout"), 10);
      if (Number.isNaN(timeout)) {
        abort(
          new AxiosError$1(
            "error trying to parse `config.timeout` to int",
            AxiosError$1.ERR_BAD_OPTION_VALUE,
            config,
            req
          )
        );
        return;
      }
      const handleTimeout = function handleTimeout2() {
        if (isDone) return;
        abort(createTimeoutError());
      };
      if (isNativeTransport && timeout > 0) {
        connectPhaseTimer = setTimeout(handleTimeout, timeout);
      }
      req.setTimeout(timeout, handleTimeout);
    } else {
      req.setTimeout(0);
    }
    if (utils$1.isStream(data)) {
      let ended = false;
      let errored = false;
      data.on("end", () => {
        ended = true;
      });
      data.once("error", (err) => {
        errored = true;
        req.destroy(err);
      });
      data.on("close", () => {
        if (!ended && !errored) {
          abort(new CanceledError$1("Request stream has been aborted", config, req));
        }
      });
      let uploadStream = data;
      if (maxBodyLength > -1 && !transportEnforcesMaxBodyLength) {
        const limit = maxBodyLength;
        let bytesSent = 0;
        uploadStream = stream.pipeline(
          [
            data,
            new stream.Transform({
              transform(chunk, _enc, cb) {
                bytesSent += chunk.length;
                if (bytesSent > limit) {
                  return cb(
                    new AxiosError$1(
                      "Request body larger than maxBodyLength limit",
                      AxiosError$1.ERR_BAD_REQUEST,
                      config,
                      req
                    )
                  );
                }
                cb(null, chunk);
              }
            })
          ],
          utils$1.noop
        );
        uploadStream.on("error", (err) => {
          if (!req.destroyed) req.destroy(err);
        });
      }
      uploadStream.pipe(req);
    } else {
      data && req.write(data);
      req.end();
    }
  });
};
const isURLSameOrigin = platform.hasStandardBrowserEnv ? /* @__PURE__ */ ((origin2, isMSIE) => (url2) => {
  url2 = new URL(url2, platform.origin);
  return origin2.protocol === url2.protocol && origin2.host === url2.host && (isMSIE || origin2.port === url2.port);
})(
  new URL(platform.origin),
  platform.navigator && /(msie|trident)/i.test(platform.navigator.userAgent)
) : () => true;
const cookies = platform.hasStandardBrowserEnv ? (
  // Standard browser envs support document.cookie
  {
    write(name, value, expires, path2, domain, secure, sameSite) {
      if (typeof document === "undefined") return;
      const cookie = [`${name}=${encodeURIComponent(value)}`];
      if (utils$1.isNumber(expires)) {
        cookie.push(`expires=${new Date(expires).toUTCString()}`);
      }
      if (utils$1.isString(path2)) {
        cookie.push(`path=${path2}`);
      }
      if (utils$1.isString(domain)) {
        cookie.push(`domain=${domain}`);
      }
      if (secure === true) {
        cookie.push("secure");
      }
      if (utils$1.isString(sameSite)) {
        cookie.push(`SameSite=${sameSite}`);
      }
      document.cookie = cookie.join("; ");
    },
    read(name) {
      if (typeof document === "undefined") return null;
      const cookies2 = document.cookie.split(";");
      for (let i = 0; i < cookies2.length; i++) {
        const cookie = cookies2[i].replace(/^\s+/, "");
        const eq = cookie.indexOf("=");
        if (eq !== -1 && cookie.slice(0, eq) === name) {
          try {
            return decodeURIComponent(cookie.slice(eq + 1));
          } catch (e) {
            return cookie.slice(eq + 1);
          }
        }
      }
      return null;
    },
    remove(name) {
      this.write(name, "", Date.now() - 864e5, "/");
    }
  }
) : (
  // Non-standard browser env (web workers, react-native) lack needed support.
  {
    write() {
    },
    read() {
      return null;
    },
    remove() {
    }
  }
);
const headersToObject = (thing) => thing instanceof AxiosHeaders$1 ? { ...thing } : thing;
const ownEnumerableKeys = (thing) => {
  if (Object.getOwnPropertySymbols && Object.getOwnPropertyDescriptor) {
    return Object.keys(thing).concat(
      Object.getOwnPropertySymbols(thing).filter(
        (symbol) => Object.getOwnPropertyDescriptor(thing, symbol).enumerable
      )
    );
  }
  return Object.keys(thing);
};
function mergeConfig$1(config1, config2) {
  config1 = config1 || {};
  config2 = config2 || {};
  const config = /* @__PURE__ */ Object.create(null);
  Object.defineProperty(config, "hasOwnProperty", {
    // Null-proto descriptor so a polluted Object.prototype.get cannot turn
    // this data descriptor into an accessor descriptor on the way in.
    __proto__: null,
    value: Object.prototype.hasOwnProperty,
    enumerable: false,
    writable: true,
    configurable: true
  });
  function getMergedValue(target, source, prop, caseless) {
    if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
      return utils$1.merge.call({ caseless }, target, source);
    } else if (utils$1.isPlainObject(source)) {
      return utils$1.merge({}, source);
    } else if (utils$1.isArray(source)) {
      return source.slice();
    }
    return source;
  }
  function mergeDeepProperties(a, b, prop, caseless) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(a, b, prop, caseless);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(void 0, a, prop, caseless);
    }
  }
  function valueFromConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(void 0, b);
    }
  }
  function defaultToConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(void 0, b);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(void 0, a);
    }
  }
  function getMergedTransitionalOption(prop) {
    const transitional2 = utils$1.hasOwnProp(config2, "transitional") ? config2.transitional : void 0;
    if (!utils$1.isUndefined(transitional2)) {
      if (utils$1.isPlainObject(transitional2)) {
        if (utils$1.hasOwnProp(transitional2, prop)) {
          return transitional2[prop];
        }
      } else {
        return void 0;
      }
    }
    const transitional1 = utils$1.hasOwnProp(config1, "transitional") ? config1.transitional : void 0;
    if (utils$1.isPlainObject(transitional1) && utils$1.hasOwnProp(transitional1, prop)) {
      return transitional1[prop];
    }
    return void 0;
  }
  function mergeDirectKeys(a, b, prop) {
    if (utils$1.hasOwnProp(config2, prop)) {
      return getMergedValue(a, b);
    } else if (utils$1.hasOwnProp(config1, prop)) {
      return getMergedValue(void 0, a);
    }
  }
  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutErrorMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    allowedSocketPaths: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
  };
  utils$1.forEach(ownEnumerableKeys({ ...config1, ...config2 }), function computeConfigValue(prop) {
    if (prop === "__proto__" || prop === "constructor" || prop === "prototype") return;
    const merge2 = utils$1.hasOwnProp(mergeMap, prop) ? mergeMap[prop] : mergeDeepProperties;
    const a = utils$1.hasOwnProp(config1, prop) ? config1[prop] : void 0;
    const b = utils$1.hasOwnProp(config2, prop) ? config2[prop] : void 0;
    const configValue = merge2(a, b, prop);
    utils$1.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
  });
  if (utils$1.hasOwnProp(config2, "validateStatus") && utils$1.isUndefined(config2.validateStatus) && getMergedTransitionalOption("validateStatusUndefinedResolves") === false) {
    if (utils$1.hasOwnProp(config1, "validateStatus")) {
      config.validateStatus = getMergedValue(void 0, config1.validateStatus);
    } else {
      delete config.validateStatus;
    }
  }
  return config;
}
const encodeUTF8$1 = (str) => encodeURIComponent(str).replace(
  /%([0-9A-F]{2})/gi,
  (_, hex) => String.fromCharCode(parseInt(hex, 16))
);
function resolveConfig(config) {
  const newConfig = mergeConfig$1({}, config);
  const own2 = (key) => utils$1.hasOwnProp(newConfig, key) ? newConfig[key] : void 0;
  const data = own2("data");
  let withXSRFToken = own2("withXSRFToken");
  const xsrfHeaderName = own2("xsrfHeaderName");
  const xsrfCookieName = own2("xsrfCookieName");
  let headers = own2("headers");
  const auth = own2("auth");
  const baseURL = own2("baseURL");
  const allowAbsoluteUrls = own2("allowAbsoluteUrls");
  const url2 = own2("url");
  newConfig.headers = headers = AxiosHeaders$1.from(headers);
  newConfig.url = buildURL(
    buildFullPath(baseURL, url2, allowAbsoluteUrls, newConfig),
    own2("params"),
    own2("paramsSerializer")
  );
  if (auth) {
    const username = utils$1.getSafeProp(auth, "username") || "";
    const password = utils$1.getSafeProp(auth, "password") || "";
    try {
      headers.set(
        "Authorization",
        "Basic " + btoa(username + ":" + (password ? encodeUTF8$1(password) : ""))
      );
    } catch (e) {
      throw AxiosError$1.from(e, AxiosError$1.ERR_BAD_OPTION_VALUE, config);
    }
  }
  if (utils$1.isFormData(data)) {
    const getHeaders = utils$1.getSafeProp(data, "getHeaders");
    if (platform.hasStandardBrowserEnv || platform.hasStandardBrowserWebWorkerEnv || utils$1.isReactNative(data)) {
      headers.setContentType(void 0);
    } else if (utils$1.isFunction(getHeaders)) {
      setFormDataHeaders(headers, getHeaders.call(data), own2("formDataHeaderPolicy"));
    }
  }
  if (platform.hasStandardBrowserEnv) {
    if (utils$1.isFunction(withXSRFToken)) {
      withXSRFToken = withXSRFToken(newConfig);
    }
    const shouldSendXSRF = withXSRFToken === true || withXSRFToken == null && isURLSameOrigin(newConfig.url);
    if (shouldSendXSRF) {
      const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies.read(xsrfCookieName);
      if (xsrfValue) {
        headers.set(xsrfHeaderName, xsrfValue);
      }
    }
  }
  return newConfig;
}
const isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
const xhrAdapter = isXHRAdapterSupported && function(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    const _config = resolveConfig(config);
    let requestData = _config.data;
    const requestHeaders = AxiosHeaders$1.from(_config.headers).normalize();
    let { responseType, onUploadProgress, onDownloadProgress } = _config;
    let onCanceled;
    let uploadThrottled, downloadThrottled;
    let flushUpload, flushDownload, flushDownloadWithEvent;
    function done() {
      flushUpload && flushUpload();
      flushDownload && flushDownload();
      _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
      _config.signal && _config.signal.removeEventListener("abort", onCanceled);
    }
    let request = new XMLHttpRequest();
    request.open(_config.method.toUpperCase(), _config.url, true);
    request.timeout = _config.timeout;
    function onloadend(event) {
      if (!request) {
        return;
      }
      if (request.status === 0 && (parseProtocol(normalizeURLForProtocolCheck(_config.url)) || parseProtocol(platform.origin)) !== "file" && !(request.responseURL && request.responseURL.startsWith("file:"))) {
        reject(new AxiosError$1("Request aborted", AxiosError$1.ECONNABORTED, config, request));
        done();
        request = null;
        return;
      }
      try {
        if (event) {
          flushDownloadWithEvent && flushDownloadWithEvent(event);
        } else {
          flushDownload && flushDownload();
        }
      } catch (err) {
        setTimeout(() => {
          throw err;
        });
      }
      if (!request) {
        return;
      }
      const responseHeaders = AxiosHeaders$1.from(
        "getAllResponseHeaders" in request && request.getAllResponseHeaders()
      );
      const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };
      settle(
        function _resolve(value) {
          resolve(value);
          done();
        },
        function _reject(err) {
          reject(err);
          done();
        },
        response
      );
      request = null;
    }
    if ("onloadend" in request) {
      request.onloadend = onloadend;
    } else {
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }
        if (request.status === 0 && !(request.responseURL && request.responseURL.startsWith("file:"))) {
          return;
        }
        setTimeout(onloadend);
      };
    }
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }
      reject(new AxiosError$1("Request aborted", AxiosError$1.ECONNABORTED, config, request));
      done();
      request = null;
    };
    request.onerror = function handleError(event) {
      const msg = event && event.message ? event.message : "Network Error";
      const err = new AxiosError$1(msg, AxiosError$1.ERR_NETWORK, config, request);
      err.event = event || null;
      reject(err);
      done();
      request = null;
    };
    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
      const transitional2 = _config.transitional || transitionalDefaults;
      if (_config.timeoutErrorMessage) {
        timeoutErrorMessage = _config.timeoutErrorMessage;
      }
      reject(
        new AxiosError$1(
          timeoutErrorMessage,
          transitional2.clarifyTimeoutError ? AxiosError$1.ETIMEDOUT : AxiosError$1.ECONNABORTED,
          config,
          request
        )
      );
      done();
      request = null;
    };
    requestData === void 0 && requestHeaders.setContentType(null);
    if ("setRequestHeader" in request) {
      utils$1.forEach(toByteStringHeaderObject(requestHeaders), function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      });
    }
    if (!utils$1.isUndefined(_config.withCredentials)) {
      request.withCredentials = !!_config.withCredentials;
    }
    if (responseType && responseType !== "json") {
      request.responseType = _config.responseType;
    }
    if (onDownloadProgress) {
      [downloadThrottled, flushDownload, flushDownloadWithEvent] = progressEventReducer(
        onDownloadProgress,
        true
      );
      request.addEventListener("progress", downloadThrottled);
    }
    if (onUploadProgress && request.upload) {
      [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
      request.upload.addEventListener("progress", uploadThrottled);
      request.upload.addEventListener("loadend", flushUpload);
    }
    if (_config.cancelToken || _config.signal) {
      onCanceled = (cancel) => {
        if (!request) {
          return;
        }
        reject(!cancel || cancel.type ? new CanceledError$1(null, config, request) : cancel);
        request.abort();
        done();
        request = null;
      };
      _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
      if (_config.signal) {
        _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
      }
    }
    const protocol = parseProtocol(_config.url);
    if (protocol && !platform.protocols.includes(protocol)) {
      reject(
        new AxiosError$1(
          "Unsupported protocol " + protocol + ":",
          AxiosError$1.ERR_BAD_REQUEST,
          config
        )
      );
      done();
      return;
    }
    request.send(requestData || null);
  });
};
const composeSignals = (signals, timeout) => {
  signals = signals ? signals.filter(Boolean) : [];
  if (!timeout && !signals.length) {
    return;
  }
  const controller = new AbortController();
  let aborted = false;
  const onabort = function(reason) {
    if (!aborted) {
      aborted = true;
      unsubscribe();
      const err = reason instanceof Error ? reason : this.reason;
      controller.abort(
        err instanceof AxiosError$1 ? err : new CanceledError$1(err instanceof Error ? err.message : err)
      );
    }
  };
  let timer = timeout && setTimeout(() => {
    timer = null;
    onabort(new AxiosError$1(`timeout of ${timeout}ms exceeded`, AxiosError$1.ETIMEDOUT));
  }, timeout);
  const unsubscribe = () => {
    if (!signals) {
      return;
    }
    timer && clearTimeout(timer);
    timer = null;
    signals.forEach((signal2) => {
      signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
    });
    signals = null;
  };
  signals.forEach((signal2) => {
    if (aborted) {
      return;
    }
    if (signal2.aborted) {
      onabort.call(signal2);
      return;
    }
    signal2.addEventListener("abort", onabort, { once: true });
  });
  const { signal } = controller;
  signal.unsubscribe = () => utils$1.asap(unsubscribe);
  return signal;
};
const streamChunk = function* (chunk, chunkSize) {
  let len = chunk.byteLength;
  if (len < chunkSize) {
    yield chunk;
    return;
  }
  let pos = 0;
  let end;
  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
};
const readBytes = async function* (iterable, chunkSize) {
  for await (const chunk of readStream(iterable)) {
    yield* streamChunk(chunk, chunkSize);
  }
};
const readStream = async function* (stream2) {
  if (stream2[Symbol.asyncIterator]) {
    yield* stream2;
    return;
  }
  const reader = stream2.getReader();
  try {
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      yield value;
    }
  } finally {
    await reader.cancel();
  }
};
const trackStream = (stream2, chunkSize, onProgress, onFinish) => {
  const iterator2 = readBytes(stream2, chunkSize);
  let bytes = 0;
  let done;
  let _onFinish = (e) => {
    if (!done) {
      done = true;
      onFinish && onFinish(e);
    }
  };
  return new ReadableStream(
    {
      async pull(controller) {
        try {
          const { done: done2, value } = await iterator2.next();
          if (done2) {
            _onFinish();
            controller.close();
            return;
          }
          let len = value.byteLength;
          if (onProgress) {
            let loadedBytes = bytes += len;
            onProgress(loadedBytes);
          }
          controller.enqueue(new Uint8Array(value));
        } catch (err) {
          _onFinish(err);
          throw err;
        }
      },
      cancel(reason) {
        _onFinish(reason);
        return iterator2.return();
      }
    },
    {
      highWaterMark: 2
    }
  );
};
const DEFAULT_CHUNK_SIZE = 64 * 1024;
const DEFAULT_REQUEST_OPTIONS = {
  cache: "default",
  redirect: "follow",
  referrer: "about:client",
  referrerPolicy: "",
  mode: "cors",
  integrity: "",
  keepalive: false,
  priority: "auto",
  window: null
};
const { isFunction } = utils$1;
const encodeUTF8 = (str) => encodeURIComponent(str).replace(
  /%([0-9A-F]{2})/gi,
  (_, hex) => String.fromCharCode(parseInt(hex, 16))
);
const decodeURIComponentSafe = (value) => {
  if (!utils$1.isString(value)) {
    return value;
  }
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
};
const test = (fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false;
  }
};
const maybeWithAuthCredentials = (url2) => {
  const protocolIndex = url2.indexOf("://");
  let urlToCheck = url2;
  if (protocolIndex !== -1) {
    urlToCheck = urlToCheck.slice(protocolIndex + 3);
  }
  return urlToCheck.includes("@") || urlToCheck.includes(":");
};
const factory = (env) => {
  const globalObject = utils$1.global !== void 0 && utils$1.global !== null ? utils$1.global : globalThis;
  const { ReadableStream: ReadableStream2, TextEncoder: TextEncoder2 } = globalObject;
  env = utils$1.merge.call(
    {
      skipUndefined: true
    },
    {
      Request: globalObject.Request,
      Response: globalObject.Response
    },
    env
  );
  const { fetch: envFetch, Request, Response: Response2 } = env;
  const isFetchSupported = envFetch ? isFunction(envFetch) : typeof fetch === "function";
  const isRequestSupported = isFunction(Request);
  const isResponseSupported = isFunction(Response2);
  if (!isFetchSupported) {
    return false;
  }
  const isReadableStreamSupported = isFetchSupported && isFunction(ReadableStream2);
  const encodeText = isFetchSupported && (typeof TextEncoder2 === "function" ? /* @__PURE__ */ ((encoder) => (str) => encoder.encode(str))(new TextEncoder2()) : async (str) => new Uint8Array(await new Request(str).arrayBuffer()));
  const supportsRequestStream = isRequestSupported && isReadableStreamSupported && test(() => {
    let duplexAccessed = false;
    const request = new Request(platform.origin, {
      body: new ReadableStream2(),
      method: "POST",
      get duplex() {
        duplexAccessed = true;
        return "half";
      }
    });
    const hasContentType = request.headers.has("Content-Type");
    if (request.body != null) {
      request.body.cancel();
    }
    return duplexAccessed && !hasContentType;
  });
  const supportsResponseStream = isResponseSupported && isReadableStreamSupported && test(() => utils$1.isReadableStream(new Response2("").body));
  const resolvers = {
    stream: supportsResponseStream && ((res) => res.body)
  };
  isFetchSupported && (() => {
    ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
      !resolvers[type] && (resolvers[type] = (res, config) => {
        let method = res && res[type];
        if (method) {
          return method.call(res);
        }
        throw new AxiosError$1(
          `Response type '${type}' is not supported`,
          AxiosError$1.ERR_NOT_SUPPORT,
          config
        );
      });
    });
  })();
  const getBodyLength = async (body) => {
    if (body == null) {
      return 0;
    }
    if (utils$1.isBlob(body)) {
      return body.size;
    }
    if (utils$1.isSpecCompliantForm(body)) {
      const _request = new Request(platform.origin, {
        method: "POST",
        body
      });
      return (await _request.arrayBuffer()).byteLength;
    }
    if (utils$1.isArrayBufferView(body) || utils$1.isArrayBuffer(body)) {
      return body.byteLength;
    }
    if (utils$1.isURLSearchParams(body)) {
      body = body + "";
    }
    if (utils$1.isString(body)) {
      return (await encodeText(body)).byteLength;
    }
  };
  const resolveBodyLength = async (headers, body) => {
    const length = utils$1.toFiniteNumber(headers.getContentLength());
    return length == null ? getBodyLength(body) : length;
  };
  return async (config) => {
    let {
      url: url2,
      method,
      data,
      signal,
      cancelToken,
      timeout,
      onDownloadProgress,
      onUploadProgress,
      responseType,
      headers,
      withCredentials = "same-origin",
      fetchOptions,
      maxContentLength,
      maxBodyLength,
      maxRedirects
    } = resolveConfig(config);
    const hasMaxContentLength = utils$1.isNumber(maxContentLength) && maxContentLength > -1;
    const hasMaxBodyLength = utils$1.isNumber(maxBodyLength) && maxBodyLength > -1;
    const own2 = (key) => utils$1.hasOwnProp(config, key) ? config[key] : void 0;
    let _fetch = envFetch || fetch;
    responseType = responseType ? (responseType + "").toLowerCase() : "text";
    let composedSignal = composeSignals(
      [signal, cancelToken && cancelToken.toAbortSignal()],
      timeout
    );
    let request = null;
    const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
      composedSignal.unsubscribe();
    });
    let requestContentLength;
    let pendingBodyError = null;
    const maxBodyLengthError = () => new AxiosError$1(
      "Request body larger than maxBodyLength limit",
      AxiosError$1.ERR_BAD_REQUEST,
      config,
      request
    );
    try {
      let auth = void 0;
      const configAuth = own2("auth");
      if (configAuth) {
        const username = utils$1.getSafeProp(configAuth, "username") || "";
        const password = utils$1.getSafeProp(configAuth, "password") || "";
        auth = {
          username,
          password
        };
      }
      if (maybeWithAuthCredentials(url2)) {
        const parsedURL = new URL(url2, platform.origin);
        if (!auth && (parsedURL.username || parsedURL.password)) {
          const urlUsername = decodeURIComponentSafe(parsedURL.username);
          const urlPassword = decodeURIComponentSafe(parsedURL.password);
          auth = {
            username: urlUsername,
            password: urlPassword
          };
        }
        if (parsedURL.username || parsedURL.password) {
          parsedURL.username = "";
          parsedURL.password = "";
          url2 = parsedURL.href;
        }
      }
      if (auth) {
        headers.delete("authorization");
        headers.set(
          "Authorization",
          "Basic " + btoa(encodeUTF8((auth.username || "") + ":" + (auth.password || "")))
        );
      }
      if (hasMaxContentLength && typeof url2 === "string" && url2.startsWith("data:")) {
        const estimated = estimateDataURLDecodedBytes(url2);
        if (estimated > maxContentLength) {
          throw new AxiosError$1(
            "maxContentLength size of " + maxContentLength + " exceeded",
            AxiosError$1.ERR_BAD_RESPONSE,
            config,
            request
          );
        }
      }
      if (hasMaxBodyLength && method !== "get" && method !== "head") {
        const outboundLength = await getBodyLength(data);
        if (typeof outboundLength === "number" && isFinite(outboundLength)) {
          requestContentLength = outboundLength;
          if (outboundLength > maxBodyLength) {
            throw maxBodyLengthError();
          }
        }
      }
      const mustEnforceStreamBody = hasMaxBodyLength && (utils$1.isReadableStream(data) || utils$1.isStream(data));
      const trackRequestStream = (stream2, onProgress, flush) => trackStream(
        stream2,
        DEFAULT_CHUNK_SIZE,
        (loadedBytes) => {
          if (hasMaxBodyLength && loadedBytes > maxBodyLength) {
            throw pendingBodyError = maxBodyLengthError();
          }
          onProgress && onProgress(loadedBytes);
        },
        flush
      );
      if (supportsRequestStream && method !== "get" && method !== "head" && (onUploadProgress || mustEnforceStreamBody)) {
        requestContentLength = requestContentLength == null ? await resolveBodyLength(headers, data) : requestContentLength;
        if (requestContentLength !== 0 || mustEnforceStreamBody) {
          let _request = new Request(url2, {
            method: "POST",
            body: data,
            duplex: "half"
          });
          let contentTypeHeader;
          if (utils$1.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
            headers.setContentType(contentTypeHeader);
          }
          if (_request.body) {
            const [onProgress, flush] = onUploadProgress && progressEventDecorator(
              requestContentLength,
              progressEventReducer(asyncDecorator(onUploadProgress))
            ) || [];
            data = trackRequestStream(_request.body, onProgress, flush);
          }
        }
      } else if (mustEnforceStreamBody && !isRequestSupported && isReadableStreamSupported && method !== "get" && method !== "head") {
        data = trackRequestStream(data);
      } else if (mustEnforceStreamBody && isRequestSupported && !supportsRequestStream && method !== "get" && method !== "head") {
        throw new AxiosError$1(
          "Stream request bodies are not supported by the current fetch implementation",
          AxiosError$1.ERR_NOT_SUPPORT,
          config,
          request
        );
      }
      if (!utils$1.isString(withCredentials)) {
        withCredentials = withCredentials ? "include" : "omit";
      }
      const isCredentialsSupported = isRequestSupported && "credentials" in Request.prototype;
      if (utils$1.isFormData(data)) {
        const contentType = headers.getContentType();
        if (contentType && /^multipart\/form-data/i.test(contentType) && !/boundary=/i.test(contentType)) {
          headers.delete("content-type");
        }
      }
      headers.set("User-Agent", "axios/" + VERSION$1, false);
      const safeFetchOptions = fetchOptions == null ? fetchOptions : Object.assign(/* @__PURE__ */ Object.create(null), fetchOptions);
      if (safeFetchOptions) {
        delete safeFetchOptions.body;
        delete safeFetchOptions.headers;
        delete safeFetchOptions.method;
        delete safeFetchOptions.signal;
        delete safeFetchOptions.duplex;
        delete safeFetchOptions.credentials;
      }
      const resolvedOptions = Object.assign(/* @__PURE__ */ Object.create(null), safeFetchOptions, {
        signal: composedSignal,
        method: method.toUpperCase(),
        headers: toByteStringHeaderObject(headers.normalize()),
        body: data,
        duplex: "half",
        credentials: isCredentialsSupported ? withCredentials : void 0
      });
      if (isRequestSupported) {
        utils$1.forEach(DEFAULT_REQUEST_OPTIONS, (value, key) => {
          if (resolvedOptions[key] === void 0) {
            resolvedOptions[key] = value;
          }
        });
        if (resolvedOptions.signal === void 0) {
          resolvedOptions.signal = null;
        }
        if (resolvedOptions.body === void 0) {
          resolvedOptions.body = null;
        }
      }
      if (maxRedirects === 0) {
        resolvedOptions.redirect = "manual";
        if (safeFetchOptions) {
          safeFetchOptions.redirect = "manual";
        }
      }
      request = isRequestSupported && new Request(url2, resolvedOptions);
      let response = await (isRequestSupported ? _fetch(request, safeFetchOptions) : _fetch(url2, resolvedOptions));
      const responseHeaders = AxiosHeaders$1.from(response.headers);
      if (hasMaxContentLength) {
        const declaredLength = utils$1.toFiniteNumber(responseHeaders.getContentLength());
        if (declaredLength != null && declaredLength > maxContentLength) {
          throw new AxiosError$1(
            "maxContentLength size of " + maxContentLength + " exceeded",
            AxiosError$1.ERR_BAD_RESPONSE,
            config,
            request
          );
        }
      }
      const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
      if (supportsResponseStream && response.body && (onDownloadProgress || hasMaxContentLength || isStreamResponse && unsubscribe)) {
        const options = {};
        ["status", "statusText", "headers"].forEach((prop) => {
          options[prop] = response[prop];
        });
        const responseContentLength = utils$1.toFiniteNumber(responseHeaders.getContentLength());
        const [onProgress, flush] = onDownloadProgress && progressEventDecorator(
          responseContentLength,
          progressEventReducer(asyncDecorator(onDownloadProgress), true)
        ) || [];
        let bytesRead = 0;
        const onChunkProgress = (loadedBytes) => {
          if (hasMaxContentLength) {
            bytesRead = loadedBytes;
            if (bytesRead > maxContentLength) {
              throw new AxiosError$1(
                "maxContentLength size of " + maxContentLength + " exceeded",
                AxiosError$1.ERR_BAD_RESPONSE,
                config,
                request
              );
            }
          }
          onProgress && onProgress(loadedBytes);
        };
        response = new Response2(
          trackStream(response.body, DEFAULT_CHUNK_SIZE, onChunkProgress, () => {
            flush && flush();
            unsubscribe && unsubscribe();
          }),
          options
        );
      }
      responseType = responseType || "text";
      let responseData = await resolvers[utils$1.findKey(resolvers, responseType) || "text"](
        response,
        config
      );
      if (hasMaxContentLength && !supportsResponseStream && !isStreamResponse) {
        let materializedSize;
        if (responseData != null) {
          if (typeof responseData.byteLength === "number") {
            materializedSize = responseData.byteLength;
          } else if (typeof responseData.size === "number") {
            materializedSize = responseData.size;
          } else if (typeof responseData === "string") {
            materializedSize = typeof TextEncoder2 === "function" ? new TextEncoder2().encode(responseData).byteLength : responseData.length;
          }
        }
        if (typeof materializedSize === "number" && materializedSize > maxContentLength) {
          throw new AxiosError$1(
            "maxContentLength size of " + maxContentLength + " exceeded",
            AxiosError$1.ERR_BAD_RESPONSE,
            config,
            request
          );
        }
      }
      !isStreamResponse && unsubscribe && unsubscribe();
      return await new Promise((resolve, reject) => {
        settle(resolve, reject, {
          data: responseData,
          headers: AxiosHeaders$1.from(response.headers),
          status: response.status,
          statusText: response.statusText,
          config,
          request
        });
      });
    } catch (err) {
      unsubscribe && unsubscribe();
      if (composedSignal && composedSignal.aborted && composedSignal.reason instanceof AxiosError$1) {
        const canceledError = composedSignal.reason;
        canceledError.config = config;
        request && (canceledError.request = request);
        if (err !== canceledError) {
          Object.defineProperty(canceledError, "cause", {
            __proto__: null,
            value: err,
            writable: true,
            enumerable: false,
            configurable: true
          });
        }
        throw canceledError;
      }
      if (pendingBodyError) {
        request && !pendingBodyError.request && (pendingBodyError.request = request);
        throw pendingBodyError;
      }
      if (err instanceof AxiosError$1) {
        request && !err.request && (err.request = request);
        throw err;
      }
      if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) {
        const networkError = new AxiosError$1(
          "Network Error",
          AxiosError$1.ERR_NETWORK,
          config,
          request,
          err && err.response
        );
        Object.defineProperty(networkError, "cause", {
          __proto__: null,
          value: err.cause || err,
          writable: true,
          enumerable: false,
          configurable: true
        });
        throw networkError;
      }
      throw AxiosError$1.from(err, err && err.code, config, request, err && err.response);
    }
  };
};
const seedCache = /* @__PURE__ */ new Map();
const getFetch = (config) => {
  let env = config && config.env || {};
  const { fetch: fetch2, Request, Response: Response2 } = env;
  const seeds = [Request, Response2, fetch2];
  let len = seeds.length, i = len, seed, target, map = seedCache;
  while (i--) {
    seed = seeds[i];
    target = map.get(seed);
    target === void 0 && map.set(seed, target = i ? /* @__PURE__ */ new Map() : factory(env));
    map = target;
  }
  return target;
};
getFetch();
const knownAdapters = {
  http: httpAdapter,
  xhr: xhrAdapter,
  fetch: {
    get: getFetch
  }
};
utils$1.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      Object.defineProperty(fn, "name", { __proto__: null, value });
    } catch (e) {
    }
    Object.defineProperty(fn, "adapterName", { __proto__: null, value });
  }
});
const renderReason = (reason) => `- ${reason}`;
const isResolvedHandle = (adapter) => utils$1.isFunction(adapter) || adapter === null || adapter === false;
function getAdapter$1(adapters2, config) {
  adapters2 = utils$1.isArray(adapters2) ? adapters2 : [adapters2];
  const { length } = adapters2;
  let nameOrAdapter;
  let adapter;
  const rejectedReasons = {};
  for (let i = 0; i < length; i++) {
    nameOrAdapter = adapters2[i];
    let id;
    adapter = nameOrAdapter;
    if (!isResolvedHandle(nameOrAdapter)) {
      adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
      if (adapter === void 0) {
        throw new AxiosError$1(`Unknown adapter '${id}'`);
      }
    }
    if (adapter && (utils$1.isFunction(adapter) || (adapter = adapter.get(config)))) {
      break;
    }
    rejectedReasons[id || "#" + i] = adapter;
  }
  if (!adapter) {
    const reasons = Object.entries(rejectedReasons).map(
      ([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build")
    );
    let s = length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified";
    throw new AxiosError$1(
      `There is no suitable adapter to dispatch the request ` + s,
      AxiosError$1.ERR_NOT_SUPPORT
    );
  }
  return adapter;
}
const adapters = {
  /**
   * Resolve an adapter from a list of adapter names or functions.
   * @type {Function}
   */
  getAdapter: getAdapter$1,
  /**
   * Exposes all known adapters
   * @type {Object<string, Function|Object>}
   */
  adapters: knownAdapters
};
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
  if (config.signal && config.signal.aborted) {
    throw new CanceledError$1(null, config);
  }
}
function dispatchRequest(_config) {
  const config = utils$1.toSafeFlatObject(_config);
  throwIfCancellationRequested(config);
  config.headers = AxiosHeaders$1.from(utils$1.getSafeProp(config, "headers"));
  config.data = transformData.call(config, config.transformRequest);
  if (["post", "put", "patch"].indexOf(config.method) !== -1) {
    config.headers.setContentType("application/x-www-form-urlencoded", false);
  }
  const adapter = adapters.getAdapter(config.adapter || defaults.adapter, config);
  return adapter(config).then(
    function onAdapterResolution(response) {
      throwIfCancellationRequested(config);
      config.response = response;
      try {
        response.data = transformData.call(config, config.transformResponse, response);
      } finally {
        delete config.response;
      }
      response.headers = AxiosHeaders$1.from(response.headers);
      return response;
    },
    function onAdapterRejection(reason) {
      if (!isCancel$1(reason)) {
        throwIfCancellationRequested(config);
        if (reason && reason.response) {
          config.response = reason.response;
          try {
            reason.response.data = transformData.call(
              config,
              config.transformResponse,
              reason.response
            );
          } finally {
            delete config.response;
          }
          reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
        }
      }
      return Promise.reject(reason);
    }
  );
}
const validators$1 = {};
["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
  validators$1[type] = function validator2(thing) {
    return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
  };
});
const deprecatedWarnings = {};
validators$1.transitional = function transitional(validator2, version, message) {
  function formatMessage(opt, desc) {
    return "[Axios v" + VERSION$1 + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
  }
  return (value, opt, opts) => {
    if (validator2 === false) {
      throw new AxiosError$1(
        formatMessage(opt, " has been removed" + (version ? " in " + version : "")),
        AxiosError$1.ERR_DEPRECATED
      );
    }
    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      console.warn(
        formatMessage(
          opt,
          " has been deprecated since v" + version + " and will be removed in the near future"
        )
      );
    }
    return validator2 ? validator2(value, opt, opts) : true;
  };
};
validators$1.spelling = function spelling(correctSpelling) {
  return (value, opt) => {
    console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
    return true;
  };
};
function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== "object" || options === null) {
    throw new AxiosError$1("options must be an object", AxiosError$1.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator2 = Object.prototype.hasOwnProperty.call(schema, opt) ? schema[opt] : void 0;
    if (validator2) {
      const value = options[opt];
      const result = value === void 0 || validator2(value, opt, options);
      if (result !== true) {
        throw new AxiosError$1(
          "option " + opt + " must be " + result,
          AxiosError$1.ERR_BAD_OPTION_VALUE
        );
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError$1("Unknown option " + opt, AxiosError$1.ERR_BAD_OPTION);
    }
  }
}
const validator = {
  assertOptions,
  validators: validators$1
};
const validators = validator.validators;
let Axios$1 = class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig || {};
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager()
    };
  }
  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        try {
          let dummy = {};
          Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error();
          const dummyStack = dummy.stack;
          let stack = "";
          if (typeof dummyStack === "string") {
            const firstNewlineIndex = dummyStack.indexOf("\n");
            stack = firstNewlineIndex === -1 ? "" : dummyStack.slice(firstNewlineIndex + 1);
          }
          if (!err.stack) {
            err.stack = stack;
          } else if (stack) {
            const firstNewlineIndex = stack.indexOf("\n");
            const secondNewlineIndex = firstNewlineIndex === -1 ? -1 : stack.indexOf("\n", firstNewlineIndex + 1);
            const stackWithoutTwoTopLines = secondNewlineIndex === -1 ? "" : stack.slice(secondNewlineIndex + 1);
            if (!String(err.stack).endsWith(stackWithoutTwoTopLines)) {
              err.stack += "\n" + stack;
            }
          }
        } catch (e) {
        }
      }
      throw err;
    }
  }
  _request(configOrUrl, config) {
    if (typeof configOrUrl === "string") {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }
    config = mergeConfig$1(this.defaults, config);
    const { transitional: transitional2, paramsSerializer, headers } = config;
    if (transitional2 !== void 0) {
      validator.assertOptions(
        transitional2,
        {
          silentJSONParsing: validators.transitional(validators.boolean),
          forcedJSONParsing: validators.transitional(validators.boolean),
          clarifyTimeoutError: validators.transitional(validators.boolean),
          legacyInterceptorReqResOrdering: validators.transitional(validators.boolean),
          advertiseZstdAcceptEncoding: validators.transitional(validators.boolean),
          validateStatusUndefinedResolves: validators.transitional(validators.boolean)
        },
        false
      );
    }
    if (paramsSerializer != null) {
      if (utils$1.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer
        };
      } else {
        validator.assertOptions(
          paramsSerializer,
          {
            encode: validators.function,
            serialize: validators.function
          },
          true
        );
      }
    }
    if (config.allowAbsoluteUrls !== void 0) ;
    else if (this.defaults.allowAbsoluteUrls !== void 0) {
      config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
    } else {
      config.allowAbsoluteUrls = true;
    }
    validator.assertOptions(
      config,
      {
        baseUrl: validators.spelling("baseURL"),
        withXsrfToken: validators.spelling("withXSRFToken")
      },
      true
    );
    config.method = (utils$1.getSafeProp(config, "method") || utils$1.getSafeProp(this.defaults, "method") || "get").toLowerCase();
    let contextHeaders = headers && utils$1.merge(headers.common, headers[config.method]);
    headers && utils$1.forEach(methodList.concat("common"), (method) => {
      delete headers[method];
    });
    config.headers = AxiosHeaders$1.concat(contextHeaders, headers);
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
        return;
      }
      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
      const transitional3 = config.transitional || transitionalDefaults;
      const legacyInterceptorReqResOrdering = transitional3 && transitional3.legacyInterceptorReqResOrdering;
      if (legacyInterceptorReqResOrdering) {
        requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
      } else {
        requestInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
      }
    });
    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });
    let promise;
    let i = 0;
    let len;
    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), void 0];
      chain.unshift(...requestInterceptorChain);
      chain.push(...responseInterceptorChain);
      len = chain.length;
      promise = Promise.resolve(config);
      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }
      return promise;
    }
    len = requestInterceptorChain.length;
    let newConfig = config;
    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled ? onFulfilled(newConfig) : newConfig;
      } catch (error) {
        if (!onRejected) {
          promise = Promise.reject(error);
          break;
        }
        try {
          const rejectedResult = onRejected.call(this, error);
          if (utils$1.isThenable(rejectedResult)) {
            promise = Promise.resolve(rejectedResult).then(
              () => dispatchRequest.call(this, newConfig)
            );
          }
        } catch (rejectedError) {
          promise = Promise.reject(rejectedError);
        }
        break;
      }
    }
    if (!promise) {
      try {
        promise = dispatchRequest.call(this, newConfig);
      } catch (error) {
        promise = Promise.reject(error);
      }
    }
    i = 0;
    len = responseInterceptorChain.length;
    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }
    return promise;
  }
  getUri(config) {
    config = mergeConfig$1(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls, config);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
};
utils$1.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
  Axios$1.prototype[method] = function(url2, config) {
    return this.request(
      mergeConfig$1(config || {}, {
        method,
        url: url2,
        data: config && utils$1.hasOwnProp(config, "data") ? config.data : void 0
      })
    );
  };
});
utils$1.forEach(["post", "put", "patch", "query"], function forEachMethodWithData(method) {
  function generateHTTPMethod(isForm) {
    return function httpMethod(url2, data, config) {
      return this.request(
        mergeConfig$1(config || {}, {
          method,
          headers: isForm ? {
            "Content-Type": "multipart/form-data"
          } : {},
          url: url2,
          data
        })
      );
    };
  }
  Axios$1.prototype[method] = generateHTTPMethod();
  if (method !== "query") {
    Axios$1.prototype[method + "Form"] = generateHTTPMethod(true);
  }
});
let CancelToken$1 = class CancelToken {
  constructor(executor) {
    if (typeof executor !== "function") {
      throw new TypeError("executor must be a function.");
    }
    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });
    const token = this;
    this.promise.then((cancel) => {
      if (!token._listeners) return;
      let i = token._listeners.length;
      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });
    this.promise.then = (onfulfilled) => {
      let _resolve;
      const promise = new Promise((resolve) => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);
      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };
      return promise;
    };
    executor(function cancel(message, config, request) {
      if (token.reason) {
        return;
      }
      token.reason = new CanceledError$1(message, config, request);
      resolvePromise(token.reason);
    });
  }
  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }
  /**
   * Subscribe to the cancel signal
   */
  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }
    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }
  /**
   * Unsubscribe from the cancel signal
   */
  unsubscribe(listener) {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }
  toAbortSignal() {
    const controller = new AbortController();
    const abort = (err) => {
      controller.abort(err);
    };
    this.subscribe(abort);
    controller.signal.unsubscribe = () => this.unsubscribe(abort);
    return controller.signal;
  }
  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
};
function spread$1(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
}
function isAxiosError$1(payload) {
  return utils$1.isObject(payload) && payload.isAxiosError === true;
}
const HttpStatusCode$1 = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  /**
   * @deprecated Use `ContentTooLarge` instead.
   */
  PayloadTooLarge: 413,
  ContentTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  /**
   * @deprecated Use `UnprocessableContent` instead.
   */
  UnprocessableEntity: 422,
  UnprocessableContent: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerReturnsAnUnknownError: 520,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526
};
Object.entries(HttpStatusCode$1).forEach(([key, value]) => {
  if (HttpStatusCode$1[value] === void 0) {
    HttpStatusCode$1[value] = key;
  }
});
function createInstance(defaultConfig) {
  const context = new Axios$1(defaultConfig);
  const instance2 = bind(Axios$1.prototype.request, context);
  utils$1.extend(instance2, Axios$1.prototype, context, { allOwnKeys: true });
  utils$1.extend(instance2, context, null, { allOwnKeys: true });
  instance2.create = function create2(instanceConfig) {
    return createInstance(mergeConfig$1(defaultConfig, instanceConfig));
  };
  return instance2;
}
const axios = createInstance(defaults);
axios.Axios = Axios$1;
axios.CanceledError = CanceledError$1;
axios.CancelToken = CancelToken$1;
axios.isCancel = isCancel$1;
axios.VERSION = VERSION$1;
axios.toFormData = toFormData$1;
axios.AxiosError = AxiosError$1;
axios.Cancel = axios.CanceledError;
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = spread$1;
axios.isAxiosError = isAxiosError$1;
axios.mergeConfig = mergeConfig$1;
axios.AxiosHeaders = AxiosHeaders$1;
axios.formToJSON = (thing) => formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);
axios.getAdapter = adapters.getAdapter;
axios.HttpStatusCode = HttpStatusCode$1;
axios.default = axios;
const {
  Axios: Axios2,
  AxiosError: AxiosError2,
  CanceledError: CanceledError2,
  isCancel,
  CancelToken: CancelToken2,
  VERSION,
  all: all2,
  Cancel,
  isAxiosError,
  spread,
  toFormData,
  AxiosHeaders: AxiosHeaders2,
  HttpStatusCode,
  formToJSON,
  getAdapter,
  mergeConfig,
  create
} = axios;
function filePathToLocalUrl(absPath) {
  const normalized = absPath.replace(/\\/g, "/");
  const encoded = normalized.split("/").map(encodeURIComponent).join("/");
  return `local:///${encoded}`;
}
const DEFAULT_CACHE_MAX_SIZE_MB = 4096;
const MIN_CACHE_SIZE_MB = 256;
const MAX_CACHE_SIZE_MB = 102400;
const DEFAULT_CLEANUP_POLICY = "lru";
const CACHE_ROOT_DIR_NAME = "cache";
const MUSIC_CACHE_DIR = "music";
const LYRIC_CACHE_DIR = "lyrics";
const AUDIO_EXTENSION_BY_CONTENT_TYPE = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/flac": ".flac",
  "audio/x-flac": ".flac",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/webm": ".webm"
};
class DiskCacheManager {
  metadataStore;
  pendingMusicDownloads = /* @__PURE__ */ new Map();
  constructor() {
    this.metadataStore = new Store({
      name: "disk-cache",
      defaults: {
        musicEntries: {},
        lyricEntries: {}
      }
    });
  }
  initialize() {
    this.ensureConfigDefaults();
    this.ensureDirectories();
  }
  getDefaultCacheDirectory() {
    return path__namespace.join(electron.app.getPath("userData"), CACHE_ROOT_DIR_NAME);
  }
  normalizeCacheDirectory(directory) {
    const trimmed = directory?.trim();
    if (!trimmed) {
      return this.getDefaultCacheDirectory();
    }
    if (path__namespace.isAbsolute(trimmed)) {
      return path__namespace.normalize(trimmed);
    }
    return path__namespace.resolve(trimmed);
  }
  normalizeCacheSize(maxSizeMB) {
    if (!Number.isFinite(maxSizeMB)) {
      return DEFAULT_CACHE_MAX_SIZE_MB;
    }
    return Math.min(MAX_CACHE_SIZE_MB, Math.max(MIN_CACHE_SIZE_MB, Math.floor(maxSizeMB)));
  }
  ensureConfigDefaults() {
    const configStore = getStore();
    if (!configStore) return;
    const defaultDirectory = this.getDefaultCacheDirectory();
    if (configStore.get("set.enableDiskCache") === void 0) {
      configStore.set("set.enableDiskCache", true);
    }
    if (!configStore.get("set.diskCacheDir")) {
      configStore.set("set.diskCacheDir", defaultDirectory);
    }
    if (configStore.get("set.diskCacheMaxSizeMB") === void 0) {
      configStore.set("set.diskCacheMaxSizeMB", DEFAULT_CACHE_MAX_SIZE_MB);
    }
    if (!configStore.get("set.diskCacheCleanupPolicy")) {
      configStore.set("set.diskCacheCleanupPolicy", DEFAULT_CLEANUP_POLICY);
    }
  }
  saveConfig(config) {
    const configStore = getStore();
    if (!configStore) return;
    configStore.set("set.enableDiskCache", config.enabled);
    configStore.set("set.diskCacheDir", config.directory);
    configStore.set("set.diskCacheMaxSizeMB", config.maxSizeMB);
    configStore.set("set.diskCacheCleanupPolicy", config.cleanupPolicy);
  }
  getMusicCacheDir(directory) {
    return path__namespace.join(directory, MUSIC_CACHE_DIR);
  }
  getLyricCacheDir(directory) {
    return path__namespace.join(directory, LYRIC_CACHE_DIR);
  }
  ensureDirectories(config) {
    const currentConfig = config ?? this.getCacheConfig();
    try {
      fs__namespace.mkdirSync(currentConfig.directory, { recursive: true });
      fs__namespace.mkdirSync(this.getMusicCacheDir(currentConfig.directory), { recursive: true });
      fs__namespace.mkdirSync(this.getLyricCacheDir(currentConfig.directory), { recursive: true });
    } catch (error) {
      console.error("Failed to create cache directory:", error);
    }
  }
  isPathInsideDirectory(filePath, directory) {
    const normalizedFile = path__namespace.resolve(filePath);
    const normalizedDir = path__namespace.resolve(directory);
    const relativePath = path__namespace.relative(normalizedDir, normalizedFile);
    return relativePath === "" || !relativePath.startsWith("..") && !path__namespace.isAbsolute(relativePath);
  }
  async moveFile(sourcePath, targetPath) {
    try {
      await fs__namespace.promises.rename(sourcePath, targetPath);
      return;
    } catch {
      await fs__namespace.promises.copyFile(sourcePath, targetPath);
      await fs__namespace.promises.unlink(sourcePath);
    }
  }
  generateAvailableFilePath(directory, fileName) {
    const extension = path__namespace.extname(fileName);
    const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
    let nextPath = path__namespace.join(directory, fileName);
    let index = 1;
    while (fs__namespace.existsSync(nextPath)) {
      nextPath = path__namespace.join(directory, `${baseName}_${index}${extension}`);
      index++;
    }
    return nextPath;
  }
  async migrateEntriesToDirectory(type, oldDirectory, newDirectory) {
    let migratedCount = 0;
    if (type === "music") {
      const entries2 = this.getMusicEntries();
      for (const [key, entry] of Object.entries(entries2)) {
        if (!this.isPathInsideDirectory(entry.filePath, oldDirectory)) {
          continue;
        }
        if (!fs__namespace.existsSync(entry.filePath)) {
          delete entries2[key];
          continue;
        }
        try {
          const targetPath = this.generateAvailableFilePath(
            newDirectory,
            path__namespace.basename(entry.filePath)
          );
          await this.moveFile(entry.filePath, targetPath);
          const latestSize = fs__namespace.statSync(targetPath).size;
          entries2[key] = {
            ...entry,
            filePath: targetPath,
            size: latestSize
          };
          migratedCount++;
        } catch (error) {
          console.error(`Failed to migrate music cache: ${key}`, error);
        }
      }
      this.setMusicEntries(entries2);
      return migratedCount;
    }
    const entries = this.getLyricEntries();
    for (const [key, entry] of Object.entries(entries)) {
      if (!this.isPathInsideDirectory(entry.filePath, oldDirectory)) {
        continue;
      }
      if (!fs__namespace.existsSync(entry.filePath)) {
        delete entries[key];
        continue;
      }
      try {
        const targetPath = this.generateAvailableFilePath(
          newDirectory,
          path__namespace.basename(entry.filePath)
        );
        await this.moveFile(entry.filePath, targetPath);
        const latestSize = fs__namespace.statSync(targetPath).size;
        entries[key] = {
          ...entry,
          filePath: targetPath,
          size: latestSize
        };
        migratedCount++;
      } catch (error) {
        console.error(`Failed to migrate lyrics cache: ${key}`, error);
      }
    }
    this.setLyricEntries(entries);
    return migratedCount;
  }
  async removeEntriesInDirectory(type, directory) {
    let removedCount = 0;
    if (type === "music") {
      const entries2 = this.getMusicEntries();
      for (const [key, entry] of Object.entries(entries2)) {
        if (!this.isPathInsideDirectory(entry.filePath, directory)) {
          continue;
        }
        if (fs__namespace.existsSync(entry.filePath)) {
          try {
            await fs__namespace.promises.unlink(entry.filePath);
          } catch (error) {
            console.error(`Failed to delete music cache files: ${entry.filePath}`, error);
          }
        }
        delete entries2[key];
        removedCount++;
      }
      this.setMusicEntries(entries2);
      return removedCount;
    }
    const entries = this.getLyricEntries();
    for (const [key, entry] of Object.entries(entries)) {
      if (!this.isPathInsideDirectory(entry.filePath, directory)) {
        continue;
      }
      if (fs__namespace.existsSync(entry.filePath)) {
        try {
          await fs__namespace.promises.unlink(entry.filePath);
        } catch (error) {
          console.error(`Failed to delete lyrics cache file: ${entry.filePath}`, error);
        }
      }
      delete entries[key];
      removedCount++;
    }
    this.setLyricEntries(entries);
    return removedCount;
  }
  async cleanupCacheDirectory(oldDirectory) {
    const oldMusicDir = this.getMusicCacheDir(oldDirectory);
    const oldLyricDir = this.getLyricCacheDir(oldDirectory);
    for (const targetDir of [oldMusicDir, oldLyricDir, oldDirectory]) {
      if (!fs__namespace.existsSync(targetDir)) {
        continue;
      }
      try {
        const files = await fs__namespace.promises.readdir(targetDir);
        if (files.length === 0) {
          await fs__namespace.promises.rmdir(targetDir);
        }
      } catch (error) {
        console.warn(`Failed to clear cache directory: ${targetDir}`, error);
      }
    }
  }
  getCacheConfig() {
    const configStore = getStore();
    const defaultDirectory = this.getDefaultCacheDirectory();
    const enabled = Boolean(configStore?.get("set.enableDiskCache") ?? true);
    const directory = this.normalizeCacheDirectory(
      String(configStore?.get("set.diskCacheDir") ?? defaultDirectory)
    );
    const rawMaxSize = Number(
      configStore?.get("set.diskCacheMaxSizeMB") ?? DEFAULT_CACHE_MAX_SIZE_MB
    );
    const maxSizeMB = this.normalizeCacheSize(rawMaxSize);
    const rawPolicy = String(
      configStore?.get("set.diskCacheCleanupPolicy") ?? DEFAULT_CLEANUP_POLICY
    );
    const cleanupPolicy = rawPolicy === "fifo" ? "fifo" : "lru";
    const normalizedConfig = {
      enabled,
      directory,
      maxSizeMB,
      cleanupPolicy
    };
    return normalizedConfig;
  }
  async updateCacheConfig(partial) {
    const current = this.getCacheConfig();
    const updated = {
      enabled: partial.enabled ?? current.enabled,
      directory: this.normalizeCacheDirectory(partial.directory ?? current.directory),
      maxSizeMB: this.normalizeCacheSize(partial.maxSizeMB ?? current.maxSizeMB),
      cleanupPolicy: partial.cleanupPolicy === "fifo" || partial.cleanupPolicy === "lru" ? partial.cleanupPolicy : current.cleanupPolicy
    };
    this.saveConfig(updated);
    this.ensureDirectories(updated);
    await this.enforceCacheLimit();
    return updated;
  }
  async switchCacheDirectory(payload) {
    const currentConfig = this.getCacheConfig();
    const targetDirectory = this.normalizeCacheDirectory(payload.directory);
    const action = payload.action === "migrate" || payload.action === "destroy" || payload.action === "keep" ? payload.action : "keep";
    if (targetDirectory === currentConfig.directory) {
      return {
        success: true,
        config: currentConfig,
        migratedFiles: 0,
        destroyedFiles: 0
      };
    }
    await this.pruneMissingEntries();
    const oldDirectory = currentConfig.directory;
    const oldMusicDir = this.getMusicCacheDir(oldDirectory);
    const oldLyricDir = this.getLyricCacheDir(oldDirectory);
    const newMusicDir = this.getMusicCacheDir(targetDirectory);
    const newLyricDir = this.getLyricCacheDir(targetDirectory);
    let migratedFiles = 0;
    let destroyedFiles = 0;
    try {
      fs__namespace.mkdirSync(targetDirectory, { recursive: true });
      fs__namespace.mkdirSync(newMusicDir, { recursive: true });
      fs__namespace.mkdirSync(newLyricDir, { recursive: true });
      if (action === "migrate") {
        migratedFiles += await this.migrateEntriesToDirectory("music", oldMusicDir, newMusicDir);
        migratedFiles += await this.migrateEntriesToDirectory("lyrics", oldLyricDir, newLyricDir);
      } else if (action === "destroy") {
        destroyedFiles += await this.removeEntriesInDirectory("music", oldMusicDir);
        destroyedFiles += await this.removeEntriesInDirectory("lyrics", oldLyricDir);
        await this.cleanupCacheDirectory(oldDirectory);
      }
      const updatedConfig = {
        ...currentConfig,
        directory: targetDirectory
      };
      this.saveConfig(updatedConfig);
      this.ensureDirectories(updatedConfig);
      await this.enforceCacheLimit();
      return {
        success: true,
        config: updatedConfig,
        migratedFiles,
        destroyedFiles
      };
    } catch (error) {
      console.error("Failed to switch cache directory:", error);
      return {
        success: false,
        config: currentConfig,
        migratedFiles,
        destroyedFiles
      };
    }
  }
  getMusicEntries() {
    return this.metadataStore.get("musicEntries");
  }
  getLyricEntries() {
    return this.metadataStore.get("lyricEntries");
  }
  setMusicEntries(entries) {
    this.metadataStore.set("musicEntries", entries);
  }
  setLyricEntries(entries) {
    this.metadataStore.set("lyricEntries", entries);
  }
  buildMusicKey(songId, source) {
    const safeSource = (source || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${songId}_${safeSource}`;
  }
  buildLyricKey(songId) {
    return String(songId);
  }
  buildUrlHash(url2) {
    return node_crypto.createHash("sha1").update(url2).digest("hex");
  }
  toLocalUrl(filePath) {
    return filePathToLocalUrl(path__namespace.normalize(filePath));
  }
  isRemoteAudioUrl(url2) {
    return /^https?:\/\//i.test(url2);
  }
  getExtensionFromUrl(url2) {
    try {
      const pathname = new URL(url2).pathname;
      const ext = path__namespace.extname(pathname).toLowerCase();
      if (ext && ext.length <= 6) {
        return ext;
      }
    } catch {
    }
    return "";
  }
  getExtensionFromContentType(contentType) {
    if (!contentType) {
      return "";
    }
    const normalizedType = contentType.split(";")[0].trim().toLowerCase();
    return AUDIO_EXTENSION_BY_CONTENT_TYPE[normalizedType] || "";
  }
  resolveAudioExtension(url2, contentType) {
    const urlExtension = this.getExtensionFromUrl(url2);
    if (urlExtension) {
      return urlExtension;
    }
    const contentTypeExtension = this.getExtensionFromContentType(contentType);
    if (contentTypeExtension) {
      return contentTypeExtension;
    }
    return ".mp3";
  }
  async pruneMissingEntries() {
    let musicEntriesChanged = false;
    const musicEntries = this.getMusicEntries();
    const nextMusicEntries = { ...musicEntries };
    for (const [key, entry] of Object.entries(musicEntries)) {
      if (!fs__namespace.existsSync(entry.filePath)) {
        delete nextMusicEntries[key];
        musicEntriesChanged = true;
        continue;
      }
      try {
        const currentSize = fs__namespace.statSync(entry.filePath).size;
        if (currentSize !== entry.size) {
          nextMusicEntries[key] = {
            ...entry,
            size: currentSize
          };
          musicEntriesChanged = true;
        }
      } catch {
        delete nextMusicEntries[key];
        musicEntriesChanged = true;
      }
    }
    if (musicEntriesChanged) {
      this.setMusicEntries(nextMusicEntries);
    }
    let lyricEntriesChanged = false;
    const lyricEntries = this.getLyricEntries();
    const nextLyricEntries = { ...lyricEntries };
    for (const [key, entry] of Object.entries(lyricEntries)) {
      if (!fs__namespace.existsSync(entry.filePath)) {
        delete nextLyricEntries[key];
        lyricEntriesChanged = true;
        continue;
      }
      try {
        const currentSize = fs__namespace.statSync(entry.filePath).size;
        if (currentSize !== entry.size) {
          nextLyricEntries[key] = {
            ...entry,
            size: currentSize
          };
          lyricEntriesChanged = true;
        }
      } catch {
        delete nextLyricEntries[key];
        lyricEntriesChanged = true;
      }
    }
    if (lyricEntriesChanged) {
      this.setLyricEntries(nextLyricEntries);
    }
  }
  getEvictionItems() {
    const musicItems = Object.entries(this.getMusicEntries()).map(
      ([key, entry]) => ({
        type: "music",
        key,
        filePath: entry.filePath,
        size: entry.size,
        createdAt: entry.createdAt,
        lastAccessAt: entry.lastAccessAt
      })
    );
    const lyricItems = Object.entries(this.getLyricEntries()).map(
      ([key, entry]) => ({
        type: "lyrics",
        key,
        filePath: entry.filePath,
        size: entry.size,
        createdAt: entry.createdAt,
        lastAccessAt: entry.lastAccessAt
      })
    );
    return [...musicItems, ...lyricItems];
  }
  async removeEntry(type, key) {
    if (type === "music") {
      const entries2 = this.getMusicEntries();
      const entry2 = entries2[key];
      if (!entry2) return 0;
      if (fs__namespace.existsSync(entry2.filePath)) {
        try {
          await fs__namespace.promises.unlink(entry2.filePath);
        } catch (error) {
          console.error("Failed to delete music cache files:", error);
        }
      }
      delete entries2[key];
      this.setMusicEntries(entries2);
      return entry2.size;
    }
    const entries = this.getLyricEntries();
    const entry = entries[key];
    if (!entry) return 0;
    if (fs__namespace.existsSync(entry.filePath)) {
      try {
        await fs__namespace.promises.unlink(entry.filePath);
      } catch (error) {
        console.error("Failed to delete lyrics cache file:", error);
      }
    }
    delete entries[key];
    this.setLyricEntries(entries);
    return entry.size;
  }
  async enforceCacheLimit() {
    const config = this.getCacheConfig();
    await this.pruneMissingEntries();
    const maxBytes = config.maxSizeMB * 1024 * 1024;
    const items = this.getEvictionItems();
    let totalBytes = items.reduce((sum, item) => sum + item.size, 0);
    if (totalBytes <= maxBytes) {
      return;
    }
    items.sort((a, b) => {
      if (config.cleanupPolicy === "fifo") {
        return a.createdAt - b.createdAt;
      }
      return a.lastAccessAt - b.lastAccessAt;
    });
    for (const item of items) {
      if (totalBytes <= maxBytes) break;
      const removedSize = await this.removeEntry(item.type, item.key);
      totalBytes -= removedSize;
    }
  }
  updateMusicAccess(key) {
    const entries = this.getMusicEntries();
    const entry = entries[key];
    if (!entry) return;
    entries[key] = {
      ...entry,
      lastAccessAt: Date.now(),
      playCount: entry.playCount + 1
    };
    this.setMusicEntries(entries);
  }
  updateLyricAccess(key) {
    const entries = this.getLyricEntries();
    const entry = entries[key];
    if (!entry) return;
    entries[key] = {
      ...entry,
      lastAccessAt: Date.now()
    };
    this.setLyricEntries(entries);
  }
  async getCachedMusicUrl(payload) {
    const key = this.buildMusicKey(payload.songId, payload.source);
    const entries = this.getMusicEntries();
    const entry = entries[key];
    if (!entry) return null;
    if (!fs__namespace.existsSync(entry.filePath)) {
      delete entries[key];
      this.setMusicEntries(entries);
      return null;
    }
    if (entry.urlHash !== this.buildUrlHash(payload.url)) {
      return null;
    }
    this.updateMusicAccess(key);
    return this.toLocalUrl(entry.filePath);
  }
  async downloadAndCacheMusic(payload) {
    const config = this.getCacheConfig();
    if (!config.enabled || !this.isRemoteAudioUrl(payload.url)) {
      return;
    }
    this.ensureDirectories(config);
    const key = this.buildMusicKey(payload.songId, payload.source);
    const source = payload.source || "unknown";
    const urlHash = this.buildUrlHash(payload.url);
    const musicDir = this.getMusicCacheDir(config.directory);
    const existingEntry = this.getMusicEntries()[key];
    if (existingEntry && existingEntry.urlHash === urlHash && fs__namespace.existsSync(existingEntry.filePath)) {
      return;
    }
    const tempFilePath = path__namespace.join(musicDir, `${key}_${Date.now()}.tmp`);
    let contentType;
    try {
      const response = await axios({
        url: payload.url,
        method: "GET",
        responseType: "stream",
        timeout: 3e4,
        maxRedirects: 5
      });
      contentType = typeof response.headers["content-type"] === "string" ? response.headers["content-type"] : void 0;
      const writer = fs__namespace.createWriteStream(tempFilePath);
      await new Promise((resolve, reject) => {
        response.data.on("error", reject);
        writer.on("error", reject);
        writer.on("finish", resolve);
        response.data.pipe(writer);
      });
      const extension = this.resolveAudioExtension(payload.url, contentType);
      const filePath = path__namespace.join(musicDir, `${key}_${urlHash}${extension}`);
      if (fs__namespace.existsSync(filePath)) {
        await fs__namespace.promises.unlink(tempFilePath);
      } else {
        await fs__namespace.promises.rename(tempFilePath, filePath);
      }
      if (existingEntry?.filePath && existingEntry.filePath !== filePath && fs__namespace.existsSync(existingEntry.filePath)) {
        await fs__namespace.promises.unlink(existingEntry.filePath);
      }
      const size = fs__namespace.statSync(filePath).size;
      const now = Date.now();
      const entries = this.getMusicEntries();
      entries[key] = {
        key,
        songId: payload.songId,
        source,
        filePath,
        urlHash,
        size,
        createdAt: existingEntry?.createdAt || now,
        lastAccessAt: now,
        playCount: (existingEntry?.playCount || 0) + 1,
        title: payload.title,
        artist: payload.artist
      };
      this.setMusicEntries(entries);
      await this.enforceCacheLimit();
    } catch (error) {
      console.error(`Caching music failed: ${payload.songId}`, error);
      if (fs__namespace.existsSync(tempFilePath)) {
        try {
          await fs__namespace.promises.unlink(tempFilePath);
        } catch {
        }
      }
    }
  }
  queueMusicCache(payload) {
    const key = this.buildMusicKey(payload.songId, payload.source);
    const task = this.pendingMusicDownloads.get(key);
    if (task) return;
    const pendingTask = this.downloadAndCacheMusic(payload).finally(() => {
      this.pendingMusicDownloads.delete(key);
    });
    this.pendingMusicDownloads.set(key, pendingTask);
  }
  async resolveMusicUrl(payload) {
    if (!payload || !payload.url || !payload.songId) {
      return {
        url: payload?.url || "",
        cached: false,
        queued: false
      };
    }
    if (/^(local|file):\/\//i.test(payload.url)) {
      return {
        url: payload.url,
        cached: true,
        queued: false
      };
    }
    const config = this.getCacheConfig();
    if (!config.enabled) {
      return {
        url: payload.url,
        cached: false,
        queued: false
      };
    }
    await this.pruneMissingEntries();
    const cachedUrl = await this.getCachedMusicUrl(payload);
    if (cachedUrl) {
      return {
        url: cachedUrl,
        cached: true,
        queued: false
      };
    }
    this.queueMusicCache(payload);
    return {
      url: payload.url,
      cached: false,
      queued: true
    };
  }
  async cacheLyric(songId, lyricData) {
    try {
      const config = this.getCacheConfig();
      if (!config.enabled) {
        return false;
      }
      this.ensureDirectories(config);
      const key = this.buildLyricKey(songId);
      const lyricDir = this.getLyricCacheDir(config.directory);
      const filePath = path__namespace.join(lyricDir, `${key}.json`);
      const content = JSON.stringify(lyricData);
      await fs__namespace.promises.writeFile(filePath, content, "utf8");
      const now = Date.now();
      const entries = this.getLyricEntries();
      entries[key] = {
        key,
        songId,
        filePath,
        size: Buffer.byteLength(content, "utf8"),
        createdAt: entries[key]?.createdAt || now,
        lastAccessAt: now
      };
      this.setLyricEntries(entries);
      await this.enforceCacheLimit();
      return true;
    } catch (error) {
      console.error("Failed to cache lyrics:", error);
      return false;
    }
  }
  async getCachedLyric(songId) {
    try {
      const config = this.getCacheConfig();
      if (!config.enabled) {
        return void 0;
      }
      const key = this.buildLyricKey(songId);
      const entries = this.getLyricEntries();
      const entry = entries[key];
      if (!entry) {
        return void 0;
      }
      if (!fs__namespace.existsSync(entry.filePath)) {
        delete entries[key];
        this.setLyricEntries(entries);
        return void 0;
      }
      const content = await fs__namespace.promises.readFile(entry.filePath, "utf8");
      this.updateLyricAccess(key);
      return JSON.parse(content);
    } catch (error) {
      console.error("Failed to read cached lyrics:", error);
      return void 0;
    }
  }
  async clearByType(type) {
    if (type === "music") {
      const keys2 = Object.keys(this.getMusicEntries());
      for (const key of keys2) {
        await this.removeEntry("music", key);
      }
      return;
    }
    const keys = Object.keys(this.getLyricEntries());
    for (const key of keys) {
      await this.removeEntry("lyrics", key);
    }
  }
  async clearCache(scope = "all") {
    try {
      if (scope === "all" || scope === "music") {
        await this.clearByType("music");
      }
      if (scope === "all" || scope === "lyrics") {
        await this.clearByType("lyrics");
      }
      return true;
    } catch (error) {
      console.error("Failed to clear cache:", error);
      return false;
    }
  }
  async clearLyricCache() {
    return await this.clearCache("lyrics");
  }
  async getCacheStats() {
    const config = this.getCacheConfig();
    await this.pruneMissingEntries();
    const musicEntries = Object.values(this.getMusicEntries());
    const lyricEntries = Object.values(this.getLyricEntries());
    const musicSizeBytes = musicEntries.reduce((sum, entry) => sum + entry.size, 0);
    const lyricSizeBytes = lyricEntries.reduce((sum, entry) => sum + entry.size, 0);
    const totalSizeBytes = musicSizeBytes + lyricSizeBytes;
    const totalLimitBytes = config.maxSizeMB * 1024 * 1024;
    const usage = totalLimitBytes > 0 ? Math.min(1, totalSizeBytes / totalLimitBytes) : 0;
    return {
      enabled: config.enabled,
      directory: config.directory,
      maxSizeMB: config.maxSizeMB,
      cleanupPolicy: config.cleanupPolicy,
      totalSizeBytes,
      musicSizeBytes,
      lyricSizeBytes,
      totalFiles: musicEntries.length + lyricEntries.length,
      musicFiles: musicEntries.length,
      lyricFiles: lyricEntries.length,
      usage
    };
  }
}
const cacheManager = new DiskCacheManager();
function initializeCacheManager() {
  const CLEAR_LYRIC_CHANNELS = ["clear-lyric-cache", "clear-lyrics-cache"];
  cacheManager.initialize();
  electron.ipcMain.handle("cache-lyric", async (_, id, lyricData) => {
    return await cacheManager.cacheLyric(id, lyricData);
  });
  electron.ipcMain.handle("get-cached-lyric", async (_, id) => {
    return await cacheManager.getCachedLyric(id);
  });
  electron.ipcMain.handle("resolve-cached-music-url", async (_, payload) => {
    return await cacheManager.resolveMusicUrl(payload);
  });
  electron.ipcMain.handle("get-disk-cache-config", async () => {
    return cacheManager.getCacheConfig();
  });
  electron.ipcMain.handle("set-disk-cache-config", async (_, partial) => {
    return await cacheManager.updateCacheConfig(partial);
  });
  electron.ipcMain.handle("switch-disk-cache-directory", async (_, payload) => {
    return await cacheManager.switchCacheDirectory(payload);
  });
  electron.ipcMain.handle("get-disk-cache-stats", async () => {
    return await cacheManager.getCacheStats();
  });
  electron.ipcMain.handle("clear-disk-cache", async (_, scope = "all") => {
    return await cacheManager.clearCache(scope);
  });
  for (const channel of CLEAR_LYRIC_CHANNELS) {
    electron.ipcMain.handle(channel, async () => {
      return await cacheManager.clearLyricCache();
    });
  }
}
function sanitizeFilename$1(filename) {
  return filename.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ").trim();
}
function parseLyrics(lyricsText) {
  const lyricMap = /* @__PURE__ */ new Map();
  const lines = lyricsText.split("\n");
  for (const line of lines) {
    const timeTagMatches = line.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/g);
    if (!timeTagMatches) continue;
    const content = line.replace(/\[\d{2}:\d{2}(\.\d{1,3})?\]/g, "").trim();
    if (!content) continue;
    for (const timeTag of timeTagMatches) {
      lyricMap.set(timeTag, content);
    }
  }
  return lyricMap;
}
function mergeLyrics(originalLyrics, translatedLyrics) {
  const mergedLines = [];
  for (const [timeTag, originalContent] of originalLyrics.entries()) {
    const translatedContent = translatedLyrics.get(timeTag);
    mergedLines.push(`${timeTag}${originalContent}`);
    if (translatedContent) {
      mergedLines.push(`${timeTag}${translatedContent}`);
    }
  }
  mergedLines.sort((a, b) => {
    const timeA = a.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/)?.[0] || "";
    const timeB = b.match(/\[\d{2}:\d{2}(\.\d{1,3})?\]/)?.[0] || "";
    return timeA.localeCompare(timeB);
  });
  return mergedLines.join("\n");
}
class DownloadManager {
  tasks = /* @__PURE__ */ new Map();
  abortControllers = /* @__PURE__ */ new Map();
  activeCount = 0;
  maxConcurrent = 3;
  persistStore;
  batchTracker = /* @__PURE__ */ new Map();
  mainWindow = null;
  progressThrottles = /* @__PURE__ */ new Map();
  persistTimer = null;
  pendingCompletions = [];
  completionNoticeTimer = null;
  completionNoticeDeadline = null;
  constructor() {
    this.persistStore = new Store({
      name: "download-queue",
      defaults: { tasks: [] }
    });
    this.loadPersistedQueue();
    this.cleanOrphanedTempFiles();
    electron.app.on("before-quit", () => {
      for (const [taskId, controller] of this.abortControllers.entries()) {
        controller.abort();
        const task = this.tasks.get(taskId);
        if (task && task.state === "downloading") {
          task.state = "paused";
        }
      }
      this.persistQueueSync();
    });
  }
  setMainWindow(win) {
    this.mainWindow = win;
  }
  registerIpcHandlers() {
    electron.ipcMain.handle("download:add", (_, payload) => this.addTask(payload));
    electron.ipcMain.handle("download:add-batch", (_, payload) => this.addBatch(payload));
    electron.ipcMain.handle("download:pause", (_, taskId) => this.pauseTask(taskId));
    electron.ipcMain.handle("download:resume", (_, taskId) => this.resumeTask(taskId));
    electron.ipcMain.handle("download:cancel", (_, taskId) => this.cancelTask(taskId));
    electron.ipcMain.handle("download:cancel-all", () => this.cancelAll());
    electron.ipcMain.handle("download:get-queue", () => this.getQueue());
    electron.ipcMain.on("download:set-concurrency", (_, value) => this.setConcurrency(value));
    electron.ipcMain.handle("download:get-completed", () => this.getCompleted());
    electron.ipcMain.handle(
      "download:delete-completed",
      (_, filePath) => this.deleteCompleted(filePath)
    );
    electron.ipcMain.handle("download:clear-completed", () => this.clearCompleted());
    electron.ipcMain.handle(
      "download:get-embedded-lyrics",
      (_, filePath) => this.getEmbeddedLyrics(filePath)
    );
    electron.ipcMain.handle(
      "download:provide-url",
      (_, payload) => this.provideUrl(payload.taskId, payload.url)
    );
  }
  addTask(payload) {
    const taskId = crypto.randomUUID();
    const task = {
      taskId,
      url: payload.url,
      filename: payload.filename,
      songInfo: payload.songInfo,
      type: payload.type || "mp3",
      state: "queued",
      progress: 0,
      loaded: 0,
      total: 0,
      tempFilePath: "",
      finalFilePath: "",
      createdAt: Date.now()
    };
    this.tasks.set(taskId, task);
    this.persistQueue();
    this.sendStateChange(task);
    this.processQueue();
    return taskId;
  }
  addBatch(payload) {
    const batchId = crypto.randomUUID();
    const taskIds = [];
    this.batchTracker.set(batchId, {
      total: payload.items.length,
      finished: 0,
      success: 0
    });
    for (const item of payload.items) {
      const taskId = crypto.randomUUID();
      const task = {
        taskId,
        url: item.url,
        filename: item.filename,
        songInfo: item.songInfo,
        type: item.type || "mp3",
        state: "queued",
        progress: 0,
        loaded: 0,
        total: 0,
        tempFilePath: "",
        finalFilePath: "",
        createdAt: Date.now(),
        batchId
      };
      this.tasks.set(taskId, task);
      taskIds.push(taskId);
      this.sendStateChange(task);
    }
    this.persistQueue();
    this.processQueue();
    return { batchId, taskIds };
  }
  pauseTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(taskId);
    }
    task.state = "paused";
    this.persistQueue();
    this.sendStateChange(task);
    return true;
  }
  resumeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task || task.state !== "paused" && task.state !== "error") return false;
    task.state = "queued";
    this.persistQueue();
    this.sendStateChange(task);
    this.processQueue();
    return true;
  }
  async cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(taskId);
    }
    if (task.tempFilePath) {
      try {
        await fs__namespace.promises.unlink(task.tempFilePath);
      } catch (e) {
        if (e?.code !== "ENOENT") {
          console.error("Failed to delete temp file:", e);
        }
      }
    }
    task.state = "cancelled";
    this.sendStateChange(task);
    this.tasks.delete(taskId);
    this.persistQueue();
    return true;
  }
  async cancelAll() {
    const taskIds = [...this.tasks.keys()];
    for (const taskId of taskIds) {
      await this.cancelTask(taskId);
    }
  }
  getQueue() {
    return [...this.tasks.values()].filter(
      (t) => t.state === "queued" || t.state === "paused" || t.state === "downloading"
    );
  }
  setConcurrency(value) {
    this.maxConcurrent = Math.max(1, Math.min(5, value));
    this.processQueue();
  }
  async getCompleted() {
    try {
      const configStore = getStore();
      const songInfos = configStore.get("downloadedSongs") || {};
      const entriesArray = Object.entries(songInfos);
      const validEntriesPromises = await Promise.all(
        entriesArray.map(async ([filePath, info]) => {
          try {
            const exists = await fs__namespace.promises.access(filePath).then(() => true).catch(() => false);
            return exists ? info : null;
          } catch {
            return null;
          }
        })
      );
      const validSongs = validEntriesPromises.filter((song) => song !== null).sort((a, b) => (b.downloadTime || 0) - (a.downloadTime || 0));
      const newSongInfos = validSongs.reduce(
        (acc, song) => {
          if (song && song.path) {
            acc[song.path] = song;
          }
          return acc;
        },
        {}
      );
      configStore.set("downloadedSongs", newSongInfos);
      return validSongs;
    } catch (error) {
      console.error("Error getting downloaded music:", error);
      return [];
    }
  }
  async deleteCompleted(filePath) {
    try {
      try {
        await fs__namespace.promises.unlink(filePath);
      } catch (error) {
        if (error?.code === "ENOENT") {
          return false;
        }
        console.error("Error deleting file:", error);
      }
      const configStore = getStore();
      const songInfos = configStore.get("downloadedSongs") || {};
      delete songInfos[filePath];
      configStore.set("downloadedSongs", songInfos);
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }
  clearCompleted() {
    const configStore = getStore();
    configStore.set("downloadedSongs", {});
    return true;
  }
  async getEmbeddedLyrics(filePath) {
    try {
      const ext = path__namespace.extname(filePath).toLowerCase();
      if (ext === ".mp3") {
        const tags = await NodeID3__namespace.Promise.read(filePath);
        if (tags && tags.unsynchronisedLyrics) {
          const uslt = tags.unsynchronisedLyrics;
          return uslt.text || (typeof uslt === "string" ? uslt : null);
        }
        return null;
      }
      if (ext === ".flac") {
        const metadata = await mm__namespace.parseFile(filePath);
        const native = metadata.native;
        for (const format of Object.keys(native)) {
          const tags = native[format];
          const lyricsTag = tags.find(
            (t) => t.id.toUpperCase() === "LYRICS" || t.id.toUpperCase() === "UNSYNCEDLYRICS"
          );
          if (lyricsTag) return lyricsTag.value;
        }
        return null;
      }
      return null;
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      console.error("Error reading embedded lyrics:", error);
      return null;
    }
  }
  provideUrl(taskId, url2) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.url = url2;
    if (task.state === "queued" || task.state === "paused") {
      task.state = "queued";
      this.sendStateChange(task);
      this.processQueue();
    }
    return true;
  }
  processQueue() {
    const queued = [...this.tasks.values()].filter((t) => t.state === "queued").sort((a, b) => a.createdAt - b.createdAt);
    while (this.activeCount < this.maxConcurrent && queued.length > 0) {
      const task = queued.shift();
      this.activeCount++;
      task.state = "downloading";
      this.sendStateChange(task);
      this.downloadTask(task);
    }
  }
  async downloadTask(task) {
    const controller = new AbortController();
    this.abortControllers.set(task.taskId, controller);
    let writer = null;
    try {
      const configStore = getStore();
      const downloadPath2 = configStore.get("set.downloadPath") || electron.app.getPath("downloads");
      const nameFormat = configStore.get("set.downloadNameFormat") || "{songName} - {artistName}";
      let formattedFilename = task.filename;
      if (task.songInfo) {
        const artistName = task.songInfo.ar?.map((a) => a.name).join("、") || "unknown artist";
        const songName = task.songInfo.name || task.filename;
        const albumName = task.songInfo.al?.name || "unknown album";
        formattedFilename = nameFormat.replace(/\{songName\}/g, songName).replace(/\{artistName\}/g, artistName).replace(/\{albumName\}/g, albumName);
      }
      const sanitizedFilename = sanitizeFilename$1(formattedFilename);
      const tempDir = path__namespace.join(os__namespace.tmpdir(), "AlgerMusicPlayerTemp");
      if (!fs__namespace.existsSync(tempDir)) {
        fs__namespace.mkdirSync(tempDir, { recursive: true });
      }
      if (!task.tempFilePath) {
        task.tempFilePath = path__namespace.join(tempDir, `${task.taskId}_${sanitizedFilename}.tmp`);
      }
      const headers = {};
      if (task.loaded > 0 && fs__namespace.existsSync(task.tempFilePath)) {
        headers["Range"] = `bytes=${task.loaded}-`;
      }
      const response = await axios({
        url: task.url,
        method: "GET",
        responseType: "stream",
        timeout: 3e4,
        signal: controller.signal,
        headers,
        validateStatus: (status2) => status2 >= 200 && status2 < 300 || status2 === 403 || status2 === 410
      });
      const status = response.status;
      if (status === 403 || status === 410) {
        response.data?.destroy?.();
        this.sendToRenderer("download:request-url", {
          taskId: task.taskId,
          songInfo: task.songInfo
        });
        task.state = "queued";
        this.sendStateChange(task);
        this.activeCount--;
        this.processQueue();
        return;
      }
      let appendMode = false;
      if (status === 206) {
        appendMode = true;
        const contentRange = response.headers["content-range"];
        if (contentRange) {
          const totalMatch = contentRange.match(/\/(\d+)/);
          if (totalMatch) {
            task.total = parseInt(totalMatch[1], 10);
          }
        }
      } else {
        task.loaded = 0;
        const contentLength = response.headers["content-length"];
        task.total = contentLength ? parseInt(contentLength, 10) : 0;
      }
      writer = fs__namespace.createWriteStream(task.tempFilePath, {
        flags: appendMode ? "a" : "w"
      });
      response.data.on("data", (chunk) => {
        task.loaded += chunk.length;
        if (task.total > 0) {
          task.progress = Math.round(task.loaded / task.total * 100);
        }
        const now = Date.now();
        const lastSent = this.progressThrottles.get(task.taskId) || 0;
        if (now - lastSent >= 250) {
          this.progressThrottles.set(task.taskId, now);
          this.sendProgress(task);
        }
      });
      await new Promise((resolve, reject) => {
        writer.on("finish", () => resolve());
        writer.on("error", (error) => reject(error));
        response.data.on("error", (error) => reject(error));
        response.data.pipe(writer);
      });
      task.progress = 100;
      this.sendProgress(task);
      await this.finalizeDownload(task, sanitizedFilename, downloadPath2);
    } catch (error) {
      if (axios.isCancel(error) || error?.name === "AbortError" || error?.code === "ERR_CANCELED") {
        return;
      }
      console.error(`Download error for task ${task.taskId}:`, error);
      task.state = "error";
      task.error = error.message || "Download failed";
      this.sendStateChange(task);
      this.handleBatchError(task);
      if (task.tempFilePath) {
        try {
          await fs__namespace.promises.unlink(task.tempFilePath);
        } catch (e) {
          if (e?.code !== "ENOENT") {
            console.error("Failed to delete temp file:", e);
          }
        }
        task.tempFilePath = "";
        task.loaded = 0;
      }
      this.persistQueue();
    } finally {
      this.abortControllers.delete(task.taskId);
      this.progressThrottles.delete(task.taskId);
      if (task.state !== "queued") {
        this.activeCount--;
      }
      this.processQueue();
    }
  }
  async finalizeDownload(task, sanitizedFilename, downloadPath2) {
    const configStore = getStore();
    const apiPort = configStore.get("set.musicApiPort") || 30488;
    let fileExtension = "";
    try {
      const fileType$1 = await fileType.fileTypeFromFile(task.tempFilePath);
      if (fileType$1 && fileType$1.ext) {
        fileExtension = `.${fileType$1.ext}`;
      } else {
        const metadata = await mm__namespace.parseFile(task.tempFilePath);
        if (metadata && metadata.format) {
          const container = metadata.format.container || "";
          const codec = metadata.format.codec || "";
          const formatMap = {
            mp3: ["MPEG", "MP3", "mp3"],
            aac: ["AAC"],
            flac: ["FLAC"],
            ogg: ["Ogg", "Vorbis"],
            wav: ["WAV", "PCM"],
            m4a: ["M4A", "MP4"]
          };
          const format = Object.entries(formatMap).find(
            ([_, keywords]) => keywords.some((keyword) => container.includes(keyword) || codec.includes(keyword))
          );
          fileExtension = format ? `.${format[0]}` : `.${task.type || "mp3"}`;
        } else {
          fileExtension = `.${task.type || "mp3"}`;
        }
      }
    } catch {
      fileExtension = `.${task.type || "mp3"}`;
    }
    let lyricsContent = "";
    let lyricData = null;
    try {
      if (task.songInfo?.id) {
        const lyricsResponse = await axios.get(
          `http://localhost:${apiPort}/lyric?id=${task.songInfo.id}`
        );
        if (lyricsResponse.data && (lyricsResponse.data.lrc || lyricsResponse.data.tlyric)) {
          lyricData = lyricsResponse.data;
          if (lyricsResponse.data.lrc && lyricsResponse.data.lrc.lyric) {
            lyricsContent = lyricsResponse.data.lrc.lyric;
            if (lyricsResponse.data.tlyric && lyricsResponse.data.tlyric.lyric) {
              const originalLyrics = parseLyrics(lyricsResponse.data.lrc.lyric);
              const translatedLyrics = parseLyrics(lyricsResponse.data.tlyric.lyric);
              lyricsContent = mergeLyrics(originalLyrics, translatedLyrics);
            }
          }
        }
      }
    } catch (lyricError) {
      console.error("Failed to download lyrics:", lyricError);
    }
    let coverImageBuffer = null;
    try {
      const picUrl = task.songInfo?.picUrl || task.songInfo?.al?.picUrl;
      if (picUrl && picUrl !== "/images/default_cover.png") {
        if (picUrl.startsWith("data:")) {
          const base64Match = picUrl.match(/^data:[^;]+;base64,(.+)$/);
          if (base64Match) {
            coverImageBuffer = Buffer.from(base64Match[1], "base64");
          }
        } else {
          const coverResponse = await axios({
            url: picUrl.replace("http://", "https://"),
            method: "GET",
            responseType: "arraybuffer",
            timeout: 1e4
          });
          const originalCoverBuffer = Buffer.from(coverResponse.data);
          const TWO_MB = 2 * 1024 * 1024;
          if (originalCoverBuffer.length > TWO_MB) {
            try {
              const image = electron.nativeImage.createFromBuffer(originalCoverBuffer);
              const size = image.getSize();
              const maxSize = 1600;
              let newWidth = size.width;
              let newHeight = size.height;
              if (size.width > maxSize || size.height > maxSize) {
                const ratio = Math.min(maxSize / size.width, maxSize / size.height);
                newWidth = Math.round(size.width * ratio);
                newHeight = Math.round(size.height * ratio);
              }
              const resizedImage = image.resize({
                width: newWidth,
                height: newHeight,
                quality: "good"
              });
              coverImageBuffer = resizedImage.toJPEG(80);
            } catch {
              coverImageBuffer = originalCoverBuffer;
            }
          } else {
            coverImageBuffer = originalCoverBuffer;
          }
        }
      }
    } catch (coverError) {
      console.error("Failed to download cover:", coverError);
    }
    const info = task.songInfo;
    const fileFormat = fileExtension.toLowerCase();
    const artistNames = (info?.ar || info?.song?.artists)?.map((a) => a.name).join("、") || "unknown artist";
    if ([".mp3"].includes(fileFormat)) {
      try {
        const tags = {
          title: info?.name,
          artist: artistNames,
          TPE1: artistNames,
          TPE2: artistNames,
          album: info?.al?.name || info?.song?.album?.name || info?.name || task.filename,
          APIC: {
            imageBuffer: coverImageBuffer,
            type: { id: 3, name: "front cover" },
            description: "Album cover",
            mime: "image/jpeg"
          },
          USLT: {
            language: "chi",
            description: "Lyrics",
            text: lyricsContent || ""
          },
          trackNumber: info?.no || void 0,
          year: info?.publishTime ? new Date(info.publishTime).getFullYear().toString() : void 0
        };
        await NodeID3__namespace.Promise.write(tags, task.tempFilePath);
      } catch (err) {
        console.error("Error writing ID3 tags:", err);
      }
    } else if ([".flac"].includes(fileFormat)) {
      try {
        const tagMap = {
          TITLE: info?.name,
          ARTIST: artistNames,
          ALBUM: info?.al?.name || info?.song?.album?.name || info?.name || task.filename,
          LYRICS: lyricsContent || "",
          TRACKNUMBER: info?.no ? String(info.no) : "",
          DATE: info?.publishTime ? new Date(info.publishTime).getFullYear().toString() : ""
        };
        await flacTagger.writeFlacTags(
          {
            tagMap,
            picture: coverImageBuffer ? { buffer: coverImageBuffer, mime: "image/jpeg" } : void 0
          },
          task.tempFilePath
        );
      } catch (err) {
        console.error("Error writing FLAC tags:", err);
      }
    }
    const finalFilePath = await this.moveToDownloadPath(
      task.tempFilePath,
      downloadPath2,
      sanitizedFilename,
      fileExtension
    );
    task.finalFilePath = finalFilePath;
    if (lyricsContent && configStore.get("set.downloadSaveLyric")) {
      try {
        const lrcFilePath = finalFilePath.replace(/\.[^.]+$/, ".lrc");
        await fs__namespace.promises.writeFile(lrcFilePath, lyricsContent, "utf-8");
      } catch (lrcError) {
        console.error("Failed to save lyrics file:", lrcError);
      }
    }
    const songInfos = configStore.get("downloadedSongs") || {};
    const defaultInfo = {
      name: task.filename,
      ar: [{ name: "local music" }],
      picUrl: "/images/default_cover.png"
    };
    const totalSize = task.total;
    const newSongInfo = {
      id: task.songInfo?.id || 0,
      name: task.songInfo?.name || task.filename,
      filename: task.filename,
      picUrl: task.songInfo?.picUrl || task.songInfo?.al?.picUrl || defaultInfo.picUrl,
      ar: task.songInfo?.ar || defaultInfo.ar,
      al: task.songInfo?.al || {
        picUrl: task.songInfo?.picUrl || defaultInfo.picUrl,
        name: task.songInfo?.name || task.filename
      },
      size: totalSize,
      path: finalFilePath,
      downloadTime: Date.now(),
      type: fileExtension.substring(1),
      lyric: lyricData
    };
    songInfos[finalFilePath] = newSongInfo;
    configStore.set("downloadedSongs", songInfos);
    task.state = "completed";
    this.sendStateChange(task);
    if (task.batchId) {
      const batch = this.batchTracker.get(task.batchId);
      if (batch) {
        batch.finished++;
        batch.success++;
        if (batch.finished >= batch.total) {
          const failed = batch.total - batch.success;
          try {
            const notification = new electron.Notification({
              title: "Batch download completed",
              body: `common ${batch.total} First, success ${batch.success} head${failed > 0 ? `,fail ${failed} head` : ""}`,
              silent: false
            });
            notification.show();
          } catch (e) {
            console.error("Failed to send batch notification:", e);
          }
          const batchEvent = {
            batchId: task.batchId,
            total: batch.total,
            success: batch.success,
            failed
          };
          this.sendToRenderer("download:batch-complete", batchEvent);
          this.batchTracker.delete(task.batchId);
        }
      }
    } else {
      this.queueCompletionNotice(
        `${task.songInfo?.name || task.filename} - ${artistNames}`,
        finalFilePath
      );
    }
    this.tasks.delete(task.taskId);
    this.persistQueue();
  }
  async moveToDownloadPath(tempFilePath, downloadPath2, sanitizedFilename, fileExtension) {
    const MAX_DEDUP_ATTEMPTS = 1e3;
    let finalFilePath = path__namespace.join(downloadPath2, `${sanitizedFilename}${fileExtension}`);
    for (let counter = 1; ; counter++) {
      try {
        await fs__namespace.promises.copyFile(tempFilePath, finalFilePath, fs__namespace.constants.COPYFILE_EXCL);
        break;
      } catch (error) {
        if (error?.code !== "EEXIST" || counter > MAX_DEDUP_ATTEMPTS) {
          throw error;
        }
        finalFilePath = path__namespace.join(
          downloadPath2,
          `${sanitizedFilename} (${counter})${fileExtension}`
        );
      }
    }
    try {
      await fs__namespace.promises.unlink(tempFilePath);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        console.error("Failed to delete temp file after copy:", error);
      }
    }
    return finalFilePath;
  }
  handleBatchError(task) {
    if (!task.batchId) return;
    const batch = this.batchTracker.get(task.batchId);
    if (!batch) return;
    batch.finished++;
    if (batch.finished >= batch.total) {
      const failed = batch.total - batch.success;
      try {
        const notification = new electron.Notification({
          title: "Batch download completed",
          body: `common ${batch.total} First, success ${batch.success} head${failed > 0 ? `,fail ${failed} head` : ""}`,
          silent: false
        });
        notification.show();
      } catch (e) {
        console.error("Failed to send batch notification:", e);
      }
      const batchEvent = {
        batchId: task.batchId,
        total: batch.total,
        success: batch.success,
        failed
      };
      this.sendToRenderer("download:batch-complete", batchEvent);
      this.batchTracker.delete(task.batchId);
    }
  }
  static COMPLETION_NOTICE_DEBOUNCE = 1500;
  static COMPLETION_NOTICE_MAX_WAIT = 8e3;
  queueCompletionNotice(title, filePath) {
    this.pendingCompletions.push({ title, filePath });
    if (this.completionNoticeTimer) {
      clearTimeout(this.completionNoticeTimer);
    }
    this.completionNoticeTimer = setTimeout(
      () => this.flushCompletionNotice(),
      DownloadManager.COMPLETION_NOTICE_DEBOUNCE
    );
    if (!this.completionNoticeDeadline) {
      this.completionNoticeDeadline = setTimeout(
        () => this.flushCompletionNotice(),
        DownloadManager.COMPLETION_NOTICE_MAX_WAIT
      );
    }
  }
  flushCompletionNotice() {
    if (this.completionNoticeTimer) {
      clearTimeout(this.completionNoticeTimer);
      this.completionNoticeTimer = null;
    }
    if (this.completionNoticeDeadline) {
      clearTimeout(this.completionNoticeDeadline);
      this.completionNoticeDeadline = null;
    }
    const items = this.pendingCompletions;
    this.pendingCompletions = [];
    if (items.length === 0) return;
    const last = items[items.length - 1];
    try {
      const notification = new electron.Notification({
        title: "Download completed",
        body: items.length === 1 ? last.title : `common ${items.length} Song download completed`,
        silent: false
      });
      notification.on("click", () => {
        electron.shell.showItemInFolder(last.filePath);
      });
      notification.show();
    } catch (e) {
      console.error("Failed to send notification:", e);
    }
  }
  sendToRenderer(channel, data) {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(channel, data);
      }
    } catch {
    }
  }
  sendStateChange(task) {
    const event = {
      taskId: task.taskId,
      state: task.state,
      task: { ...task }
    };
    this.sendToRenderer("download:state-change", event);
  }
  sendProgress(task) {
    const event = {
      taskId: task.taskId,
      progress: task.progress,
      loaded: task.loaded,
      total: task.total
    };
    this.sendToRenderer("download:progress", event);
  }
  persistQueue() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.persistQueueSync();
    }, 500);
  }
  persistQueueSync() {
    const tasksToSave = [...this.tasks.values()].filter(
      (t) => t.state === "queued" || t.state === "paused" || t.state === "downloading"
    );
    const serialized = tasksToSave.map((t) => ({
      ...t,
      state: t.state === "downloading" ? "paused" : t.state
    }));
    this.persistStore.set("tasks", serialized);
  }
  loadPersistedQueue() {
    try {
      const saved = this.persistStore.get("tasks", []);
      for (const task of saved) {
        if (task.state === "downloading") {
          task.state = "paused";
        }
        this.tasks.set(task.taskId, task);
      }
    } catch (error) {
      console.error("Failed to load persisted download queue:", error);
    }
  }
  cleanOrphanedTempFiles() {
    try {
      const tempDir = path__namespace.join(os__namespace.tmpdir(), "AlgerMusicPlayerTemp");
      if (!fs__namespace.existsSync(tempDir)) return;
      const knownTempPaths = new Set(
        [...this.tasks.values()].map((t) => t.tempFilePath).filter(Boolean)
      );
      const files = fs__namespace.readdirSync(tempDir);
      for (const file of files) {
        if (!file.endsWith(".tmp")) continue;
        const fullPath = path__namespace.join(tempDir, file);
        if (!knownTempPaths.has(fullPath)) {
          try {
            fs__namespace.unlinkSync(fullPath);
          } catch {
          }
        }
      }
    } catch {
    }
  }
}
let instance = null;
function initializeDownloadManager() {
  instance = new DownloadManager();
  instance.registerIpcHandlers();
}
function setDownloadManagerWindow(mainWindow2) {
  if (instance) {
    instance.setMainWindow(mainWindow2);
  }
}
const audioCacheStore = new Store({
  name: "audioCache",
  defaults: {
    cache: {}
  }
});
function sanitizeFilename(filename) {
  return filename.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ").trim();
}
function buildLocalFileResponse(filePath, total, rangeHeader) {
  const range416 = () => new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
  let start = 0;
  let end = total - 1;
  let partial = false;
  if (rangeHeader) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!m || !m[1] && !m[2]) return range416();
    if (m[1]) {
      start = parseInt(m[1], 10);
      if (m[2]) end = Math.min(parseInt(m[2], 10), end);
    } else {
      start = Math.max(0, total - parseInt(m[2], 10));
    }
    if (start > end || start >= total) return range416();
    partial = true;
  }
  return new Response(
    stream.Readable.toWeb(fs__namespace.createReadStream(filePath, { start, end })),
    {
      status: partial ? 206 : 200,
      headers: {
        "Content-Length": String(end - start + 1),
        "Accept-Ranges": "bytes",
        ...partial && { "Content-Range": `bytes ${start}-${end}/${total}` }
      }
    }
  );
}
function initializeFileManager() {
  electron.protocol.handle("local", async (request) => {
    try {
      let filePath = decodeURIComponent(request.url.replace(/^local:\/\/\/?/, ""));
      if (/^\/[a-zA-Z]:\//.test(filePath)) {
        filePath = filePath.slice(1);
      }
      if (process.platform !== "win32" && !filePath.startsWith("/")) {
        filePath = "/" + filePath;
      }
      filePath = path__namespace.normalize(filePath);
      const stat = await fs__namespace.promises.stat(filePath).catch(() => null);
      if (!stat?.isFile()) {
        console.error("File not found:", filePath);
        return new Response(null, { status: 404 });
      }
      return buildLocalFileResponse(filePath, stat.size, request.headers.get("range"));
    } catch (error) {
      console.error("Error handling local protocol:", error);
      return new Response(null, { status: 500 });
    }
  });
  electron.ipcMain.handle("check-file-exists", (_, filePath) => {
    try {
      return fs__namespace.existsSync(filePath);
    } catch (error) {
      console.error("Error checking if file exists:", error);
      return false;
    }
  });
  electron.ipcMain.handle("get-supported-audio-formats", () => {
    return {
      formats: [
        { ext: "mp3", name: "MP3" },
        { ext: "m4a", name: "M4A/AAC" },
        { ext: "flac", name: "FLAC" },
        { ext: "wav", name: "WAV" },
        { ext: "ogg", name: "OGG Vorbis" },
        { ext: "aac", name: "AAC" }
      ],
      default: "mp3"
    };
  });
  electron.ipcMain.handle("select-directory", async () => {
    const result = await electron.dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select directory"
    });
    return result;
  });
  electron.ipcMain.on("open-directory", (_, filePath) => {
    try {
      if (!filePath) {
        console.error("Invalid file path: Path is empty");
        return;
      }
      const normalizedPath = path__namespace.normalize(filePath);
      if (fs__namespace.statSync(normalizedPath).isDirectory()) {
        electron.shell.openPath(normalizedPath);
      } else {
        electron.shell.showItemInFolder(normalizedPath);
      }
    } catch (error) {
      console.error("Failed to open path:", error);
    }
  });
  electron.ipcMain.handle("get-downloads-path", () => {
    return electron.app.getPath("downloads");
  });
  electron.ipcMain.handle(
    "save-lyric-file",
    async (_, { filename, lrcContent }) => {
      try {
        const configStore = getStore();
        const downloadPath2 = configStore.get("set.downloadPath") || electron.app.getPath("downloads");
        const sanitizedName = sanitizeFilename(filename);
        let filePath = path__namespace.join(downloadPath2, `${sanitizedName}.lrc`);
        let counter = 1;
        while (fs__namespace.existsSync(filePath)) {
          filePath = path__namespace.join(downloadPath2, `${sanitizedName} (${counter}).lrc`);
          counter++;
        }
        await fs__namespace.promises.writeFile(filePath, lrcContent, "utf-8");
        return { success: true, path: filePath };
      } catch (error) {
        console.error("Failed to save lyrics file:", error);
        return { success: false, error: error.message };
      }
    }
  );
  electron.ipcMain.on("clear-audio-cache", () => {
    audioCacheStore.set("cache", {});
    const tempDir = path__namespace.join(electron.app.getPath("userData"), "AudioCache");
    if (fs__namespace.existsSync(tempDir)) {
      try {
        fs__namespace.readdirSync(tempDir).forEach((file) => {
          const filePath = path__namespace.join(tempDir, file);
          if (file.endsWith(".mp3") || file.endsWith(".m4a")) {
            fs__namespace.unlinkSync(filePath);
          }
        });
      } catch (error) {
        console.error("Failed to clear audio cache files:", error);
      }
    }
  });
  electron.ipcMain.handle("import-custom-api-plugin", async () => {
    const result = await electron.dialog.showOpenDialog({
      title: "Select a custom audio source profile",
      filters: [{ name: "JSON Files", extensions: ["json"] }],
      properties: ["openFile"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const filePath = result.filePaths[0];
    try {
      const fileContent = fs__namespace.readFileSync(filePath, "utf-8");
      const pluginData = JSON.parse(fileContent);
      if (!pluginData.name || !pluginData.apiUrl) {
        throw new Error("Invalid plugin file, missing name or apiUrl field.");
      }
      return {
        name: pluginData.name,
        content: fileContent
      };
    } catch (error) {
      console.error("Failed to read or parse plugin file:", error);
      throw new Error(`File reading or parsing failed: ${error.message}`);
    }
  });
  electron.ipcMain.handle("import-lx-music-script", async () => {
    const result = await electron.dialog.showOpenDialog({
      title: "Select Luoxue sound source script file",
      filters: [{ name: "JavaScript Files", extensions: ["js"] }],
      properties: ["openFile"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const filePath = result.filePaths[0];
    try {
      const fileContent = fs__namespace.readFileSync(filePath, "utf-8");
      if (!fileContent.includes("globalThis.lx") && !fileContent.includes("lx.on") && !fileContent.includes("EVENT_NAMES")) {
        throw new Error("Invalid Luoxue sound source script, not found globalThis.lx Related code.");
      }
      const hasMetaComment = fileContent.includes("@name");
      if (!hasMetaComment) {
        console.warn("warn: Script is missing @name Meta information annotation");
      }
      return {
        name: path__namespace.basename(filePath, ".js"),
        content: fileContent
      };
    } catch (error) {
      console.error("Failed to read Luoxue sound source script:", error);
      throw new Error(`Script reading failed: ${error.message}`);
    }
  });
}
function cleanFontName(fontName) {
  return fontName.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, " ");
}
async function getSystemFonts() {
  try {
    const fonts = await fontList.getFonts();
    const cleanedFonts = [...new Set(fonts.map(cleanFontName))];
    return ["system-ui", ...cleanedFonts].sort();
  } catch (error) {
    console.error("Failed to obtain system font:", error);
    return ["system-ui"];
  }
}
function initializeFonts() {
  electron.ipcMain.handle("get-system-fonts", async () => {
    return await getSystemFonts();
  });
}
const SUPPORTED_AUDIO_FORMATS = [".mp3", ".flac", ".wav", ".ogg", ".m4a", ".aac"];
const METADATA_PARSE_CONCURRENCY = Math.min(8, Math.max(2, os__namespace.cpus().length));
const MAX_COVER_BYTES = 8 * 1024 * 1024;
const COVER_DIR_NAME = "AudioCovers";
let cachedCoverDir = null;
function getCoverDir() {
  if (cachedCoverDir) return cachedCoverDir;
  const dir = path__namespace.join(electron.app.getPath("userData"), COVER_DIR_NAME);
  try {
    fs__namespace.mkdirSync(dir, { recursive: true });
  } catch (error) {
    console.error("Failed to create cover directory:", error);
  }
  cachedCoverDir = dir;
  return dir;
}
function extFromMime(mime) {
  const sub = mime?.split("/")[1]?.split(";")[0]?.trim().toLowerCase();
  if (!sub) return "bin";
  return sub === "jpeg" ? "jpg" : sub;
}
function isSupportedFormat(ext) {
  return SUPPORTED_AUDIO_FORMATS.includes(ext.toLowerCase());
}
function extractTitleFromFilename(filePath) {
  const basename = path__namespace.basename(filePath);
  const dotIndex = basename.lastIndexOf(".");
  if (dotIndex > 0) {
    return basename.slice(0, dotIndex);
  }
  return basename;
}
async function extractCoverToFile(picture, sourceFilePath) {
  if (!picture) {
    return null;
  }
  try {
    if (picture.data.length > MAX_COVER_BYTES) {
      console.warn(
        `The cover exceeds the maximum size and is skipped: ${sourceFilePath} (${picture.data.length} bytes > ${MAX_COVER_BYTES})`
      );
      return null;
    }
    const ext = extFromMime(picture.format);
    const hash = crypto__namespace.createHash("sha256").update(sourceFilePath).digest("hex");
    const coverFile = path__namespace.join(getCoverDir(), `${hash}.${ext}`);
    await fs__namespace.promises.writeFile(coverFile, Buffer.from(picture.data));
    return coverFile;
  } catch (error) {
    console.error("Cover placement failed:", error);
    return null;
  }
}
function extractLyrics(lyrics) {
  if (!lyrics || lyrics.length === 0) {
    return null;
  }
  try {
    const firstLyric = lyrics[0];
    return firstLyric?.text ?? null;
  } catch (error) {
    console.error("Lyrics extraction failed:", error);
    return null;
  }
}
async function scanMusicFiles(folderPath) {
  const results = [];
  if (!fs__namespace.existsSync(folderPath)) {
    throw new Error(`Folder does not exist: ${folderPath}`);
  }
  const stat = await fs__namespace.promises.stat(folderPath);
  if (!stat.isDirectory()) {
    throw new Error(`path is not a folder: ${folderPath}`);
  }
  async function walkDirectory(dirPath) {
    try {
      const entries = await fs__namespace.promises.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path__namespace.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await walkDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path__namespace.extname(entry.name);
          if (isSupportedFormat(ext)) {
            results.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Scan directory failed: ${dirPath}`, error);
    }
  }
  await walkDirectory(folderPath);
  return results;
}
async function scanMusicFilesWithStats(folderPath) {
  const results = [];
  if (!fs__namespace.existsSync(folderPath)) {
    throw new Error(`Folder does not exist: ${folderPath}`);
  }
  const stat = await fs__namespace.promises.stat(folderPath);
  if (!stat.isDirectory()) {
    throw new Error(`path is not a folder: ${folderPath}`);
  }
  async function walkDirectory(dirPath) {
    try {
      const entries = await fs__namespace.promises.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path__namespace.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await walkDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path__namespace.extname(entry.name);
          if (!isSupportedFormat(ext)) {
            continue;
          }
          try {
            const fileStat = await fs__namespace.promises.stat(fullPath);
            results.push({
              path: fullPath,
              modifiedTime: fileStat.mtimeMs
            });
          } catch (error) {
            console.error(`Failed to read file information: ${fullPath}`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Scan directory failed: ${dirPath}`, error);
    }
  }
  await walkDirectory(folderPath);
  return results;
}
async function parseMetadata(filePath) {
  let fileSize = 0;
  let modifiedTime = 0;
  try {
    const stat = await fs__namespace.promises.stat(filePath);
    fileSize = stat.size;
    modifiedTime = stat.mtimeMs;
  } catch (error) {
    console.error(`Failed to obtain file information: ${filePath}`, error);
  }
  const fallback = {
    filePath,
    title: extractTitleFromFilename(filePath),
    artist: "unknown artist",
    album: "unknown album",
    duration: 0,
    coverPath: null,
    lyrics: null,
    fileSize,
    modifiedTime
  };
  try {
    const metadata = await mm__namespace.parseFile(filePath);
    const { common: common2, format } = metadata;
    return {
      filePath,
      title: common2.title || fallback.title,
      artist: common2.artist || fallback.artist,
      album: common2.album || fallback.album,
      duration: format.duration ? Math.round(format.duration * 1e3) : 0,
      coverPath: await extractCoverToFile(common2.picture?.[0], filePath),
      lyrics: extractLyrics(common2.lyrics),
      fileSize,
      modifiedTime
    };
  } catch (error) {
    console.error(`Metadata parsing failed, using fallback: ${filePath}`, error);
    return fallback;
  }
}
async function batchParseMetadata(filePaths) {
  if (filePaths.length === 0) {
    return [];
  }
  const results = new Array(filePaths.length);
  const workerCount = Math.min(METADATA_PARSE_CONCURRENCY, filePaths.length);
  let index = 0;
  const workers = Array.from({ length: workerCount }, async () => {
    while (index < filePaths.length) {
      const current = index;
      index += 1;
      results[current] = await parseMetadata(filePaths[current]);
    }
  });
  await Promise.all(workers);
  return results;
}
function initializeLocalMusicScanner() {
  electron.ipcMain.handle("scan-local-music", async (_, folderPath) => {
    try {
      const files = await scanMusicFiles(folderPath);
      return { files, count: files.length };
    } catch (error) {
      console.error("Scanning local music failed:", error);
      return { error: error.message || "Scan failed" };
    }
  });
  electron.ipcMain.handle("scan-local-music-with-stats", async (_, folderPath) => {
    try {
      const files = await scanMusicFilesWithStats(folderPath);
      return { files, count: files.length };
    } catch (error) {
      console.error("Scan local music(Contains file information)fail:", error);
      return { error: error.message || "Scan failed" };
    }
  });
  electron.ipcMain.handle("parse-local-music-metadata", async (_, filePaths) => {
    try {
      const metadataList = await batchParseMetadata(filePaths);
      return metadataList;
    } catch (error) {
      console.error("Failed to parse local music metadata:", error);
      return [];
    }
  });
}
let loginWindow = null;
const loginUrl = "https://music.163.com/#/login/";
const openLoginWindow = async (mainWin) => {
  let loginTimer;
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus();
    return;
  }
  const loginSession = electron.session.fromPartition("persist:login");
  await loginSession.clearStorageData({
    storages: ["cookies", "localstorage"]
  });
  loginWindow = new electron.BrowserWindow({
    parent: mainWin,
    title: "Login",
    width: 1280,
    height: 800,
    center: true,
    autoHideMenuBar: true,
    webPreferences: {
      session: loginSession,
      sandbox: false,
      webSecurity: false,
      preload: path.join(__dirname, "../../preload/index.js")
    }
  });
  loginWindow.loadURL(loginUrl);
  loginWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });
  const checkLogin = async () => {
    try {
      if (!loginWindow || loginWindow.isDestroyed()) {
        if (loginTimer) clearInterval(loginTimer);
        return;
      }
      const MUSIC_U = await loginSession.cookies.get({
        name: "MUSIC_U"
      });
      if (MUSIC_U && MUSIC_U?.length > 0) {
        if (loginTimer) clearInterval(loginTimer);
        const value = `MUSIC_U=${MUSIC_U[0].value};`;
        mainWin?.webContents.send("send-cookies", value);
        loginWindow.destroy();
        loginWindow = null;
      }
    } catch (error) {
      console.error("Checking login status failed:", error);
    }
  };
  loginWindow.webContents.once("did-finish-load", () => {
    loginWindow?.show();
    loginTimer = setInterval(checkLogin, 500);
    loginWindow?.on("closed", () => {
      if (loginTimer) clearInterval(loginTimer);
      loginWindow = null;
    });
  });
};
function initializeLoginWindow() {
  electron.ipcMain.on("open-login", (event) => {
    const mainWin = electron.BrowserWindow.fromWebContents(event.sender);
    if (mainWin) {
      openLoginWindow(mainWin);
    }
  });
}
const abortControllers = /* @__PURE__ */ new Map();
const initLxMusicHttp = () => {
  electron.ipcMain.handle(
    "lx-music-http-request",
    async (_, request) => {
      const { url: url2, options, requestId } = request;
      const controller = new AbortController();
      abortControllers.set(requestId, controller);
      let timeoutId = null;
      try {
        console.log(`[LxMusicHttp] ask: ${options.method || "GET"} ${url2}`);
        const fetchOptions = {
          method: options.method || "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            ...options.headers || {}
          },
          signal: controller.signal
        };
        if (options.body) {
          fetchOptions.body = options.body;
        } else if (options.form) {
          const formData = new URLSearchParams(options.form);
          fetchOptions.body = formData.toString();
          fetchOptions.headers = {
            ...fetchOptions.headers,
            "Content-Type": "application/x-www-form-urlencoded"
          };
        } else if (options.formData) {
          const FormData2 = (await import("form-data")).default;
          const formData = new FormData2();
          for (const [key, value] of Object.entries(options.formData)) {
            formData.append(key, value);
          }
          fetchOptions.body = formData;
        }
        const timeout = options.timeout || 3e4;
        timeoutId = setTimeout(() => {
          console.warn(`[LxMusicHttp] Request timeout: ${url2}`);
          controller.abort();
        }, timeout);
        const response = await fetch$1(url2, fetchOptions);
        clearTimeout(timeoutId);
        timeoutId = null;
        console.log(`[LxMusicHttp] response: ${response.status} ${url2}`);
        const rawBody = await response.text();
        let parsedBody = rawBody;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json") || rawBody.startsWith("{") || rawBody.startsWith("[")) {
          try {
            parsedBody = JSON.parse(rawBody);
          } catch {
          }
        }
        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        const result = {
          statusCode: response.status,
          headers,
          body: parsedBody
        };
        return result;
      } catch (error) {
        console.error(`[LxMusicHttp] Request failed: ${url2}`, error.message);
        throw error;
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        abortControllers.delete(requestId);
      }
    }
  );
  electron.ipcMain.handle("lx-music-http-cancel", (_, requestId) => {
    const controller = abortControllers.get(requestId);
    if (controller) {
      console.log(`[LxMusicHttp] Cancel request: ${requestId}`);
      controller.abort();
      abortControllers.delete(requestId);
    }
  });
  console.log("[LxMusicHttp] HTTP Request handling initialized");
};
let dbusModule;
try {
  dbusModule = require("@httptoolkit/dbus-native");
} catch {
}
let mprisPlayer = null;
let mainWindow$1 = null;
let currentPosition = 0;
let trayLyricIface = null;
let trayLyricBus = null;
let onPositionUpdate = null;
let onTrayLyricUpdate = null;
function initializeMpris(mainWindowRef2) {
  if (process.platform !== "linux") return;
  if (mprisPlayer) {
    return;
  }
  mainWindow$1 = mainWindowRef2;
  try {
    mprisPlayer = Player({
      name: "ChorusDeck",
      identity: "Chorus Deck",
      supportedUriSchemes: ["file", "http", "https"],
      supportedMimeTypes: [
        "audio/mpeg",
        "audio/mp3",
        "audio/flac",
        "audio/wav",
        "audio/ogg",
        "audio/aac",
        "audio/m4a"
      ],
      supportedInterfaces: ["player"]
    });
    mprisPlayer.on("quit", () => {
      electron.app.quit();
    });
    mprisPlayer.on("raise", () => {
      if (mainWindow$1) {
        mainWindow$1.show();
        mainWindow$1.focus();
      }
    });
    mprisPlayer.on("next", () => {
      if (mainWindow$1) {
        mainWindow$1.webContents.send("global-shortcut", "nextPlay");
      }
    });
    mprisPlayer.on("previous", () => {
      if (mainWindow$1) {
        mainWindow$1.webContents.send("global-shortcut", "prevPlay");
      }
    });
    mprisPlayer.on("pause", () => {
      if (mainWindow$1) {
        mainWindow$1.webContents.send("mpris-pause");
      }
    });
    mprisPlayer.on("play", () => {
      if (mainWindow$1) {
        mainWindow$1.webContents.send("mpris-play");
      }
    });
    mprisPlayer.on("playpause", () => {
      if (mainWindow$1) {
        mainWindow$1.webContents.send("global-shortcut", "togglePlay");
      }
    });
    mprisPlayer.on("stop", () => {
      if (mainWindow$1) {
        mainWindow$1.webContents.send("mpris-pause");
      }
    });
    mprisPlayer.getPosition = () => {
      return currentPosition;
    };
    mprisPlayer.on("seek", (offset) => {
      if (mainWindow$1) {
        const newPosition = Math.max(0, currentPosition + offset / 1e6);
        mainWindow$1.webContents.send("mpris-seek", newPosition);
      }
    });
    mprisPlayer.on("position", (event) => {
      if (mainWindow$1) {
        mainWindow$1.webContents.send("mpris-set-position", event.position / 1e6);
      }
    });
    onPositionUpdate = (_, position) => {
      currentPosition = position * 1e3 * 1e3;
      if (mprisPlayer) {
        mprisPlayer.seeked(position * 1e3 * 1e3);
        mprisPlayer.getPosition = () => position * 1e3 * 1e3;
        mprisPlayer.position = position * 1e3 * 1e3;
      }
    };
    electron.ipcMain.on("mpris-position-update", onPositionUpdate);
    onTrayLyricUpdate = (_, lrcObj) => {
      sendTrayLyric(lrcObj);
    };
    electron.ipcMain.on("tray-lyric-update", onTrayLyricUpdate);
    initTrayLyric();
    console.log("[MPRIS] Service initialized");
  } catch (error) {
    console.error("[MPRIS] Failed to initialize:", error);
  }
}
function updateMprisPlayState(playing) {
  if (!mprisPlayer || process.platform !== "linux") return;
  mprisPlayer.playbackStatus = playing ? "Playing" : "Paused";
}
function updateMprisCurrentSong(song) {
  if (!mprisPlayer || process.platform !== "linux") return;
  if (!song) {
    mprisPlayer.metadata = {};
    mprisPlayer.playbackStatus = "Stopped";
    return;
  }
  const artists = song.ar?.map((a) => a.name).join(", ") || song.artists?.map((a) => a.name).join(", ") || song.song?.artists?.map((a) => a.name).join(", ") || "";
  const album = song.al?.name || song.album?.name || song.song?.album?.name || "";
  const duration = song.duration || song.dt || song.song?.duration || 0;
  mprisPlayer.metadata = {
    "mpris:trackid": mprisPlayer.objectPath(`track/${song.id || 0}`),
    "mpris:length": duration * 1e3,
    "mpris:artUrl": song.picUrl || "",
    "xesam:title": song.name || "",
    "xesam:album": album,
    "xesam:artist": artists ? [artists] : []
  };
}
function initTrayLyric() {
  if (process.platform !== "linux" || !dbusModule) return;
  const serviceName = "org.gnome.Shell.TrayLyric";
  try {
    const sessionBus = dbusModule.sessionBus({});
    trayLyricBus = sessionBus;
    const dbusPath = "/org/freedesktop/DBus";
    const dbusInterface = "org.freedesktop.DBus";
    sessionBus.invoke(
      {
        path: dbusPath,
        interface: dbusInterface,
        member: "GetNameOwner",
        destination: "org.freedesktop.DBus",
        signature: "s",
        body: [serviceName]
      },
      (err, result) => {
        if (err || !result) {
          console.log("[TrayLyric] Service not running");
        } else {
          onServiceAvailable();
        }
      }
    );
  } catch (err) {
    console.error("[TrayLyric] Failed to init:", err);
  }
  function onServiceAvailable() {
    if (!trayLyricBus) return;
    const path2 = "/" + serviceName.replace(/\./g, "/");
    trayLyricBus.getService(serviceName).getInterface(path2, serviceName, (err, iface) => {
      if (err) {
        console.error("[TrayLyric] Failed to get service interface:", err);
        return;
      }
      trayLyricIface = iface;
      console.log("[TrayLyric] Service interface ready");
    });
  }
}
function sendTrayLyric(lrcObj) {
  if (!trayLyricIface || !trayLyricBus) return;
  trayLyricBus.invoke(
    {
      path: "/org/gnome/Shell/TrayLyric",
      interface: "org.gnome.Shell.TrayLyric",
      member: "UpdateLyric",
      destination: "org.gnome.Shell.TrayLyric",
      signature: "s",
      body: [lrcObj]
    },
    (err, _result) => {
      if (err) {
        console.error("[TrayLyric] Failed to invoke UpdateLyric:", err);
      }
    }
  );
}
function initializeOtherApi() {
  electron.ipcMain.handle("get-search-suggestions", async (_, keyword) => {
    if (!keyword || !keyword.trim()) {
      return [];
    }
    try {
      console.log(`[Main Process Proxy] Forwarding suggestion request for: ${keyword}`);
      const response = await axios.get("http://msearchcdn.kugou.com/new/app/i/search.php", {
        params: {
          cmd: 302,
          keyword
        },
        timeout: 5e3
      });
      return response.data;
    } catch (error) {
      console.error("[Main Process Proxy] Failed to fetch search suggestions:", error.message);
      return [];
    }
  });
}
const defaultRemoteControlConfig = {
  enabled: false,
  port: 31888,
  allowedIps: []
};
let app = null;
let server = null;
let mainWindowRef$1 = null;
let currentSong$1 = null;
let isPlaying$2 = false;
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const key in interfaces) {
    const iface = interfaces[key];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === "IPv4" && !alias.internal) {
          addresses.push(alias.address);
        }
      }
    }
  }
  return addresses;
}
function initializeRemoteControl(mainWindow2) {
  mainWindowRef$1 = mainWindow2;
  const store2 = getStore();
  let config = store2.get("remoteControl");
  if (!config) {
    config = defaultRemoteControlConfig;
    store2.set("remoteControl", config);
  }
  electron.ipcMain.on("update-current-song", (_, song) => {
    currentSong$1 = song;
  });
  electron.ipcMain.on("update-play-state", (_, playing) => {
    isPlaying$2 = playing;
  });
  electron.ipcMain.on("update-remote-control-config", (_, newConfig) => {
    if (server) {
      stopServer();
    }
    store2.set("remoteControl", newConfig);
    if (newConfig.enabled) {
      startServer(newConfig);
    }
  });
  electron.ipcMain.handle("get-remote-control-config", () => {
    const config2 = store2.get("remoteControl");
    return config2 || defaultRemoteControlConfig;
  });
  electron.ipcMain.handle("get-local-ip-addresses", () => {
    return getLocalIpAddresses();
  });
  if (config.enabled) {
    startServer(config);
  }
}
function startServer(config) {
  if (!mainWindowRef$1) {
    console.error("The main window is not initialized and the remote control service cannot be started.");
    return;
  }
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use((req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress || "";
    const cleanIp = clientIp.replace(/^::ffff:/, "");
    console.log("config", config);
    if (config.allowedIps.length === 0 || config.allowedIps.includes(cleanIp)) {
      next();
    } else {
      res.status(403).json({ error: "UnauthorizedIPaddress" });
    }
  });
  setupRoutes(app);
  try {
    server = app.listen(config.port, () => {
      console.log(`The remote control service has been started and the listening port is: ${config.port}`);
    });
  } catch (error) {
    console.error("Failed to start remote control service:", error);
  }
}
function stopServer() {
  if (server) {
    server.close();
    server = null;
    app = null;
    console.log("Remote control service has stopped");
  }
}
function setupRoutes(app2) {
  app2.get("/api/status", (_, res) => {
    res.json({
      isPlaying: isPlaying$2,
      currentSong: currentSong$1
    });
  });
  app2.post("/api/toggle-play", (_, res) => {
    if (!mainWindowRef$1) {
      return res.status(500).json({ error: "The main window is not initialized" });
    }
    mainWindowRef$1.webContents.send("global-shortcut", "togglePlay");
    res.json({ success: true, message: "Sent to play/pause command" });
  });
  app2.post("/api/prev", (_, res) => {
    if (!mainWindowRef$1) {
      return res.status(500).json({ error: "The main window is not initialized" });
    }
    mainWindowRef$1.webContents.send("global-shortcut", "prevPlay");
    res.json({ success: true, message: "Previous command sent" });
  });
  app2.post("/api/next", (_, res) => {
    if (!mainWindowRef$1) {
      return res.status(500).json({ error: "The main window is not initialized" });
    }
    mainWindowRef$1.webContents.send("global-shortcut", "nextPlay");
    res.json({ success: true, message: "Next command sent" });
  });
  app2.post("/api/volume-up", (_, res) => {
    if (!mainWindowRef$1) {
      return res.status(500).json({ error: "The main window is not initialized" });
    }
    mainWindowRef$1.webContents.send("global-shortcut", "volumeUp");
    res.json({ success: true, message: "Volume increase command sent" });
  });
  app2.post("/api/volume-down", (_, res) => {
    if (!mainWindowRef$1) {
      return res.status(500).json({ error: "The main window is not initialized" });
    }
    mainWindowRef$1.webContents.send("global-shortcut", "volumeDown");
    res.json({ success: true, message: "Volume down command sent" });
  });
  app2.post("/api/toggle-favorite", (_, res) => {
    if (!mainWindowRef$1) {
      return res.status(500).json({ error: "The main window is not initialized" });
    }
    mainWindowRef$1.webContents.send("global-shortcut", "toggleFavorite");
    res.json({ success: true, message: "Favorites sent/Cancel favorite command" });
  });
  app2.get("/", (_, res) => {
    try {
      const resourcesPath = process.resourcesPath || "";
      const isDev = process.env.NODE_ENV === "development";
      const htmlPath = path.join(process.cwd(), "resources", "html", "remote-control.html");
      const finalPath = isDev ? htmlPath : path.join(resourcesPath, "html", "remote-control.html");
      if (fs.existsSync(finalPath)) {
        res.sendFile(finalPath);
      } else {
        res.status(404).send("Remote control interface file not found");
        console.error("The remote control interface file does not exist:", finalPath);
      }
    } catch (error) {
      console.error("Failed to load remote control interface:", error);
      res.status(500).send("Failed to load remote control interface");
    }
  });
}
let mainWindowRef = null;
let shortcutsEnabled = true;
let shortcutIpcReady = false;
const managedGlobalShortcuts = /* @__PURE__ */ new Map();
function currentPlatform() {
  if (process.platform === "darwin" || process.platform === "win32" || process.platform === "linux") {
    return process.platform;
  }
  return "linux";
}
function hasAvailableMainWindow() {
  return Boolean(mainWindowRef && !mainWindowRef.isDestroyed());
}
function isShortcutsConfigEqual(left, right) {
  return shortcutActionOrder.every((action) => {
    const leftConfig = left[action];
    const rightConfig = right[action];
    return leftConfig.key === rightConfig.key && leftConfig.enabled === rightConfig.enabled && leftConfig.scope === rightConfig.scope;
  });
}
function getStoredShortcuts() {
  const store2 = getStore();
  const rawShortcuts = store2.get("shortcuts");
  const normalizedShortcuts = normalizeShortcutsConfig(rawShortcuts);
  const serializedRaw = JSON.stringify(rawShortcuts ?? null);
  const serializedNormalized = JSON.stringify(normalizedShortcuts);
  if (serializedRaw !== serializedNormalized) {
    store2.set("shortcuts", normalizedShortcuts);
  }
  return normalizedShortcuts;
}
function persistShortcuts(shortcuts) {
  const store2 = getStore();
  const currentShortcuts = normalizeShortcutsConfig(store2.get("shortcuts"));
  if (!isShortcutsConfigEqual(currentShortcuts, shortcuts)) {
    store2.set("shortcuts", shortcuts);
  }
}
function emitShortcutsChanged(shortcuts, registration) {
  if (!hasAvailableMainWindow()) {
    return;
  }
  mainWindowRef.webContents.send("update-app-shortcuts", shortcuts);
  mainWindowRef.webContents.send("shortcuts-updated", shortcuts, registration);
}
function unregisterManagedGlobalShortcuts() {
  managedGlobalShortcuts.forEach((accelerator) => {
    try {
      electron.globalShortcut.unregister(accelerator);
    } catch (error) {
      console.error(`[Shortcuts] Logout shortcut key failed: ${accelerator}`, error);
    }
  });
  managedGlobalShortcuts.clear();
}
function handleShortcutAction(action) {
  if (!hasAvailableMainWindow()) {
    return;
  }
  const mainWindow2 = mainWindowRef;
  if (action === "toggleWindow") {
    if (mainWindow2.isVisible() && mainWindow2.isFocused()) {
      mainWindow2.hide();
      return;
    }
    if (mainWindow2.isMinimized()) {
      mainWindow2.restore();
    }
    mainWindow2.show();
    mainWindow2.focus();
    return;
  }
  mainWindow2.webContents.send("global-shortcut", action);
}
function registerManagedGlobalShortcuts(shortcuts) {
  unregisterManagedGlobalShortcuts();
  const failed = [];
  if (!shortcutsEnabled) {
    return {
      success: true,
      failed
    };
  }
  shortcutActionOrder.forEach((action) => {
    const config = shortcuts[action];
    if (!config.enabled || config.scope !== "global") {
      return;
    }
    const accelerator = normalizeShortcutAccelerator(config.key);
    if (!accelerator || isModifierOnlyShortcut(accelerator)) {
      failed.push({
        action,
        key: config.key,
        reason: "invalid"
      });
      return;
    }
    try {
      const registered = electron.globalShortcut.register(accelerator, () => {
        handleShortcutAction(action);
      });
      if (!registered) {
        failed.push({
          action,
          key: accelerator,
          reason: "occupied"
        });
        return;
      }
      managedGlobalShortcuts.set(action, accelerator);
    } catch (error) {
      console.error(`[Shortcuts] Failed to register shortcut keys: ${accelerator}`, error);
      failed.push({
        action,
        key: accelerator,
        reason: "invalid"
      });
    }
  });
  return {
    success: failed.length === 0,
    failed
  };
}
function validateShortcuts(rawShortcuts) {
  const shortcuts = normalizeShortcutsConfig(rawShortcuts);
  const issues = [];
  const issueKeys = /* @__PURE__ */ new Set();
  const rawShortcutMap = rawShortcuts && typeof rawShortcuts === "object" ? rawShortcuts : {};
  const pushIssue = (issue) => {
    const issueKey = `${issue.reason}:${issue.action}:${issue.scope}:${issue.key}:${issue.conflictWith ?? ""}`;
    if (issueKeys.has(issueKey)) {
      return;
    }
    issueKeys.add(issueKey);
    issues.push(issue);
  };
  shortcutActionOrder.forEach((action) => {
    const rawActionConfig = rawShortcutMap[action];
    if (!rawActionConfig) {
      return;
    }
    const rawKey = typeof rawActionConfig === "string" ? rawActionConfig : typeof rawActionConfig === "object" && rawActionConfig !== null ? rawActionConfig.key : null;
    if (typeof rawKey !== "string") {
      return;
    }
    const normalizedKey = normalizeShortcutAccelerator(rawKey);
    if (!normalizedKey || isModifierOnlyShortcut(rawKey)) {
      pushIssue({
        action,
        key: rawKey,
        scope: shortcuts[action].scope,
        reason: "invalid"
      });
    }
  });
  const conflicts = getShortcutConflicts(shortcuts);
  conflicts.forEach((conflict) => {
    conflict.actions.forEach((action, index) => {
      const conflictWith = conflict.actions[(index + 1) % conflict.actions.length];
      pushIssue({
        action,
        key: conflict.key,
        scope: conflict.scope,
        reason: "conflict",
        conflictWith
      });
    });
  });
  const reservedAccelerators = new Set(getReservedAccelerators(currentPlatform()));
  shortcutActionOrder.forEach((action) => {
    const config = shortcuts[action];
    if (!config.enabled || config.scope !== "global") {
      return;
    }
    const accelerator = normalizeShortcutAccelerator(config.key);
    if (accelerator && reservedAccelerators.has(accelerator)) {
      pushIssue({
        action,
        key: accelerator,
        scope: config.scope,
        reason: "reserved"
      });
    }
  });
  return {
    shortcuts,
    hasBlockingIssue: issues.length > 0,
    issues
  };
}
function applyShortcuts(shortcuts) {
  const registration = registerManagedGlobalShortcuts(shortcuts);
  emitShortcutsChanged(shortcuts, registration);
  return registration;
}
function saveShortcuts(rawShortcuts) {
  const validation = validateShortcuts(rawShortcuts);
  if (validation.hasBlockingIssue) {
    return {
      ok: false,
      validation,
      registration: {
        success: false,
        failed: []
      }
    };
  }
  persistShortcuts(validation.shortcuts);
  const registration = applyShortcuts(validation.shortcuts);
  return {
    ok: true,
    validation,
    registration
  };
}
function setupShortcutIpcHandlers() {
  if (shortcutIpcReady) {
    return;
  }
  shortcutIpcReady = true;
  electron.ipcMain.on("get-platform", (event) => {
    event.returnValue = process.platform;
  });
  electron.ipcMain.on("disable-shortcuts", () => {
    shortcutsEnabled = false;
    unregisterManagedGlobalShortcuts();
  });
  electron.ipcMain.on("enable-shortcuts", () => {
    shortcutsEnabled = true;
    const shortcuts = getStoredShortcuts();
    applyShortcuts(shortcuts);
  });
  electron.ipcMain.on("update-shortcuts", (_, shortcutsConfig) => {
    saveShortcuts(shortcutsConfig);
  });
  electron.ipcMain.handle("shortcuts:get-config", () => {
    return getStoredShortcuts();
  });
  electron.ipcMain.handle("shortcuts:validate", (_, shortcutsConfig) => {
    return validateShortcuts(shortcutsConfig);
  });
  electron.ipcMain.handle("shortcuts:save", (_, shortcutsConfig) => {
    return saveShortcuts(shortcutsConfig);
  });
}
function initializeShortcuts(mainWindow2) {
  mainWindowRef = mainWindow2;
  setupShortcutIpcHandlers();
  const shortcuts = getStoredShortcuts();
  applyShortcuts(shortcuts);
}
function setupThemeHandlers() {
  electron.ipcMain.handle("get-system-accent-color", () => {
    try {
      if (process.platform === "win32" || process.platform === "darwin") {
        const color = electron.systemPreferences.getAccentColor();
        return `#${color}`;
      }
    } catch (error) {
      console.error("Failed to get system accent color:", error);
    }
    return null;
  });
}
let tray = null;
let playPauseTray = null;
let prevTray = null;
let nextTray = null;
let songTitleTray = null;
let isPlaying$1 = false;
let currentSong = null;
function updatePlayState(playing) {
  isPlaying$1 = playing;
  if (tray) {
    updateTrayMenu(electron.BrowserWindow.getAllWindows()[0]);
  }
  updateStatusBarTray();
}
function getArtistString(song) {
  if (!song || !song.song || !song.song.artists) return "";
  return song.song.artists.map((item) => item.name).join(" / ");
}
function getSongTitle(song) {
  if (!song) return "Not played";
  const artistStr = getArtistString(song);
  return artistStr ? `${song.name} - ${artistStr}` : song.name;
}
function getTruncatedSongTitle(song, maxLength = 14) {
  const fullTitle = getSongTitle(song);
  if (fullTitle.length <= maxLength) return fullTitle;
  return fullTitle.slice(0, maxLength) + "...";
}
function updateCurrentSong(song) {
  currentSong = song;
  if (tray) {
    updateTrayMenu(electron.BrowserWindow.getAllWindows()[0]);
  }
  updateStatusBarTray();
}
function getProperIconSize() {
  const height = 18;
  const width = 18;
  return { width, height };
}
function updateStatusBarTray() {
  if (process.platform !== "darwin") return;
  const iconSize = getProperIconSize();
  if (songTitleTray) {
    if (currentSong) {
      const songName = currentSong.name.slice(0, 10);
      let title = songName;
      const artistStr = getArtistString(currentSong);
      if (artistStr) {
        title = `${songName} - ${artistStr.slice(0, 6)}${artistStr.length > 6 ? ".." : ""}`;
      }
      songTitleTray.setTitle(title, {
        fontType: "monospacedDigit"
      });
      const fullTitle = getSongTitle(currentSong);
      songTitleTray.setToolTip(fullTitle);
      console.log("Update status bar song display:", title, "Complete information:", fullTitle);
    } else {
      songTitleTray.setTitle("Not played", {
        fontType: "monospacedDigit"
      });
      songTitleTray.setToolTip("Not played");
      console.log("Update status bar song display: Not played");
    }
  }
  if (playPauseTray) {
    const iconPath2 = path.join(
      electron.app.getAppPath(),
      "resources/icons",
      isPlaying$1 ? "pause.png" : "play.png"
    );
    const icon2 = electron.nativeImage.createFromPath(iconPath2).resize(iconSize);
    icon2.setTemplateImage(true);
    playPauseTray.setImage(icon2);
    playPauseTray.setToolTip(isPlaying$1 ? "Pause" : "Play");
  }
}
function updateTrayMenu(mainWindow2) {
  if (!tray) return;
  if (process.platform === "darwin") {
    const menu = new electron.Menu();
    if (currentSong) {
      menu.append(
        new electron.MenuItem({
          label: getTruncatedSongTitle(currentSong),
          enabled: false,
          type: "normal"
        })
      );
      menu.append(new electron.MenuItem({ type: "separator" }));
    }
    menu.append(
      new electron.MenuItem({
        label: "Previous",
        type: "normal",
        click: () => {
          mainWindow2.webContents.send("global-shortcut", "prevPlay");
        }
      })
    );
    menu.append(
      new electron.MenuItem({
        label: isPlaying$1 ? "Pause" : "Play",
        type: "normal",
        click: () => {
          mainWindow2.webContents.send("global-shortcut", "togglePlay");
        }
      })
    );
    menu.append(
      new electron.MenuItem({
        label: "Favorite",
        type: "normal",
        click: () => {
          console.log("[Tray] Send favorite command - macOSmenu");
          mainWindow2.webContents.send("global-shortcut", "toggleFavorite");
        }
      })
    );
    menu.append(
      new electron.MenuItem({
        label: "Next",
        type: "normal",
        click: () => {
          mainWindow2.webContents.send("global-shortcut", "nextPlay");
        }
      })
    );
    menu.append(new electron.MenuItem({ type: "separator" }));
    menu.append(
      new electron.MenuItem({
        label: "Show",
        type: "normal",
        click: () => {
          mainWindow2.show();
        }
      })
    );
    menu.append(
      new electron.MenuItem({
        label: "Quit",
        type: "normal",
        click: () => {
          electron.app.quit();
        }
      })
    );
    tray.setContextMenu(menu);
  } else {
    const menuTemplate = [
      ...currentSong ? [
        {
          label: getTruncatedSongTitle(currentSong),
          enabled: false,
          type: "normal"
        },
        { type: "separator" }
      ] : [],
      {
        label: "Show",
        type: "normal",
        click: () => {
          mainWindow2.show();
        }
      },
      {
        label: "Favorite",
        type: "normal",
        click: () => {
          console.log("[Tray] Send favorite command - Windows/Linuxmenu");
          mainWindow2.webContents.send("global-shortcut", "toggleFavorite");
        }
      },
      { type: "separator" },
      {
        label: "Previous",
        type: "normal",
        click: () => {
          mainWindow2.webContents.send("global-shortcut", "prevPlay");
        }
      },
      {
        label: isPlaying$1 ? "Pause" : "Play",
        type: "normal",
        click: () => {
          mainWindow2.webContents.send("global-shortcut", "togglePlay");
        }
      },
      {
        label: "Next",
        type: "normal",
        click: () => {
          mainWindow2.webContents.send("global-shortcut", "nextPlay");
        }
      },
      { type: "separator" },
      {
        label: "Quit",
        type: "normal",
        click: () => {
          electron.app.quit();
        }
      }
    ];
    const contextMenu = electron.Menu.buildFromTemplate(menuTemplate);
    tray.setContextMenu(contextMenu);
  }
}
function initializeStatusBarTray(mainWindow2) {
  const store2 = getStore();
  if (process.platform !== "darwin" || !store2.get("set.showTopAction")) return;
  const iconSize = getProperIconSize();
  const nextIcon = electron.nativeImage.createFromPath(path.join(electron.app.getAppPath(), "resources/icons", "next.png")).resize(iconSize);
  nextIcon.setTemplateImage(true);
  nextTray = new electron.Tray(nextIcon);
  nextTray.setToolTip("Next");
  nextTray.on("click", () => {
    mainWindow2.webContents.send("global-shortcut", "nextPlay");
  });
  const playPauseIcon = electron.nativeImage.createFromPath(path.join(electron.app.getAppPath(), "resources/icons", isPlaying$1 ? "pause.png" : "play.png")).resize(iconSize);
  playPauseIcon.setTemplateImage(true);
  playPauseTray = new electron.Tray(playPauseIcon);
  playPauseTray.setToolTip(isPlaying$1 ? "Pause" : "Play");
  playPauseTray.on("click", () => {
    mainWindow2.webContents.send("global-shortcut", "togglePlay");
  });
  const prevIcon = electron.nativeImage.createFromPath(path.join(electron.app.getAppPath(), "resources/icons", "prev.png")).resize(iconSize);
  prevIcon.setTemplateImage(true);
  prevTray = new electron.Tray(prevIcon);
  prevTray.setToolTip("Previous");
  prevTray.on("click", () => {
    mainWindow2.webContents.send("global-shortcut", "prevPlay");
  });
  const titleIcon = electron.nativeImage.createFromPath(path.join(electron.app.getAppPath(), "resources/icons", "note.png")).resize({ width: 16, height: 16 });
  titleIcon.setTemplateImage(true);
  songTitleTray = new electron.Tray(titleIcon);
  const initialText = getSongTitle(currentSong);
  songTitleTray.setTitle(initialText, {
    fontType: "monospacedDigit"
  });
  songTitleTray.setToolTip(initialText);
  songTitleTray.on("click", () => {
    mainWindow2.show();
  });
  updateStatusBarTray();
  console.log("The status bar is initialized and the song title is displayed.:", initialText);
}
function initializeTray(iconPath2, mainWindow2) {
  const iconSize = process.platform === "darwin" ? 18 : 16;
  const iconFile = process.platform === "darwin" ? "icon_16x16.png" : "icon_16x16.png";
  const trayIcon = electron.nativeImage.createFromPath(path.join(iconPath2, iconFile)).resize({ width: iconSize, height: iconSize });
  tray = new electron.Tray(trayIcon);
  tray.setToolTip("Chorus Deck");
  updateTrayMenu(mainWindow2);
  initializeStatusBarTray(mainWindow2);
  if (process.platform === "darwin") {
    tray.on("click", () => {
      if (tray) {
        tray.popUpContextMenu();
      }
    });
  } else {
    tray.on("click", () => {
      if (mainWindow2.isVisible()) {
        mainWindow2.hide();
      } else {
        mainWindow2.show();
      }
    });
  }
  return tray;
}
const APP_UPDATE_STATUS = {
  idle: "idle",
  checking: "checking",
  available: "available",
  notAvailable: "not-available",
  downloading: "downloading",
  downloaded: "downloaded",
  error: "error"
};
const APP_UPDATE_RELEASE_URL = "https://github.com/algerkong/AlgerMusicPlayer/releases/latest";
function createDefaultAppUpdateState(currentVersion = "") {
  return {
    supported: false,
    status: APP_UPDATE_STATUS.idle,
    currentVersion,
    availableVersion: null,
    releaseNotes: "",
    releaseDate: null,
    releasePageUrl: APP_UPDATE_RELEASE_URL,
    downloadProgress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    bytesPerSecond: 0,
    errorMessage: null,
    checkedAt: null
  };
}
const { autoUpdater } = electronUpdater;
let updateState = createDefaultAppUpdateState(electron.app.getVersion());
let isInitialized = false;
let checkForUpdatesPromise = null;
let downloadUpdatePromise = null;
const isAutoUpdateSupported = () => {
  if (process.platform === "linux") {
    return Boolean(process.env.APPIMAGE);
  }
  return true;
};
const normalizeReleaseNotes = (releaseNotes) => {
  if (typeof releaseNotes === "string") {
    return releaseNotes;
  }
  if (Array.isArray(releaseNotes)) {
    return releaseNotes.map((item) => {
      const version = item.version ? `## ${item.version}` : "";
      return [version, item.note].filter(Boolean).join("\n");
    }).join("\n\n");
  }
  return "";
};
const broadcastUpdateState = () => {
  for (const window2 of electron.BrowserWindow.getAllWindows()) {
    window2.webContents.send("app-update:state", updateState);
  }
};
const setUpdateState = (partial) => {
  updateState = {
    ...updateState,
    ...partial
  };
  broadcastUpdateState();
};
const resetUpdateState = () => {
  updateState = {
    ...createDefaultAppUpdateState(electron.app.getVersion()),
    supported: isAutoUpdateSupported()
  };
};
const getUnsupportedMessage = () => {
  if (!electron.app.isPackaged) {
    return "The current environment is in development mode, and automatic updates are only available within packaged applications.";
  }
  if (process.platform === "linux") {
    return "current Linux The installation method does not support automatic updates. Please go to the official website to download the installation package update.";
  }
  return "The current environment does not support automatic updates. Please go to the official website to download the installation package update.";
};
const applyUpdateInfo = (status, info) => {
  setUpdateState({
    status,
    availableVersion: info?.version ?? null,
    releaseDate: info?.releaseDate ?? null,
    releaseNotes: info ? normalizeReleaseNotes(info.releaseNotes) : "",
    releasePageUrl: APP_UPDATE_RELEASE_URL,
    errorMessage: null,
    checkedAt: Date.now()
  });
};
const checkForUpdates = async (options = {}) => {
  if (!updateState.supported) {
    const errorMessage = options.manual ? getUnsupportedMessage() : null;
    setUpdateState({
      status: options.manual ? APP_UPDATE_STATUS.error : APP_UPDATE_STATUS.idle,
      errorMessage
    });
    return updateState;
  }
  if (updateState.status === APP_UPDATE_STATUS.available || updateState.status === APP_UPDATE_STATUS.downloading || updateState.status === APP_UPDATE_STATUS.downloaded) {
    return updateState;
  }
  if (checkForUpdatesPromise) {
    return await checkForUpdatesPromise;
  }
  checkForUpdatesPromise = (async () => {
    try {
      setUpdateState({
        status: APP_UPDATE_STATUS.checking,
        errorMessage: null,
        checkedAt: Date.now()
      });
      await autoUpdater.checkForUpdates();
      return updateState;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Check for updates failed";
      setUpdateState({
        status: APP_UPDATE_STATUS.error,
        errorMessage,
        checkedAt: Date.now()
      });
      return updateState;
    } finally {
      checkForUpdatesPromise = null;
    }
  })();
  return await checkForUpdatesPromise;
};
const downloadUpdate = async () => {
  if (!updateState.supported) {
    setUpdateState({
      status: APP_UPDATE_STATUS.error,
      errorMessage: getUnsupportedMessage()
    });
    return updateState;
  }
  if (updateState.status === APP_UPDATE_STATUS.downloaded) {
    return updateState;
  }
  if (!hasDownloadableUpdate()) {
    setUpdateState({
      status: APP_UPDATE_STATUS.error,
      errorMessage: "There are currently no updates available for download"
    });
    return updateState;
  }
  if (downloadUpdatePromise) {
    return await downloadUpdatePromise;
  }
  downloadUpdatePromise = (async () => {
    try {
      await autoUpdater.downloadUpdate();
      return updateState;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Download update failed";
      setUpdateState({
        status: APP_UPDATE_STATUS.error,
        errorMessage
      });
      return updateState;
    } finally {
      downloadUpdatePromise = null;
    }
  })();
  return await downloadUpdatePromise;
};
const hasDownloadableUpdate = () => {
  return updateState.status === APP_UPDATE_STATUS.available;
};
const openReleasePage = async () => {
  await electron.shell.openExternal(updateState.releasePageUrl || APP_UPDATE_RELEASE_URL);
  return true;
};
function setupUpdateHandlers(mainWindow2) {
  if (isInitialized) {
    mainWindow2.webContents.once("did-finish-load", () => {
      mainWindow2.webContents.send("app-update:state", updateState);
    });
    return;
  }
  isInitialized = true;
  resetUpdateState();
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("checking-for-update", () => {
    setUpdateState({
      status: APP_UPDATE_STATUS.checking,
      errorMessage: null,
      checkedAt: Date.now()
    });
  });
  autoUpdater.on("update-available", (info) => {
    applyUpdateInfo(APP_UPDATE_STATUS.available, info);
  });
  autoUpdater.on("update-not-available", () => {
    setUpdateState({
      status: APP_UPDATE_STATUS.notAvailable,
      availableVersion: null,
      releaseNotes: "",
      releaseDate: null,
      errorMessage: null,
      checkedAt: Date.now()
    });
  });
  autoUpdater.on("download-progress", (progress) => {
    setUpdateState({
      status: APP_UPDATE_STATUS.downloading,
      downloadProgress: progress.percent,
      downloadedBytes: progress.transferred,
      totalBytes: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
      errorMessage: null
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    setUpdateState({
      status: APP_UPDATE_STATUS.downloaded,
      availableVersion: info.version,
      releaseNotes: normalizeReleaseNotes(info.releaseNotes),
      releaseDate: info.releaseDate,
      downloadProgress: 100,
      downloadedBytes: info.files.reduce((total, file) => total + (file.size ?? 0), 0),
      totalBytes: info.files.reduce((total, file) => total + (file.size ?? 0), 0),
      bytesPerSecond: 0,
      errorMessage: null
    });
  });
  autoUpdater.on("error", (error) => {
    setUpdateState({
      status: APP_UPDATE_STATUS.error,
      errorMessage: error?.message ?? "Automatic update failed"
    });
  });
  electron.ipcMain.handle("app-update:get-state", async () => {
    return updateState;
  });
  electron.ipcMain.handle("app-update:check", async (_event, options) => {
    return await checkForUpdates(options);
  });
  electron.ipcMain.handle("app-update:download", async () => {
    return await downloadUpdate();
  });
  electron.ipcMain.handle("app-update:quit-and-install", async () => {
    autoUpdater.quitAndInstall(false, true);
    return true;
  });
  electron.ipcMain.handle("app-update:open-release-page", async () => {
    return await openReleasePage();
  });
  mainWindow2.webContents.once("did-finish-load", () => {
    mainWindow2.webContents.send("app-update:state", updateState);
  });
}
const store$1 = getSharedStore();
const DEFAULT_MAIN_WIDTH = 1200;
const DEFAULT_MAIN_HEIGHT = 780;
const DEFAULT_MINI_WIDTH = 340;
const DEFAULT_MINI_HEIGHT = 64;
const DEFAULT_MINI_EXPANDED_HEIGHT = 400;
const WINDOW_STATE_KEY = "windowState";
const ABSOLUTE_MIN_WIDTH = 900;
const ABSOLUTE_MIN_HEIGHT = 640;
let MIN_WIDTH = ABSOLUTE_MIN_WIDTH;
let MIN_HEIGHT = ABSOLUTE_MIN_HEIGHT;
let ipcHandlersRegistered = false;
class WindowSizeManager {
  store;
  mainWindow = null;
  savedState = null;
  isInitialized = false;
  saveStateDebounceTimer = null;
  constructor() {
    this.store = store$1;
  }
  scheduleSaveWindowState(win) {
    if (this.saveStateDebounceTimer) {
      clearTimeout(this.saveStateDebounceTimer);
    }
    this.saveStateDebounceTimer = setTimeout(() => {
      this.saveStateDebounceTimer = null;
      if (!win.isDestroyed() && !win.isMinimized()) {
        this.saveWindowState(win);
      }
    }, 500);
  }
  flushScheduledSave() {
    if (this.saveStateDebounceTimer) {
      clearTimeout(this.saveStateDebounceTimer);
      this.saveStateDebounceTimer = null;
    }
  }
  initialize() {
    if (!electron.app.isReady()) {
      console.warn("WindowSizeManager.initialize() must be in app ready Call later!");
      return;
    }
    if (this.isInitialized) {
      return;
    }
    this.initMinimumWindowSize();
    this.setupIPCHandlers();
    this.isInitialized = true;
    console.log("Window size manager initialization completed");
  }
  setMainWindow(win) {
    if (!this.isInitialized) {
      this.initialize();
    }
    this.mainWindow = win;
    this.savedState = this.getWindowState();
    this.setupEventListeners(win);
    this.saveWindowState(win);
  }
  initMinimumWindowSize() {
    if (!electron.app.isReady()) {
      console.warn("Can’t be there app ready visited before screen module");
      return;
    }
    try {
      const { width: workAreaWidth, height: workAreaHeight } = electron.screen.getPrimaryDisplay().workArea;
      MIN_WIDTH = Math.max(ABSOLUTE_MIN_WIDTH, Math.round(workAreaWidth * 0.3));
      MIN_HEIGHT = Math.max(ABSOLUTE_MIN_HEIGHT, Math.round(workAreaHeight * 0.3));
      console.log(`Set minimum window size: ${MIN_WIDTH}x${MIN_HEIGHT}`);
    } catch (error) {
      console.error("Failed to initialize minimum window size:", error);
      MIN_WIDTH = ABSOLUTE_MIN_WIDTH;
      MIN_HEIGHT = ABSOLUTE_MIN_HEIGHT;
    }
  }
  setupEventListeners(win) {
    win.on("resize", () => {
      if (!win.isDestroyed() && !win.isMinimized()) {
        this.scheduleSaveWindowState(win);
      }
    });
    win.on("move", () => {
      if (!win.isDestroyed() && !win.isMinimized()) {
        this.scheduleSaveWindowState(win);
      }
    });
    win.on("maximize", () => {
      if (!win.isDestroyed()) {
        this.saveWindowState(win);
      }
    });
    win.on("unmaximize", () => {
      if (!win.isDestroyed()) {
        this.saveWindowState(win);
      }
    });
    win.on("close", () => {
      this.flushScheduledSave();
      if (!win.isDestroyed()) {
        this.saveWindowState(win);
      }
    });
    win.webContents.on("did-finish-load", () => {
      this.enforceCorrectSize(win);
    });
    win.on("ready-to-show", () => {
      this.enforceCorrectSize(win);
    });
  }
  enforceCorrectSize(win) {
    if (!this.savedState || win.isMaximized() || win.isMinimized() || win.isDestroyed()) {
      return;
    }
    const [currentWidth, currentHeight] = win.getSize();
    if (Math.abs(currentWidth - this.savedState.width) > 2 || Math.abs(currentHeight - this.savedState.height) > 2) {
      console.log(
        `Force window resize: current=${currentWidth}x${currentHeight}, Target=${this.savedState.width}x${this.savedState.height}`
      );
      const [minWidth, minHeight] = win.getMinimumSize();
      win.setMinimumSize(1, 1);
      win.setSize(this.savedState.width, this.savedState.height, false);
      win.setMinimumSize(minWidth, minHeight);
      const [newWidth, newHeight] = win.getSize();
      console.log(`Window size after adjustment: ${newWidth}x${newHeight}`);
      if (Math.abs(newWidth - this.savedState.width) > 1 || Math.abs(newHeight - this.savedState.height) > 1) {
        console.log(`The window size is still inconsistent after adjustment, and the adjustment will be tried again.`);
        setTimeout(() => {
          if (!win.isDestroyed() && !win.isMaximized() && !win.isMinimized()) {
            win.setSize(this.savedState.width, this.savedState.height, false);
          }
        }, 50);
      }
    }
  }
  getWindowOptions() {
    if (!this.isInitialized && electron.app.isReady()) {
      this.initialize();
    }
    const savedState = this.getWindowState();
    const options = {
      width: savedState?.width || DEFAULT_MAIN_WIDTH,
      height: savedState?.height || DEFAULT_MAIN_HEIGHT,
      minWidth: MIN_WIDTH,
      minHeight: MIN_HEIGHT,
      show: false,
      frame: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    };
    if (savedState?.x !== void 0 && savedState?.y !== void 0 && electron.app.isReady()) {
      if (this.isPositionVisible(savedState.x, savedState.y)) {
        options.x = savedState.x;
        options.y = savedState.y;
      }
    }
    console.log(
      `Window creation options: size=${options.width}x${options.height}, Location=(${options.x}, ${options.y})`
    );
    return options;
  }
  applyInitialState(win) {
    const savedState = this.getWindowState();
    if (!savedState) {
      win.center();
      return;
    }
    if (savedState.isMaximized) {
      console.log("Apply saved maximized state");
      win.maximize();
    } else if (!electron.app.isReady() || savedState.x === void 0 || savedState.y === void 0 || !this.isPositionVisible(savedState.x, savedState.y)) {
      console.log("The saved location is invalid and the window is centered.");
      win.center();
    }
  }
  saveWindowState(win) {
    if (win.isDestroyed()) {
      return this.savedState || {
        width: DEFAULT_MAIN_WIDTH,
        height: DEFAULT_MAIN_HEIGHT,
        isMaximized: false
      };
    }
    const [currentWidth, currentHeight] = win.getSize();
    const isMiniMode = currentWidth === DEFAULT_MINI_WIDTH && (currentHeight === DEFAULT_MINI_HEIGHT || currentHeight === DEFAULT_MINI_EXPANDED_HEIGHT);
    const isMaximized = win.isMaximized();
    let state;
    if (isMaximized) {
      const currentBounds = win.getBounds();
      const previousSize = this.savedState && !this.savedState.isMaximized ? { width: this.savedState.width, height: this.savedState.height } : { width: currentBounds.width, height: currentBounds.height };
      state = {
        width: previousSize.width,
        height: previousSize.height,
        x: currentBounds.x,
        y: currentBounds.y,
        isMaximized: true
      };
      console.log("state IsMaximized", state);
    } else if (win.isMinimized()) {
      console.log("state IsMinimized", this.savedState);
      return this.savedState || {
        width: DEFAULT_MAIN_WIDTH,
        height: DEFAULT_MAIN_HEIGHT,
        isMaximized: false
      };
    } else {
      const [width, height] = win.getSize();
      const [x, y] = win.getPosition();
      state = {
        width,
        height,
        x,
        y,
        isMaximized: false
      };
      console.log("state IsNormal", state);
    }
    if (isMiniMode) {
      console.log("detectedminiModal window, not saved to persistent storage");
      return state;
    }
    try {
      this.store.set(WINDOW_STATE_KEY, state);
      console.log(`Window state saved: ${JSON.stringify(state)}`);
    } catch (error) {
      console.error("Failed to save window state:", error);
    }
    this.savedState = state;
    console.log("state", state);
    return state;
  }
  getWindowState() {
    let state;
    try {
      state = this.store.get(WINDOW_STATE_KEY);
    } catch (error) {
      console.error("Failed to read window status:", error);
      return this.savedState;
    }
    if (!state) {
      console.log("No saved window state found, default will be used");
      return null;
    }
    const validatedState = {
      width: Math.max(MIN_WIDTH, state.width || DEFAULT_MAIN_WIDTH),
      height: Math.max(MIN_HEIGHT, state.height || DEFAULT_MAIN_HEIGHT),
      x: state.x,
      y: state.y,
      isMaximized: !!state.isMaximized
    };
    console.log(`Read saved window state: ${JSON.stringify(validatedState)}`);
    return validatedState;
  }
  isPositionVisible(x, y) {
    if (!electron.app.isReady()) {
      return false;
    }
    try {
      const displays = electron.screen.getAllDisplays();
      for (const display of displays) {
        const { x: screenX, y: screenY, width, height } = display.workArea;
        if (x >= screenX && x < screenX + width && y >= screenY && y < screenY + height) {
          return true;
        }
      }
    } catch (error) {
      console.error("Checking location visibility failed:", error);
      return false;
    }
    return false;
  }
  calculateContentZoomFactor() {
    if (!electron.app.isReady()) {
      return 1;
    }
    try {
      const { scaleFactor } = electron.screen.getPrimaryDisplay();
      let zoomFactor = 1;
      if (scaleFactor > 1) {
        if (scaleFactor >= 2.5) {
          zoomFactor = 0.7;
        } else if (scaleFactor >= 2) {
          zoomFactor = 0.8;
        } else if (scaleFactor >= 1.5) {
          zoomFactor = 0.85;
        } else if (scaleFactor > 1.25) {
          zoomFactor = 0.9;
        } else {
          zoomFactor = 1;
        }
      }
      const userZoomFactor = this.store.get("set.contentZoomFactor");
      if (userZoomFactor) {
        zoomFactor = userZoomFactor;
      }
      return zoomFactor;
    } catch (error) {
      console.error("Calculating content scaling factor failed:", error);
      return 1;
    }
  }
  applyContentZoom(win) {
    const zoomFactor = this.calculateContentZoomFactor();
    win.webContents.setZoomFactor(zoomFactor);
    if (electron.app.isReady()) {
      try {
        console.log(
          `Apply page scaling factor: ${zoomFactor}, System scaling ratio: ${electron.screen.getPrimaryDisplay().scaleFactor}`
        );
      } catch (error) {
        console.error("Failed to obtain system scaling ratio:", error);
      }
    } else {
      console.log(`Apply page scaling factor: ${zoomFactor}`);
    }
  }
  setupIPCHandlers() {
    if (ipcHandlersRegistered) {
      console.log("IPCThe handler is already registered, skip repeated registration");
      return;
    }
    console.log("Registration window size relatedIPChandler");
    ipcHandlersRegistered = true;
    const removeHandlerSafely = (channel) => {
      try {
        electron.ipcMain.removeHandler(channel);
      } catch (error) {
        console.warn(`RemoveIPChandler ${channel} error:`, error);
      }
    };
    removeHandlerSafely("get-content-zoom");
    removeHandlerSafely("get-system-scale-factor");
    electron.ipcMain.on("set-content-zoom", (event, zoomFactor) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.webContents.setZoomFactor(zoomFactor);
        this.store.set("set.contentZoomFactor", zoomFactor);
      }
    });
    electron.ipcMain.handle("get-content-zoom", (event) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        return win.webContents.getZoomFactor();
      }
      return 1;
    });
    electron.ipcMain.handle("get-system-scale-factor", () => {
      if (!electron.app.isReady()) {
        return 1;
      }
      try {
        return electron.screen.getPrimaryDisplay().scaleFactor;
      } catch (error) {
        console.error("Failed to get system scaling factor:", error);
        return 1;
      }
    });
    electron.ipcMain.on("reset-content-zoom", (event) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        this.store.delete("set.contentZoomFactor");
        this.applyContentZoom(win);
      }
    });
    electron.ipcMain.on("resize-window", (event, width, height) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        console.log(`Received window resize request: ${width}x${height}`);
        const adjustedWidth = Math.max(width, MIN_WIDTH);
        const adjustedHeight = Math.max(height, MIN_HEIGHT);
        win.setSize(adjustedWidth, adjustedHeight);
        console.log(`The window has been resized to: ${adjustedWidth}x${adjustedHeight}`);
        this.saveWindowState(win);
      }
    });
    electron.ipcMain.on("resize-mini-window", (event, showPlaylist) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        if (showPlaylist) {
          console.log(`Expand mini window to ${DEFAULT_MINI_WIDTH} x ${DEFAULT_MINI_EXPANDED_HEIGHT}`);
          win.setMinimumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
          win.setMaximumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_EXPANDED_HEIGHT);
          win.setSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_EXPANDED_HEIGHT, false);
        } else {
          console.log(`Reduce mini window to ${DEFAULT_MINI_WIDTH} x ${DEFAULT_MINI_HEIGHT}`);
          win.setMaximumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
          win.setMinimumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
          win.setSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT, false);
        }
      }
    });
    if (electron.app.isReady()) {
      electron.screen.on("display-metrics-changed", (_event, _display, changedMetrics) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          if (changedMetrics.includes("scaleFactor")) {
            this.applyContentZoom(this.mainWindow);
          }
          this.initMinimumWindowSize();
        }
      });
    }
    this.store.onDidChange("set.contentZoomFactor", () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.applyContentZoom(this.mainWindow);
      }
    });
  }
}
const windowSizeManager = new WindowSizeManager();
const initWindowSizeManager = () => {
  if (electron.app.isReady()) {
    windowSizeManager.initialize();
  } else {
    electron.app.on("ready", () => {
      windowSizeManager.initialize();
    });
  }
};
const getWindowOptions = () => {
  return windowSizeManager.getWindowOptions();
};
const applyInitialState = (win) => {
  windowSizeManager.applyInitialState(win);
};
const saveWindowState = (win) => {
  return windowSizeManager.saveWindowState(win);
};
const getWindowState = () => {
  return windowSizeManager.getWindowState();
};
const applyContentZoom = (win) => {
  windowSizeManager.applyContentZoom(win);
};
const initWindowSizeHandlers = (mainWindow2) => {
  if (!electron.app.isReady()) {
    electron.app.on("ready", () => {
      if (mainWindow2) {
        windowSizeManager.setMainWindow(mainWindow2);
      }
    });
  } else {
    if (mainWindow2) {
      windowSizeManager.setMainWindow(mainWindow2);
    }
  }
};
const calculateMinimumWindowSize = () => {
  return { minWidth: MIN_WIDTH, minHeight: MIN_HEIGHT };
};
const store = getSharedStore();
let mainWindowInstance = null;
let isPlaying = false;
let isAppQuitting = false;
let preMiniModeState = {
  width: DEFAULT_MAIN_WIDTH,
  height: DEFAULT_MAIN_HEIGHT,
  x: void 0,
  y: void 0,
  isMaximized: false
};
function setAppQuitting(quitting) {
  isAppQuitting = quitting;
}
function initializeProxy() {
  const defaultConfig = {
    enable: false,
    protocol: "http",
    host: "127.0.0.1",
    port: 7890
  };
  const proxyConfig2 = store.get("set.proxyConfig", defaultConfig);
  if (proxyConfig2?.enable) {
    const proxyRules = `${proxyConfig2.protocol}://${proxyConfig2.host}:${proxyConfig2.port}`;
    electron.session.defaultSession.setProxy({ proxyRules });
  } else {
    electron.session.defaultSession.setProxy({ proxyRules: "" });
  }
  electron.session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: [
        "https://yt3.ggpht.com/*",
        "https://yt3.googleusercontent.com/*",
        "https://lh3.googleusercontent.com/*",
        "https://i.ytimg.com/*"
      ]
    },
    (details, callback) => {
      const headers = {
        ...details.requestHeaders,
        "Referer": "https://music.youtube.com/",
        "Origin": "https://music.youtube.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      };
      callback({ requestHeaders: headers });
    }
  );
}
function setThumbarButtons(window2) {
  window2.setThumbarButtons([
    {
      tooltip: "prev",
      icon: electron.nativeImage.createFromPath(path.join(__dirname, "../../resources/icons", "prev.png")),
      click() {
        window2.webContents.send("global-shortcut", "prevPlay");
      }
    },
    {
      tooltip: isPlaying ? "pause" : "play",
      icon: electron.nativeImage.createFromPath(
        path.join(__dirname, "../../resources/icons", isPlaying ? "pause.png" : "play.png")
      ),
      click() {
        window2.webContents.send("global-shortcut", "togglePlay");
      }
    },
    {
      tooltip: "next",
      icon: electron.nativeImage.createFromPath(path.join(__dirname, "../../resources/icons", "next.png")),
      click() {
        window2.webContents.send("global-shortcut", "nextPlay");
      }
    }
  ]);
}
function initializeWindowManager() {
  initializeProxy();
  electron.ipcMain.on("minimize-window", (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.minimize();
    }
  });
  electron.ipcMain.on("maximize-window", (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });
  electron.ipcMain.on("close-window", (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (process.platform === "darwin") {
        win.hide();
      } else {
        win.destroy();
        electron.app.quit();
      }
    }
  });
  electron.ipcMain.on("quit-app", () => {
    setAppQuitting(true);
    electron.app.quit();
  });
  electron.ipcMain.on("mini-tray", (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.hide();
    }
  });
  electron.ipcMain.on("mini-window", (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (win) {
      preMiniModeState = saveWindowState(win);
      console.log("Save normal mode state for recovery:", JSON.stringify(preMiniModeState));
      const display = electron.screen.getDisplayMatching(win.getBounds());
      const { width: screenWidth, x: screenX } = display.workArea;
      win.unmaximize();
      win.setMinimumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
      win.setMaximumSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT);
      win.setSize(DEFAULT_MINI_WIDTH, DEFAULT_MINI_HEIGHT, false);
      win.setPosition(
        screenX + screenWidth - DEFAULT_MINI_WIDTH - 20,
        display.workArea.y + 20,
        false
      );
      win.setAlwaysOnTop(true);
      win.setSkipTaskbar(false);
      win.setResizable(false);
      win.webContents.send("navigate", "/mini");
      win.webContents.send("mini-mode", true);
      win.webContents.setZoomFactor(1);
    }
  });
  electron.ipcMain.on("restore-window", (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setResizable(true);
      win.setMaximumSize(0, 0);
      console.log("Restore from mini mode, using saved state:", JSON.stringify(preMiniModeState));
      const { minWidth, minHeight } = calculateMinimumWindowSize();
      win.setMinimumSize(minWidth, minHeight);
      win.setAlwaysOnTop(false);
      win.setSkipTaskbar(false);
      win.webContents.send("navigate", "/");
      win.webContents.send("mini-mode", false);
      setTimeout(() => {
        if (preMiniModeState.x !== void 0 && preMiniModeState.y !== void 0) {
          win.setPosition(preMiniModeState.x, preMiniModeState.y, false);
        } else {
          win.center();
        }
        if (preMiniModeState.isMaximized) {
          win.maximize();
        } else {
          win.setSize(preMiniModeState.width, preMiniModeState.height, false);
        }
        applyContentZoom(win);
        setTimeout(() => {
          if (!win.isDestroyed() && !win.isMaximized() && !win.isMinimized()) {
            const [width, height] = win.getSize();
            if (Math.abs(width - preMiniModeState.width) > 2 || Math.abs(height - preMiniModeState.height) > 2) {
              console.log(
                `The window size is inconsistent after recovery, adjust again: current=${width}x${height}, Target=${preMiniModeState.width}x${preMiniModeState.height}`
              );
              win.setSize(preMiniModeState.width, preMiniModeState.height, false);
            }
          }
        }, 150);
      }, 50);
    }
  });
  electron.ipcMain.on("update-play-state", (_, playing) => {
    isPlaying = playing;
    if (mainWindowInstance) {
      setThumbarButtons(mainWindowInstance);
    }
  });
  store.onDidChange("set.proxyConfig", () => {
    initializeProxy();
  });
  initWindowSizeHandlers(mainWindowInstance);
  electron.app.on("activate", () => {
    if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
      if (!mainWindowInstance.isVisible()) {
        mainWindowInstance.show();
      }
    }
  });
}
function createMainWindow(icon2) {
  console.log("Start creating the main window...");
  const options = getWindowOptions();
  options.icon = icon2;
  options.webPreferences = {
    preload: path.join(__dirname, "../preload/index.js"),
    sandbox: false,
    contextIsolation: true,
    webSecurity: false
  };
  console.log(
    `Create window, use options: ${JSON.stringify({
      width: options.width,
      height: options.height,
      x: options.x,
      y: options.y,
      minWidth: options.minWidth,
      minHeight: options.minHeight
    })}`
  );
  const mainWindow2 = new electron.BrowserWindow(options);
  const appOrigin = (() => {
    if (!utils$2.is.dev || !process.env.ELECTRON_RENDERER_URL) return null;
    try {
      return new URL(process.env.ELECTRON_RENDERER_URL).origin;
    } catch {
      return null;
    }
  })();
  const shouldOpenInBrowser = (targetUrl) => {
    try {
      const parsedUrl = new URL(targetUrl);
      if (parsedUrl.protocol === "mailto:" || parsedUrl.protocol === "tel:") {
        return true;
      }
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return false;
      }
      if (appOrigin && parsedUrl.origin === appOrigin) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };
  const openInSystemBrowser = (targetUrl) => {
    electron.shell.openExternal(targetUrl).catch((error) => {
      console.error("Failed to open external link:", targetUrl, error);
    });
  };
  mainWindow2.removeMenu();
  applyInitialState(mainWindow2);
  const savedState = getWindowState();
  if (savedState) {
    preMiniModeState = { ...savedState };
  }
  mainWindow2.on("show", () => {
    setThumbarButtons(mainWindow2);
  });
  mainWindow2.on("close", (event) => {
    if (process.platform === "darwin") {
      if (!isAppQuitting) {
        event.preventDefault();
        mainWindow2.hide();
        return;
      }
    }
  });
  mainWindow2.on("ready-to-show", () => {
    const [width, height] = mainWindow2.getSize();
    console.log(`The size of the window before it is displayed: ${width}x${height}`);
    if (savedState && !savedState.isMaximized) {
      mainWindow2.setSize(savedState.width, savedState.height, false);
    }
    mainWindow2.show();
    applyContentZoom(mainWindow2);
    setTimeout(() => {
      if (!mainWindow2.isDestroyed() && !mainWindow2.isMaximized()) {
        const [currentWidth, currentHeight] = mainWindow2.getSize();
        if (savedState && !savedState.isMaximized) {
          if (Math.abs(currentWidth - savedState.width) > 2 || Math.abs(currentHeight - savedState.height) > 2) {
            console.log(
              `Window size does not match, adjust again: current=${currentWidth}x${currentHeight}, Target=${savedState.width}x${savedState.height}`
            );
            mainWindow2.setSize(savedState.width, savedState.height, false);
          }
        }
      }
    }, 100);
  });
  mainWindow2.webContents.on("will-navigate", (event, targetUrl) => {
    if (!shouldOpenInBrowser(targetUrl)) return;
    event.preventDefault();
    openInSystemBrowser(targetUrl);
  });
  mainWindow2.webContents.setWindowOpenHandler((details) => {
    if (shouldOpenInBrowser(details.url)) {
      openInSystemBrowser(details.url);
    }
    return { action: "deny" };
  });
  if (utils$2.is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow2.webContents.openDevTools({ mode: "detach" });
    mainWindow2.loadURL(process.env.ELECTRON_RENDERER_URL);
    electron.globalShortcut.register("CommandOrControl+Shift+I", () => {
      mainWindow2.webContents.openDevTools({ mode: "detach" });
    });
  } else {
    mainWindow2.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  initWindowSizeHandlers(mainWindow2);
  mainWindowInstance = mainWindow2;
  return mainWindow2;
}
const YTM_BASE = "https://music.youtube.com/youtubei/v1";
const API_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-KZBW_4qT8";
const DEFAULT_CONTEXT = {
  client: {
    clientName: "WEB_REMIX",
    clientVersion: "1.20241121.01.00",
    hl: "en",
    gl: "US",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    timeZone: "UTC",
    utcOffsetMinutes: 0
  }
};
async function ytmPost(endpoint, body, cookie) {
  const url2 = `${YTM_BASE}/${endpoint}?key=${API_KEY}&prettyPrint=false`;
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": DEFAULT_CONTEXT.client.userAgent,
    Origin: "https://music.youtube.com",
    Referer: "https://music.youtube.com/",
    "X-YouTube-Client-Name": "67",
    "X-YouTube-Client-Version": DEFAULT_CONTEXT.client.clientVersion,
    "X-Goog-Visitor-Id": "",
    "Accept-Language": "en-US,en;q=0.9"
  };
  if (cookie) {
    headers["Cookie"] = cookie;
    const sapisid = cookie.match(/SAPISID=([^;]+)/)?.[1];
    if (sapisid) {
      const ts = Math.floor(Date.now() / 1e3);
      const hash = await computeSHA1Hash(`${ts} ${sapisid} https://music.youtube.com`);
      headers["Authorization"] = `SAPISIDHASH ${ts}_${hash}`;
    }
  }
  const payload = {
    context: DEFAULT_CONTEXT,
    ...body
  };
  const res = await fetch$1(url2, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    redirect: "follow"
  });
  if (!res.ok) {
    throw new Error(`YTM API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
async function computeSHA1Hash(input) {
  const { createHash } = await import("crypto");
  return createHash("sha1").update(input).digest("hex");
}
function parseRuns(runs) {
  if (!runs) return "";
  return runs.map((r) => r.text || "").join("");
}
function parseThumbnail(thumbnails) {
  if (!thumbnails?.length) return "";
  return thumbnails[thumbnails.length - 1]?.url || "";
}
function squareThumbnail(url2, size = 226) {
  if (!url2) return "";
  if (url2.includes("lh3.googleusercontent.com") || url2.includes("yt3.ggpht.com")) {
    if (url2.includes("=w")) {
      return url2.replace(/=w\d+-h\d+/, `=w${size}-h${size}`);
    }
    const base = url2.split("=")[0];
    return `${base}=w${size}-h${size}-p-l90-rj`;
  }
  if (url2.includes("i.ytimg.com")) {
    if (/\/vi\/[^/]+\/(maxresdefault|hqdefault|mqdefault|sddefault|default)\./.test(url2)) {
      return url2.replace(/\/(maxresdefault|hqdefault|mqdefault|sddefault|default)\./, "/hqdefault.").split("?")[0];
    }
    return url2.split("?")[0];
  }
  return url2;
}
function parseSongItem(renderer) {
  try {
    const cols = renderer.flexColumns || [];
    const title = parseRuns(cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs);
    const subtitle = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
    const isArtistItem = subtitle.some(
      (run) => run.text === "Artist" || run.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === "MUSIC_PAGE_TYPE_ARTIST_OVERVIEW"
    );
    if (isArtistItem) return null;
    const artists = [];
    let album;
    let duration;
    subtitle.forEach((run, i) => {
      if (run.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === "MUSIC_PAGE_TYPE_ARTIST" || run.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === "MUSIC_PAGE_TYPE_USER_CHANNEL") {
        artists.push({ name: run.text, id: run.navigationEndpoint?.browseEndpoint?.browseId });
      } else if (run.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === "MUSIC_PAGE_TYPE_ALBUM") {
        album = run.text;
      } else if (!run.navigationEndpoint && run.text !== " • ") {
        if (run.text?.match(/^\d+:\d+$/)) duration = run.text;
        else if (artists.length === 0 && (i === 0 || i === 2) && run.text && run.text !== "Video" && run.text !== "Song") {
          artists.push({ name: run.text });
        }
      }
    });
    const videoId = renderer.playlistItemData?.videoId || renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
    const thumbnails = renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || renderer.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails;
    if (!videoId || !title) return null;
    return {
      id: videoId,
      title,
      artists,
      album,
      duration,
      thumbnail: squareThumbnail(parseThumbnail(thumbnails))
    };
  } catch {
    return null;
  }
}
function parsePlaylistItem(renderer) {
  try {
    const title = parseRuns(renderer.title?.runs) || parseRuns(renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs);
    const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId || renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchPlaylistEndpoint?.playlistId;
    const thumbnails = renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || renderer.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails || renderer.thumbnailRenderer?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails || renderer.thumbnail?.thumbnails || renderer.thumbnail?.artistArtRef?.[0]?.thumbnails || renderer.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
    const subtitle = renderer.flexColumns?.slice(1).map(
      (fc) => parseRuns(fc?.musicResponsiveListItemFlexColumnRenderer?.text?.runs)
    ).filter(Boolean).join(" • ") || "";
    if (!title) return null;
    return {
      id: browseId || "",
      title,
      subtitle,
      thumbnail: squareThumbnail(parseThumbnail(thumbnails || []))
    };
  } catch {
    return null;
  }
}
function parseMusicShelfSection(shelf) {
  const title = parseRuns(shelf.title?.runs) || shelf.title?.simpleText || "";
  const items = [];
  (shelf.contents || []).forEach((c) => {
    const renderer = c.musicResponsiveListItemRenderer || c.musicTwoRowItemRenderer;
    if (!renderer) return;
    const song = parseSongItem(renderer);
    if (song) {
      items.push(song);
      return;
    }
    const playlist = parsePlaylistItem(renderer);
    if (playlist) items.push(playlist);
  });
  return { title, items };
}
async function getHomePage(cookie) {
  const data = await ytmPost(
    "browse",
    { browseId: "FEmusic_home" },
    cookie
  );
  const sections = [];
  const contents = data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
  for (const content of contents) {
    const shelf = content.musicImmersiveCarouselShelfRenderer || content.musicCarouselShelfRenderer || content.musicShelfRenderer || content.musicImmersiveHeaderRenderer;
    if (!shelf) continue;
    const title = parseRuns(shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs) || parseRuns(shelf.header?.musicImmersiveCarouselShelfBasicHeaderRenderer?.title?.runs) || parseRuns(shelf.title?.runs) || "";
    const items = [];
    (shelf.contents || []).forEach((c) => {
      const renderer = c.musicTwoRowItemRenderer || c.musicResponsiveListItemRenderer;
      if (!renderer) return;
      const song = parseSongItem(renderer);
      if (song) {
        items.push(song);
        return;
      }
      const playlist = parsePlaylistItem(renderer);
      if (playlist) items.push(playlist);
    });
    if (items.length > 0) {
      sections.push({ title: title || "Recommended", items });
    }
  }
  return { sections };
}
async function getChartsPage(cookie) {
  const data = await ytmPost(
    "browse",
    { browseId: "FEmusic_charts" },
    cookie
  );
  const sections = [];
  const contents = data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
  for (const content of contents) {
    const shelf = content.musicShelfRenderer || content.musicCarouselShelfRenderer;
    if (!shelf) continue;
    sections.push(parseMusicShelfSection(shelf));
  }
  return { sections };
}
async function search(query, filter2, cookie) {
  const body = { query };
  const filterMap = {
    songs: "EgWKAQIIAWoKEAkQAxAEEAoQBQ==",
    videos: "EgWKAQIQAWoKEAkQAxAEEAoQBQ==",
    albums: "EgWKAQIYAWoKEAkQAxAEEAoQBQ==",
    artists: "EgWKAQIgAWoKEAkQAxAEEAoQBQ==",
    playlists: "Eg-KAQwIABAAGAAgACgBMABqChAJEAMQBBAKEAU="
  };
  if (filter2 && filterMap[filter2]) {
    body.params = filterMap[filter2];
  }
  const data = await ytmPost("search", body, cookie);
  let topResult;
  const songs = [];
  const playlists = [];
  const albums = [];
  const artists = [];
  const videos = [];
  const contents = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || data.contents?.sectionListRenderer?.contents || [];
  for (const content of contents) {
    if (content.musicCardShelfRenderer && !topResult) {
      const r = content.musicCardShelfRenderer;
      const title = parseRuns(r.title?.runs);
      const thumbnails = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
      const browseId = r.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || r.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId || "";
      let subtitle = parseRuns(r.subtitle?.runs);
      const isSongCard = subtitle?.includes("Song");
      const isArtistCard = subtitle?.includes("Artist");
      const isVideoCard = subtitle?.includes("Video");
      const isAlbumCard = subtitle?.includes("Album") || subtitle?.includes("Single") || subtitle?.includes("EP");
      let resultType = "Top Result";
      if (isSongCard) resultType = "Song";
      else if (isVideoCard) resultType = "Video";
      else if (isArtistCard) resultType = "Artist";
      else if (isAlbumCard) resultType = "Album";
      if (subtitle) {
        const parts = subtitle.split(" • ");
        subtitle = parts.filter((part) => {
          const lower = part.trim().toLowerCase();
          if (lower === "video" || lower === "song" || lower === "artist" || lower === "album" || lower === "single" || lower === "ep") return false;
          if (lower.includes("views") || lower.includes("plays")) return false;
          return true;
        }).join(" • ");
      }
      if (title && (isSongCard || isArtistCard || isVideoCard)) {
        topResult = {
          id: browseId,
          title,
          subtitle,
          thumbnail: squareThumbnail(parseThumbnail(thumbnails || [])),
          resultType
        };
      }
    }
    const shelf = content.musicShelfRenderer || content.musicCardShelfRenderer;
    let shelfContents = shelf?.contents || [];
    if (!shelf && content.itemSectionRenderer) {
      shelfContents = content.itemSectionRenderer.contents || [];
    }
    if (!shelfContents.length) continue;
    for (const c of shelfContents) {
      const renderer = c.musicResponsiveListItemRenderer || c.musicTwoRowItemRenderer;
      if (!renderer) continue;
      const song = parseSongItem(renderer);
      if (song) {
        const ep = renderer.navigationEndpoint || renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint;
        const videoType = ep?.watchEndpoint?.watchEndpointMusicSupportedConfigs?.watchEndpointMusicConfig?.musicVideoType;
        const firstRun = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
        const allRunsText = (renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []).map((r) => r.text).join("");
        const isVideoType = videoType?.includes("MUSIC_VIDEO_TYPE_UGC") || videoType?.includes("MUSIC_VIDEO_TYPE_OMV") || firstRun === "Video";
        const isSongType = videoType?.includes("MUSIC_VIDEO_TYPE_ATV") || firstRun === "Song" || firstRun === "Audio";
        if (filter2 === "videos") {
          videos.push(song);
        } else if (filter2 === "songs") {
          songs.push(song);
        } else {
          if (isVideoType) {
            videos.push(song);
          } else if (isSongType) {
            songs.push(song);
          } else {
            if (allRunsText.includes("Video") || !song.album) {
              videos.push(song);
            } else {
              songs.push(song);
            }
          }
        }
        continue;
      }
      const playlist = parsePlaylistItem(renderer);
      if (playlist) {
        if (filter2 === "albums" || playlist.subtitle?.includes("Album") || playlist.subtitle?.includes("EP") || playlist.subtitle?.includes("Single")) albums.push(playlist);
        else if (filter2 === "artists" || playlist.subtitle?.includes("Artist") || playlist.subtitle?.includes("artist")) artists.push(playlist);
        else playlists.push(playlist);
      }
    }
  }
  if (!topResult) {
    if (songs.length > 0) {
      const firstSong = songs[0];
      topResult = {
        id: firstSong.id,
        title: firstSong.title,
        subtitle: firstSong.artists.map((a) => a.name).join(", "),
        thumbnail: firstSong.thumbnail,
        artists: firstSong.artists,
        album: firstSong.album,
        resultType: "Song"
      };
    } else if (videos.length > 0) {
      const firstVideo = videos[0];
      topResult = {
        id: firstVideo.id,
        title: firstVideo.title,
        subtitle: firstVideo.artists.map((a) => a.name).join(", "),
        thumbnail: firstVideo.thumbnail,
        artists: firstVideo.artists,
        album: firstVideo.album,
        resultType: "Video"
      };
    }
  }
  return { topResult, songs, playlists, albums, artists, videos, total: songs.length + playlists.length + albums.length + artists.length + videos.length };
}
async function getSearchSuggestions(query, _cookie) {
  try {
    const encoded = encodeURIComponent(query);
    const url2 = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encoded}&hl=en&gl=IN&callback=f`;
    const res = await fetch$1(url2, {
      headers: {
        "User-Agent": DEFAULT_CONTEXT.client.userAgent,
        Referer: "https://music.youtube.com/"
      }
    });
    if (!res.ok) return [];
    const text = await res.text();
    const json = text.replace(/^f\(/, "").replace(/\)$/, "");
    const parsed = JSON.parse(json);
    const raw = parsed[1] || [];
    return raw.slice(0, 8).map((item) => ({
      query: item[0],
      fromHistory: false
    }));
  } catch {
    return [];
  }
}
async function getMoodsAndGenres(cookie) {
  const data = await ytmPost(
    "browse",
    { browseId: "FEmusic_moods_and_genres" },
    cookie
  );
  const moods = [];
  const contents = data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
  for (const content of contents) {
    const shelf = content.gridRenderer || content.musicCarouselShelfRenderer;
    if (!shelf) continue;
    (shelf.items || shelf.contents || []).forEach((c) => {
      const r = c.musicNavigationButtonRenderer;
      if (!r) return;
      const id = r.clickCommand?.browseEndpoint?.browseId || "";
      const title = parseRuns(r.buttonText?.runs) || r.buttonText?.simpleText || "";
      const thumbnail = "";
      if (title) moods.push({ id, title, thumbnail });
    });
  }
  return moods;
}
function initializeYTMusic() {
  electron.ipcMain.handle("ytm:home", async (_event, cookie) => {
    try {
      return { success: true, data: await getHomePage(cookie) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("ytm:charts", async (_event, cookie) => {
    try {
      return { success: true, data: await getChartsPage(cookie) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("ytm:search", async (_event, query, filter2, cookie) => {
    try {
      return { success: true, data: await search(query, filter2, cookie) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("ytm:suggestions", async (_event, query, cookie) => {
    try {
      return { success: true, data: await getSearchSuggestions(query, cookie) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  electron.ipcMain.handle("ytm:moods", async (_event, cookie) => {
    try {
      return { success: true, data: await getMoodsAndGenres(cookie) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}
class DiscordPresenceManager {
  ws = null;
  isReady = false;
  currentActivity = null;
  token = "";
  heartbeatInterval = null;
  seq = null;
  sessionId = "";
  clientId = "";
  constructor() {
    const store2 = getStore();
    this.token = store2.get("set.discordToken") || "";
    this.clientId = store2.get("set.discordClientId") || "1554131750899163186";
    if (this.token) {
      this.initGateway();
    }
    this.setupIPC();
  }
  initGateway() {
    return new Promise((resolve, reject) => {
      this.cleanup();
      this.ws = new WebSocket("wss://gateway.discord.gg/?v=9&encoding=json");
      this.ws.on("open", () => {
        console.log("Discord Gateway connected");
      });
      this.ws.on("message", (data) => {
        const payload = JSON.parse(data.toString());
        if (payload.s !== null) this.seq = payload.s;
        if (payload.op === 10) {
          const interval = payload.d.heartbeat_interval;
          this.startHeartbeat(interval);
          this.identify();
          resolve();
        } else if (payload.op === 0 && payload.t === "READY") {
          console.log("Discord Gateway READY");
          this.isReady = true;
          this.sessionId = payload.d.session_id;
          if (this.currentActivity) {
            this.setActivity(this.currentActivity);
          }
        }
      });
      this.ws.on("close", () => {
        console.log("Discord Gateway closed");
        this.cleanup();
      });
      this.ws.on("error", (err) => {
        console.error("Discord Gateway error:", err);
        reject(err);
      });
    });
  }
  startHeartbeat(interval) {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ op: 1, d: this.seq }));
      }
    }, interval);
  }
  identify() {
    if (!this.ws || !this.token) return;
    const presence = this.currentActivity ? {
      status: "online",
      since: 0,
      activities: [this.currentActivity],
      afk: false
    } : {
      status: "online",
      since: 0,
      activities: [],
      afk: false
    };
    const payload = {
      op: 2,
      d: {
        token: this.token,
        properties: {
          os: "windows",
          browser: "Chorus Deck",
          device: "pc"
        },
        presence
      }
    };
    this.ws.send(JSON.stringify(payload));
  }
  cleanup() {
    this.isReady = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  setupIPC() {
    electron.ipcMain.handle("discord-webview-login", async () => {
      return new Promise((resolve, reject) => {
        const win = new electron.BrowserWindow({
          width: 800,
          height: 700,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            partition: "discord-login"
            // non-persistent: fresh session every time, no shared cookies
          }
        });
        win.setMenuBarVisibility(false);
        const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        win.loadURL("https://discord.com/login", { userAgent });
        let isResolved = false;
        const checkToken = async () => {
          if (win.isDestroyed()) return;
          const currentUrl = win.webContents.getURL();
          if (currentUrl.includes("/login")) return;
          try {
            const token = await win.webContents.executeJavaScript(`
              (() => {
                try {
                  // Fallback: check localStorage directly first
                  let t = window.localStorage.getItem('token');
                  if (t) return t.replace(/"/g, '');
                  
                  // Webpack chunk method to get token
                  let token = null;
                  const req = window.webpackChunkdiscord_app?.push([[Math.random()], {}, (r) => r]);
                  if (req) {
                    for (const m of Object.keys(req.c).map(x => req.c[x].exports).filter(x => x)) {
                      if (m.default && m.default.getToken !== undefined) {
                        token = m.default.getToken();
                        break;
                      }
                      if (m.getToken !== undefined) {
                        token = m.getToken();
                        break;
                      }
                    }
                  }
                  return token;
                } catch(e) {
                  return null;
                }
              })()
            `);
            if (token) {
              isResolved = true;
              clearInterval(interval);
              this.token = token;
              const store2 = getStore();
              store2.set("set.discordToken", token);
              this.initGateway().catch(console.error);
              let userInfo = { token, username: "", name: "", avatarUrl: "" };
              try {
                const user = await this.fetchDiscordUser(token);
                if (user) {
                  userInfo.username = user.username;
                  userInfo.name = user.global_name || user.username;
                  userInfo.avatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : "";
                  store2.set("set.discordUsername", userInfo.username);
                  store2.set("set.discordName", userInfo.name);
                  store2.set("set.discordAvatarUrl", userInfo.avatarUrl);
                }
              } catch (e) {
                console.error("Failed to fetch Discord user info:", e);
              }
              resolve(userInfo);
              if (!win.isDestroyed()) {
                win.close();
              }
            }
          } catch (e) {
          }
        };
        const interval = setInterval(checkToken, 1e3);
        win.on("closed", () => {
          clearInterval(interval);
          if (!isResolved) {
            reject(new Error("Window closed before login"));
          }
        });
      });
    });
    electron.ipcMain.on("discord-logout", () => {
      this.token = "";
      const store2 = getStore();
      store2.set("set.discordToken", "");
      this.destroy();
    });
    electron.ipcMain.on("update-discord-presence", (_event, presenceData) => {
      console.log("Received update-discord-presence event:", presenceData);
      this.currentActivity = this.formatActivity(presenceData);
      console.log("Formatted activity:", this.currentActivity);
      if (this.isReady && this.ws) {
        this.setActivity(this.currentActivity);
      } else {
        console.log("RPC not ready or not initialized");
      }
    });
    electron.ipcMain.on("clear-discord-presence", () => {
      this.currentActivity = null;
      if (this.isReady && this.ws) {
        this.setActivity(null);
      }
    });
  }
  formatActivity(data) {
    const store2 = getStore();
    const enabled = store2.get("set.discordRPCEnabled");
    if (enabled === false) return null;
    const showWhenPaused = store2.get("set.discordShowWhenPaused") || false;
    if (!data.isPlaying && !showWhenPaused) {
      return null;
    }
    const detailsPref = store2.get("set.discordActivityDetails") || "ARTIST";
    const statePref = store2.get("set.discordActivityState") || "ALBUM";
    const getSourceValue = (pref, defaultVal) => {
      switch (pref) {
        case "ARTIST":
          return data.artist || defaultVal;
        case "ALBUM":
          return data.album || defaultVal;
        case "SONG":
          return data.title || defaultVal;
        case "APP":
          return "Chorus Deck";
        default:
          return defaultVal;
      }
    };
    const detailsText = getSourceValue(detailsPref, data.title || "Chorus Deck").substring(0, 128);
    let stateText = getSourceValue(statePref, "").substring(0, 128);
    const largeImageType = store2.get("set.discordLargeImageType") || "thumbnail";
    const largeImageCustomUrl = store2.get("set.discordLargeImageCustomUrl") || "";
    const smallImageType = store2.get("set.discordSmallImageType") || "dontshow";
    const smallImageCustomUrl = store2.get("set.discordSmallImageCustomUrl") || "";
    let largeImageKey = "chorus_logo";
    if (largeImageType === "thumbnail") largeImageKey = data.albumArt || "chorus_logo";
    else if (largeImageType === "custom" && largeImageCustomUrl) largeImageKey = largeImageCustomUrl;
    let smallImageKey = "";
    if (smallImageType === "thumbnail") smallImageKey = data.albumArt || "chorus_logo";
    else if (smallImageType === "custom" && smallImageCustomUrl) smallImageKey = smallImageCustomUrl;
    const largeImageText = getSourceValue("ALBUM", data.album || data.title).substring(0, 128);
    const smallImageText = data.isPlaying ? `Playing ${data.title} from Chorus Deck`.substring(0, 128) : "Paused";
    let endTimestamp;
    if (data.isPlaying && data.duration > 0 && data.startTimestamp) {
      endTimestamp = data.startTimestamp + data.duration;
    }
    const activityTypePref = store2.get("set.discordActivityType") || "LISTENING";
    let activityType = 2;
    switch (activityTypePref) {
      case "PLAYING":
        activityType = 0;
        break;
      case "STREAMING":
        activityType = 1;
        break;
      case "LISTENING":
        activityType = 2;
        break;
      case "WATCHING":
        activityType = 3;
        break;
      case "COMPETING":
        activityType = 5;
        break;
    }
    return {
      name: data.title || "Chorus Deck",
      type: activityType,
      application_id: this.clientId,
      details: detailsText,
      state: stateText || void 0,
      timestamps: {
        start: data.startTimestamp ? Math.round(new Date(data.startTimestamp).getTime()) : void 0,
        end: endTimestamp ? Math.round(new Date(endTimestamp).getTime()) : void 0
      },
      assets: {
        large_image: largeImageKey,
        large_text: largeImageText,
        small_image: smallImageKey || void 0,
        small_text: smallImageText
      }
    };
  }
  setActivity(activity) {
    if (this.ws && this.isReady) {
      const presence = activity ? {
        status: "online",
        since: 0,
        activities: [activity],
        afk: false
      } : {
        status: "online",
        since: 0,
        activities: [],
        afk: false
      };
      this.ws.send(JSON.stringify({
        op: 3,
        // Presence Update
        d: presence
      }));
    }
  }
  destroy() {
    this.cleanup();
  }
  fetchDiscordUser(token) {
    return new Promise((resolve, reject) => {
      const request = electron.net.request({
        method: "GET",
        url: "https://discord.com/api/v9/users/@me",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      let body = "";
      request.on("response", (response) => {
        response.on("data", (chunk) => {
          body += chunk.toString();
        });
        response.on("end", () => {
          try {
            const user = JSON.parse(body);
            if (user && user.id) {
              resolve(user);
            } else {
              reject(new Error("Invalid user response: " + body));
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      request.on("error", reject);
      request.end();
    });
  }
}
const FILE_LOCK_ERROR_CODES = /* @__PURE__ */ new Set(["EBUSY", "EPERM", "EACCES", "EAGAIN", "EMFILE", "ENFILE"]);
process.on("uncaughtException", (error) => {
  if (error?.code && FILE_LOCK_ERROR_CODES.has(error.code) && typeof error.path === "string") {
    console.error("[main] File is occupied/Locked, this read and write has been ignored:", error.message);
    return;
  }
  console.error("[main] Uncaught exception:", error);
  electron.dialog.showErrorBox(
    "A JavaScript error occurred in the main process",
    error?.stack || String(error)
  );
});
process.on("unhandledRejection", (reason) => {
  console.error("[main] unprocessed Promise reject:", reason);
});
electron.protocol.registerSchemesAsPrivileged([
  {
    scheme: "local",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true
    }
  }
]);
const iconPath = path.join(__dirname, "../../resources");
const icon = electron.nativeImage.createFromPath(
  process.platform === "darwin" ? path.join(iconPath, "icon.icns") : process.platform === "win32" ? path.join(iconPath, "logo.png") : path.join(iconPath, "logo.png")
);
let mainWindow;
let discordManager = null;
function initialize(_configStore) {
  initializeFileManager();
  initializeDownloadManager();
  initializeCacheManager();
  initializeOtherApi();
  initializeWindowManager();
  initializeFonts();
  initializeLoginWindow();
  initializeLocalMusicScanner();
  mainWindow = createMainWindow(icon);
  setDownloadManagerWindow(mainWindow);
  initializeTray(iconPath, mainWindow);
  initLxMusicHttp();
  loadLyricWindow(electron.ipcMain, mainWindow);
  initializeShortcuts(mainWindow);
  initializeRemoteControl(mainWindow);
  initializeMpris(mainWindow);
  setupUpdateHandlers(mainWindow);
  setupThemeHandlers();
  initializeYTMusic();
  if (!discordManager) {
    discordManager = new DiscordPresenceManager();
  }
}
const isSingleInstance = electron.app.requestSingleInstanceLock();
if (!isSingleInstance) {
  electron.app.quit();
} else {
  if (process.platform === "linux") {
    electron.app.commandLine.appendSwitch("disable-features", "MediaSessionService");
  }
  try {
    initializeConfig();
  } catch (error) {
    console.error("Config settings initialization failed:", error);
  }
  electron.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });
  electron.app.whenReady().then(() => {
    utils$2.electronApp.setAppUserModelId("com.chorus.deck");
    electron.app.on("browser-window-created", (_, window2) => {
      utils$2.optimizer.watchWindowShortcuts(window2);
    });
    initWindowSizeManager();
    electron.session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      if (permission === "media" || permission === "audioCapture") {
        callback(false);
        return;
      }
      callback(true);
    });
    electron.session.defaultSession.setPermissionCheckHandler(() => {
      return true;
    });
    initializeConfig();
    initialize();
    electron.app.on("activate", () => {
      if (mainWindow === null) initialize();
    });
  });
  electron.ipcMain.on("update-play-state", (_, playing) => {
    updatePlayState(playing);
    updateMprisPlayState(playing);
  });
  electron.ipcMain.on("update-current-song", (_, song) => {
    updateCurrentSong(song);
    updateMprisCurrentSong(song);
  });
  electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      electron.app.quit();
    }
  });
  electron.app.on("before-quit", () => {
    if (discordManager) {
      discordManager.destroy();
    }
    setAppQuitting(true);
  });
  electron.ipcMain.on("restart", () => {
    electron.app.relaunch();
    electron.app.exit(0);
  });
  electron.ipcMain.on("get-arch", (event) => {
    event.returnValue = process.arch;
  });
}
