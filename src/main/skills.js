/**
 * Skills loader — loads built-in and community skill definitions.
 *
 * Skills are JSON files in the /skills directory. Each skill defines
 * trigger keywords, system prompt fragments, and tool definitions
 * that are dynamically activated based on user input.
 */
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', '..', 'skills');

/**
 * Loads all skill definitions from the skills directory.
 * @returns {Array<object>}
 */
export function loadSkills() {
  try {
    const files = readdirSync(SKILLS_DIR).filter((f) => f.endsWith('.json'));
    return files.map((file) => {
      try {
        const raw = readFileSync(join(SKILLS_DIR, file), 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error(`Failed to load skill ${file}:`, err.message);
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}
