/**
 * Instructions loader — manages global and folder-specific instructions.
 *
 * Global instructions are stored in the app's userData config directory.
 * Folder instructions are stored as .openwork/instructions.md in each workspace.
 */
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

/**
 * Loads global user instructions from the app config directory.
 * @returns {Promise<string>}
 */
export async function loadGlobalInstructions() {
  try {
    const configPath = join(app.getPath('userData'), 'config', 'instructions.md');
    if (!existsSync(configPath)) return '';
    return await readFile(configPath, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Loads folder-specific instructions from .openwork/instructions.md.
 * @param {string} folderPath
 * @returns {Promise<string>}
 */
export async function loadFolderInstructions(folderPath) {
  if (!folderPath) return '';
  try {
    const instructionsPath = join(folderPath, '.openwork', 'instructions.md');
    if (!existsSync(instructionsPath)) return '';
    return await readFile(instructionsPath, 'utf-8');
  } catch {
    return '';
  }
}
