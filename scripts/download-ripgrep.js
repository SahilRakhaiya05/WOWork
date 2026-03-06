/**
 * Downloads the ripgrep binary for the current platform.
 * This runs as a postinstall script and ensures ripgrep is available
 * for the universal search feature.
 */
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const binDir = join(__dirname, '..', 'bin');

async function main() {
  try {
    const rgModule = await import('@vscode/ripgrep');
    const rgPath = rgModule.rgPath;
    console.log(`ripgrep binary available at: ${rgPath}`);

    if (!existsSync(binDir)) {
      mkdirSync(binDir, { recursive: true });
    }

    console.log('ripgrep is ready for universal search.');
  } catch (err) {
    console.warn('Warning: Could not set up ripgrep. Local file search will be unavailable.');
    console.warn(err.message);
  }
}

main();
