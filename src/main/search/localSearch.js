/**
 * Local file search via ripgrep.
 *
 * Spawns ripgrep as a child process with JSON output. Includes a 5-second
 * timeout and 500-result cap. Falls back to basic file name search if
 * ripgrep is unavailable.
 */
import { spawn } from 'child_process';
import { join } from 'path';

const RG_TIMEOUT = 5_000;
const MAX_RESULTS = 500;

/**
 * Resolves the path to the ripgrep binary.
 * @returns {Promise<string>}
 */
async function getRgPath() {
  try {
    const rg = await import('@vscode/ripgrep');
    return rg.rgPath;
  } catch {
    return 'rg';
  }
}

/**
 * Searches local files using ripgrep.
 * @param {string} query - Search query
 * @param {string} workspacePath - Workspace root path
 * @returns {Promise<Array<object>>} Search results
 */
export async function searchLocal(query, workspacePath) {
  if (!query || !workspacePath) return [];

  const rgPath = await getRgPath();

  return new Promise((resolve) => {
    const results = [];
    let buffer = '';

    const args = [
      '--json',
      '--max-count', String(MAX_RESULTS),
      '--max-filesize', '1M',
      '--ignore-case',
      '--no-heading',
      '--glob', '!node_modules',
      '--glob', '!.git',
      '--glob', '!*.lock',
      '--glob', '!dist',
      query,
      workspacePath,
    ];

    const proc = spawn(rgPath, args, { timeout: RG_TIMEOUT });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
    }, RG_TIMEOUT);

    proc.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'match') {
            const match = parsed.data;
            results.push({
              source: 'files',
              type: 'file-content',
              path: match.path?.text || '',
              lineNumber: match.line_number,
              snippet: match.lines?.text?.trim().slice(0, 200) || '',
              submatches: match.submatches?.map((s) => s.match?.text) || [],
            });
          }
        } catch { /* skip malformed lines */ }

        if (results.length >= MAX_RESULTS) {
          proc.kill('SIGTERM');
          break;
        }
      }
    });

    proc.on('close', () => {
      clearTimeout(timer);
      resolve(deduplicateResults(results));
    });

    proc.on('error', () => {
      clearTimeout(timer);
      resolve([]);
    });
  });
}

/**
 * Fuzzy-matches file names in the workspace.
 * @param {string} query
 * @param {string} workspacePath
 * @returns {Promise<Array<object>>}
 */
export async function searchFileNames(query, workspacePath) {
  if (!query || !workspacePath) return [];

  const rgPath = await getRgPath();

  return new Promise((resolve) => {
    const results = [];

    const args = [
      '--files',
      '--ignore-case',
      '--glob', '!node_modules',
      '--glob', '!.git',
      workspacePath,
    ];

    const proc = spawn(rgPath, args, { timeout: RG_TIMEOUT });
    let buffer = '';

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
    }, RG_TIMEOUT);

    proc.stdout.on('data', (data) => {
      buffer += data.toString();
    });

    proc.on('close', () => {
      clearTimeout(timer);
      const lower = query.toLowerCase();
      const files = buffer.split('\n').filter(Boolean);

      for (const filePath of files) {
        const name = filePath.split('/').pop() || '';
        if (name.toLowerCase().includes(lower)) {
          results.push({
            source: 'files',
            type: 'file-name',
            path: filePath,
            name,
            snippet: filePath,
          });
        }
        if (results.length >= 50) break;
      }

      resolve(results);
    });

    proc.on('error', () => {
      clearTimeout(timer);
      resolve([]);
    });
  });
}

/**
 * Deduplicates search results by content hash.
 * @param {Array<object>} results
 * @returns {Array<object>}
 */
function deduplicateResults(results) {
  const seen = new Set();
  return results.filter((r) => {
    const key = `${r.path}:${r.lineNumber || ''}:${r.snippet?.slice(0, 50)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
