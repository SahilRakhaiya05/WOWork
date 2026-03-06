/**
 * History search — SQLite FTS5 full-text search on conversation messages.
 *
 * Searches past Claude sessions, tasks, and outputs using the messages_fts
 * virtual table for high-performance full-text search.
 */
import { getDb } from '../db.js';

/**
 * Searches conversation history using FTS5.
 * @param {string} query - Search query
 * @returns {Array<object>} Matching conversation snippets
 */
export function searchHistory(query) {
  if (!query) return [];

  const db = getDb();
  if (!db) return [];

  try {
    const sanitized = sanitizeFtsQuery(query);
    if (!sanitized) return [];

    const results = db.prepare(`
      SELECT
        m.id,
        m.conversation_id,
        m.role,
        m.content,
        m.timestamp,
        c.title AS conversation_title,
        c.workspace,
        snippet(messages_fts, 0, '<mark>', '</mark>', '...', 40) AS snippet
      FROM messages_fts
      JOIN messages m ON m.rowid = messages_fts.rowid
      LEFT JOIN conversations c ON c.id = m.conversation_id
      WHERE messages_fts MATCH ?
      ORDER BY rank
      LIMIT 20
    `).all(sanitized);

    return results.map((row) => ({
      source: 'history',
      type: 'conversation',
      id: row.id,
      conversationId: row.conversation_id,
      conversationTitle: row.conversation_title || 'Untitled',
      role: row.role,
      snippet: row.snippet || row.content?.slice(0, 200) || '',
      timestamp: row.timestamp,
      workspace: row.workspace,
    }));
  } catch (err) {
    console.error('History search error:', err.message);
    return [];
  }
}

/**
 * Sanitizes a query string for FTS5 MATCH syntax.
 * Wraps each word in quotes to prevent syntax errors from special chars.
 * @param {string} query
 * @returns {string}
 */
function sanitizeFtsQuery(query) {
  const words = query
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) return '';

  return words.map((w) => `"${w}"`).join(' ');
}
