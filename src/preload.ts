import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  dbHealthCheck: () => ipcRenderer.invoke('db-health-check'),
  dbVacuum: () => ipcRenderer.invoke('db-vacuum'),

  // Application info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: (name: string) => ipcRenderer.invoke('get-app-path', name),

  // Menu event listeners
  onMenuNewPrompt: (callback: () => void) => {
    ipcRenderer.on('menu-new-prompt', callback);
  },
  onMenuNewTemplate: (callback: () => void) => {
    ipcRenderer.on('menu-new-template', callback);
  },
  onMenuExportAll: (callback: () => void) => {
    ipcRenderer.on('menu-export-all', callback);
  },
  onMenuImport: (callback: () => void) => {
    ipcRenderer.on('menu-import', callback);
  },
  onMenuSearch: (callback: () => void) => {
    ipcRenderer.on('menu-search', callback);
  },
  onMenuAbout: (callback: () => void) => {
    ipcRenderer.on('menu-about', callback);
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      dbHealthCheck: () => Promise<boolean>;
      dbVacuum: () => Promise<boolean>;
      getAppVersion: () => Promise<string>;
      getAppPath: (name: string) => Promise<string>;
      onMenuNewPrompt: (callback: () => void) => void;
      onMenuNewTemplate: (callback: () => void) => void;
      onMenuExportAll: (callback: () => void) => void;
      onMenuImport: (callback: () => void) => void;
      onMenuSearch: (callback: () => void) => void;
      onMenuAbout: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}