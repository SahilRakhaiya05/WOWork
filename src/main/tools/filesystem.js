/**
 * Filesystem tools — secure file read/write/create/delete/list operations.
 *
 * All paths are validated against the workspace root to prevent path traversal.
 * Destructive operations (delete, overwrite) are flagged for user confirmation.
 */
import { readFile, writeFile, readdir, stat, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve, relative, extname } from 'path';

/**
 * Validates that a resolved path is within the workspace boundary.
 * @param {string} filePath
 * @param {string} workspacePath
 * @returns {string} The resolved, safe path
 * @throws {Error} If path traversal is detected
 */
function safePath(filePath, workspacePath) {
  const resolved = resolve(workspacePath, filePath);
  const rel = relative(workspacePath, resolved);
  if (rel.startsWith('..') || resolve(resolved) !== resolved.replace(/[/\\]$/, '')) {
    if (rel.startsWith('..')) {
      throw new Error(`Path traversal rejected: ${filePath}`);
    }
  }
  if (!resolved.startsWith(workspacePath)) {
    throw new Error(`Path outside workspace: ${filePath}`);
  }
  return resolved;
}

/**
 * Creates filesystem tool definitions bound to a workspace path.
 * @param {string} workspacePath
 * @returns {Array<object>}
 */
export function createFilesystemTools(workspacePath) {
  if (!workspacePath) return [];

  return [
    {
      name: 'read_file',
      description: 'Read the contents of a file in the workspace. Returns the file content as text.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to the file within the workspace',
          },
        },
        required: ['path'],
      },
      async execute({ path }) {
        const fullPath = safePath(path, workspacePath);
        const content = await readFile(fullPath, 'utf-8');
        return content;
      },
    },
    {
      name: 'write_file',
      description: 'Create a new file or write to an existing file in the workspace.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path for the file within the workspace',
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
          },
        },
        required: ['path', 'content'],
      },
      async execute({ path, content }) {
        const fullPath = safePath(path, workspacePath);
        const dir = resolve(fullPath, '..');
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }
        await writeFile(fullPath, content, 'utf-8');
        return JSON.stringify({ success: true, path: fullPath });
      },
    },
    {
      name: 'overwrite_file',
      description: 'Overwrite an existing file. This is a destructive action that requires user confirmation.',
      requiresConfirmation: true,
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to the file to overwrite',
          },
          content: {
            type: 'string',
            description: 'New content for the file',
          },
        },
        required: ['path', 'content'],
      },
      async execute({ path, content }) {
        const fullPath = safePath(path, workspacePath);
        if (!existsSync(fullPath)) {
          throw new Error(`File does not exist: ${path}`);
        }
        await writeFile(fullPath, content, 'utf-8');
        return JSON.stringify({ success: true, path: fullPath, overwritten: true });
      },
    },
    {
      name: 'delete_file',
      description: 'Delete a file from the workspace. This is a destructive action that requires user confirmation.',
      requiresConfirmation: true,
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to the file to delete',
          },
        },
        required: ['path'],
      },
      async execute({ path }) {
        const fullPath = safePath(path, workspacePath);
        if (!existsSync(fullPath)) {
          throw new Error(`File does not exist: ${path}`);
        }
        await unlink(fullPath);
        return JSON.stringify({ success: true, deleted: path });
      },
    },
    {
      name: 'list_directory',
      description: 'List files and directories in a workspace directory. Returns names, types, and sizes.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path to the directory (use "." for workspace root)',
          },
        },
        required: ['path'],
      },
      async execute({ path: dirPath }) {
        const fullPath = safePath(dirPath, workspacePath);
        const entries = await readdir(fullPath, { withFileTypes: true });
        const results = await Promise.all(
          entries.map(async (entry) => {
            const entryPath = join(fullPath, entry.name);
            const info = { name: entry.name, type: entry.isDirectory() ? 'directory' : 'file' };
            if (entry.isFile()) {
              try {
                const st = await stat(entryPath);
                info.size = st.size;
                info.extension = extname(entry.name);
              } catch { /* ignore stat errors */ }
            }
            return info;
          })
        );
        return JSON.stringify(results, null, 2);
      },
    },
    {
      name: 'search_files',
      description: 'Search for files by name pattern in the workspace. Returns matching file paths.',
      input_schema: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'File name pattern to search for (supports * wildcards)',
          },
        },
        required: ['pattern'],
      },
      async execute({ pattern }) {
        const results = [];
        async function walk(dir) {
          const entries = await readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name.startsWith('.')) continue;
            const entryPath = join(dir, entry.name);
            if (entry.isDirectory()) {
              if (entry.name === 'node_modules' || entry.name === '.git') continue;
              await walk(entryPath);
            } else {
              const matches = pattern.includes('*')
                ? new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i').test(entry.name)
                : entry.name.toLowerCase().includes(pattern.toLowerCase());
              if (matches) {
                results.push(relative(workspacePath, entryPath));
              }
            }
            if (results.length >= 100) return;
          }
        }
        await walk(workspacePath);
        return JSON.stringify(results);
      },
    },
  ];
}
