/**
 * OpenCowork — Electron Main Process Entry
 *
 * Creates the BrowserWindow, registers IPC handlers, initializes the agent core,
 * MCP manager, database, and global shortcuts.
 */
import { app, BrowserWindow, ipcMain, globalShortcut, dialog, shell } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { initDatabase, getDb } from './src/main/db.js';
import { AgentCore } from './src/main/agent.js';
import { loadGlobalInstructions, loadFolderInstructions } from './src/main/instructions.js';
import { MCPManager } from './src/main/mcp.js';
import { ComposioManager } from './src/main/composio.js';
import { UniversalSearch } from './src/main/search/universalSearch.js';
import { loadSkills } from './src/main/skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config();

/** @type {BrowserWindow | null} */
let mainWindow = null;

/** @type {AgentCore | null} */
let agentCore = null;

/** @type {UniversalSearch | null} */
let universalSearch = null;

/** @type {MCPManager | null} */
let mcpManager = null;

/** @type {ComposioManager | null} */
let composioManager = null;

/** @type {string | null} */
let activeWorkspace = null;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerGlobalShortcuts() {
  globalShortcut.register('CommandOrControl+K', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('open-palette');
    }
  });
}

function registerIpcHandlers() {
  ipcMain.handle('get-env-status', () => ({
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasComposioKey: !!process.env.COMPOSIO_API_KEY,
  }));

  ipcMain.handle('save-api-keys', async (_event, { anthropicKey, composioKey }) => {
    const { writeFileSync, readFileSync, existsSync } = await import('fs');
    const envPath = join(__dirname, '.env');
    let content = '';
    if (existsSync(envPath)) {
      content = readFileSync(envPath, 'utf-8');
    }
    if (anthropicKey) {
      process.env.ANTHROPIC_API_KEY = anthropicKey;
      content = content.includes('ANTHROPIC_API_KEY')
        ? content.replace(/ANTHROPIC_API_KEY=.*/, `ANTHROPIC_API_KEY=${anthropicKey}`)
        : content + `\nANTHROPIC_API_KEY=${anthropicKey}`;
    }
    if (composioKey) {
      process.env.COMPOSIO_API_KEY = composioKey;
      content = content.includes('COMPOSIO_API_KEY')
        ? content.replace(/COMPOSIO_API_KEY=.*/, `COMPOSIO_API_KEY=${composioKey}`)
        : content + `\nCOMPOSIO_API_KEY=${composioKey}`;
    }
    writeFileSync(envPath, content.trim() + '\n');
    return { success: true };
  });

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('set-workspace', async (_event, folderPath) => {
    activeWorkspace = folderPath;
    const folderInstructions = await loadFolderInstructions(folderPath);
    if (agentCore) {
      agentCore.setWorkspace(folderPath, folderInstructions);
    }
    if (universalSearch) {
      universalSearch.setWorkspace(folderPath);
    }
    return { success: true, path: folderPath };
  });

  ipcMain.handle('send-message', async (_event, { conversationId, message }) => {
    if (!agentCore) return { error: 'Agent not initialized' };
    if (!activeWorkspace) return { error: 'No workspace selected' };

    try {
      const response = await agentCore.sendMessage(conversationId, message, (event) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('agent-event', event);
        }
      });
      return response;
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('cancel-task', async (_event, conversationId) => {
    if (agentCore) {
      agentCore.cancelTask(conversationId);
    }
    return { success: true };
  });

  ipcMain.handle('confirm-action', async (_event, { actionId, approved }) => {
    if (agentCore) {
      agentCore.resolveConfirmation(actionId, approved);
    }
    return { success: true };
  });

  ipcMain.handle('search', async (_event, query, options = {}) => {
    if (!universalSearch) return { results: [] };

    universalSearch.search(query, options, (partialResults) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('search-results', partialResults);
      }
    });

    return { started: true };
  });

  ipcMain.handle('get-conversations', async () => {
    const db = getDb();
    if (!db) return [];
    return db.prepare(
      'SELECT id, workspace, title, created_at FROM conversations ORDER BY created_at DESC LIMIT 50'
    ).all();
  });

  ipcMain.handle('get-conversation-messages', async (_event, conversationId) => {
    const db = getDb();
    if (!db) return [];
    return db.prepare(
      'SELECT id, role, content, tool_name, tool_input, tool_output, timestamp FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC'
    ).all(conversationId);
  });

  ipcMain.handle('create-conversation', async (_event, title) => {
    const db = getDb();
    if (!db) return null;
    const { v4: uuidv4 } = await import('uuid');
    const id = uuidv4();
    db.prepare(
      'INSERT INTO conversations (id, workspace, title, created_at) VALUES (?, ?, ?, ?)'
    ).run(id, activeWorkspace || '', title || 'New Conversation', new Date().toISOString());
    return { id, title: title || 'New Conversation' };
  });

  ipcMain.handle('delete-conversation', async (_event, conversationId) => {
    const db = getDb();
    if (!db) return { success: false };
    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(conversationId);
    db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId);
    return { success: true };
  });

  ipcMain.handle('get-global-instructions', async () => {
    return await loadGlobalInstructions();
  });

  ipcMain.handle('save-global-instructions', async (_event, instructions) => {
    const { writeFileSync, mkdirSync } = await import('fs');
    const configDir = join(app.getPath('userData'), 'config');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, 'instructions.md'), instructions, 'utf-8');
    if (agentCore) {
      agentCore.setGlobalInstructions(instructions);
    }
    return { success: true };
  });

  ipcMain.handle('get-skills', async () => {
    return loadSkills();
  });

  ipcMain.handle('get-settings', async () => {
    const db = getDb();
    if (!db) return {};
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    return settings;
  });

  ipcMain.handle('save-setting', async (_event, key, value) => {
    const db = getDb();
    if (!db) return { success: false };
    db.prepare(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
    ).run(key, JSON.stringify(value));
    return { success: true };
  });

  ipcMain.handle('open-external', async (_event, url) => {
    await shell.openExternal(url);
    return { success: true };
  });

  ipcMain.handle('reveal-in-finder', async (_event, filePath) => {
    shell.showItemInFolder(filePath);
    return { success: true };
  });

  ipcMain.handle('get-tasks', async () => {
    const db = getDb();
    if (!db) return [];
    return db.prepare(
      'SELECT id, conversation_id, status, title, created_at FROM tasks ORDER BY created_at DESC LIMIT 50'
    ).all();
  });
}

async function initialize() {
  try {
    await initDatabase();

    const globalInstructions = await loadGlobalInstructions();
    const skills = loadSkills();

    agentCore = new AgentCore({
      globalInstructions,
      skills,
    });

    mcpManager = new MCPManager();
    composioManager = new ComposioManager();

    universalSearch = new UniversalSearch({
      workspacePath: activeWorkspace,
      composioManager,
    });

    console.log('OpenCowork initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize OpenCowork:', err);
  }
}

app.whenReady().then(async () => {
  await initialize();
  createWindow();
  registerGlobalShortcuts();
  registerIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
