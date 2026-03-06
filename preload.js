/**
 * OpenCowork — Preload Script
 *
 * Exposes a typed `window.api` object via contextBridge.
 * The renderer communicates with the main process exclusively through this API.
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getEnvStatus: () => ipcRenderer.invoke('get-env-status'),
  saveApiKeys: (keys) => ipcRenderer.invoke('save-api-keys', keys),

  selectFolder: () => ipcRenderer.invoke('select-folder'),
  setWorkspace: (path) => ipcRenderer.invoke('set-workspace', path),

  sendMessage: (conversationId, message) =>
    ipcRenderer.invoke('send-message', { conversationId, message }),
  cancelTask: (conversationId) => ipcRenderer.invoke('cancel-task', conversationId),
  confirmAction: (actionId, approved) =>
    ipcRenderer.invoke('confirm-action', { actionId, approved }),

  search: (query, options) => ipcRenderer.invoke('search', query, options),

  getConversations: () => ipcRenderer.invoke('get-conversations'),
  getConversationMessages: (id) => ipcRenderer.invoke('get-conversation-messages', id),
  createConversation: (title) => ipcRenderer.invoke('create-conversation', title),
  deleteConversation: (id) => ipcRenderer.invoke('delete-conversation', id),

  getGlobalInstructions: () => ipcRenderer.invoke('get-global-instructions'),
  saveGlobalInstructions: (instructions) =>
    ipcRenderer.invoke('save-global-instructions', instructions),

  getSkills: () => ipcRenderer.invoke('get-skills'),

  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSetting: (key, value) => ipcRenderer.invoke('save-setting', key, value),

  getTasks: () => ipcRenderer.invoke('get-tasks'),

  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  revealInFinder: (path) => ipcRenderer.invoke('reveal-in-finder', path),

  onAgentEvent: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('agent-event', handler);
    return () => ipcRenderer.removeListener('agent-event', handler);
  },

  onSearchResults: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('search-results', handler);
    return () => ipcRenderer.removeListener('search-results', handler);
  },

  onOpenPalette: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('open-palette', handler);
    return () => ipcRenderer.removeListener('open-palette', handler);
  },

  onConfirmRequest: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('confirm-request', handler);
    return () => ipcRenderer.removeListener('confirm-request', handler);
  },
});
