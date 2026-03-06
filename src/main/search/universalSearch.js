/**
 * Universal Search orchestrator — the killer "find anything" feature.
 *
 * Simultaneously fires queries to 4 search workers (local files, conversation
 * history, connected apps, optional web). Results stream back as they arrive,
 * then get AI-reranked by a small Claude call.
 *
 * Workers are fully independent — one failing does not block others.
 */
import { searchLocal, searchFileNames } from './localSearch.js';
import { searchHistory } from './historySearch.js';
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';

const RERANK_TIMEOUT = 3_000;
const RERANK_MAX_TOKENS = 300;

export class UniversalSearch {
  #workspacePath = null;
  #composioManager = null;
  #anthropic = null;

  /**
   * @param {object} options
   * @param {string} options.workspacePath
   * @param {object} options.composioManager
   */
  constructor({ workspacePath, composioManager }) {
    this.#workspacePath = workspacePath;
    this.#composioManager = composioManager;

    if (process.env.ANTHROPIC_API_KEY) {
      this.#anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  /**
   * Updates the active workspace path.
   * @param {string} path
   */
  setWorkspace(path) {
    this.#workspacePath = path;
  }

  /**
   * Executes a universal search across all sources.
   * Results are streamed back via the callback as they arrive from each worker.
   * After all workers finish (or after 800ms), results are AI-reranked.
   *
   * @param {string} query - Search query, optionally prefixed with @scope
   * @param {object} options - Search options (filters, etc.)
   * @param {Function} onResults - Callback receiving partial results
   */
  async search(query, options = {}, onResults) {
    if (!query || query.length < 2) {
      onResults({ source: 'all', results: [], done: true });
      return;
    }

    const { scope, cleanQuery } = parseScope(query);

    const allResults = [];
    const workers = [];

    if (!scope || scope === 'files') {
      workers.push(this.#searchFiles(cleanQuery, allResults, onResults));
    }

    if (!scope || scope === 'history') {
      workers.push(this.#searchHistory(cleanQuery, allResults, onResults));
    }

    if ((!scope || scope === 'apps') && this.#composioManager?.isAvailable) {
      workers.push(this.#searchApps(cleanQuery, allResults, onResults));
    }

    if (scope === 'web' || (!scope && cleanQuery.length > 5 && options.webSearch !== false)) {
      workers.push(this.#searchWeb(cleanQuery, allResults, onResults));
    }

    const raceTimeout = new Promise((resolve) => setTimeout(resolve, 800));
    await Promise.race([Promise.allSettled(workers), raceTimeout]);

    const deduped = deduplicateResults(allResults);

    if (deduped.length > 0 && this.#anthropic) {
      try {
        const reranked = await this.#rerankResults(cleanQuery, deduped);
        onResults({ source: 'reranked', results: reranked, done: true });
      } catch {
        onResults({ source: 'all', results: deduped.slice(0, 10), done: true });
      }
    } else {
      onResults({ source: 'all', results: deduped.slice(0, 10), done: true });
    }
  }

  async #searchFiles(query, allResults, onResults) {
    try {
      if (!this.#workspacePath) return;

      const [contentResults, nameResults] = await Promise.all([
        searchLocal(query, this.#workspacePath),
        searchFileNames(query, this.#workspacePath),
      ]);

      const combined = [...nameResults.slice(0, 10), ...contentResults.slice(0, 40)];
      allResults.push(...combined);
      onResults({ source: 'files', results: combined, done: false });
    } catch (err) {
      console.error('File search worker failed:', err.message);
      onResults({ source: 'files', results: [], error: err.message, done: false });
    }
  }

  async #searchHistory(query, allResults, onResults) {
    try {
      const results = searchHistory(query);
      allResults.push(...results);
      onResults({ source: 'history', results, done: false });
    } catch (err) {
      console.error('History search worker failed:', err.message);
      onResults({ source: 'history', results: [], error: err.message, done: false });
    }
  }

  async #searchApps(query, allResults, onResults) {
    try {
      if (!this.#composioManager) return;
      const results = await this.#composioManager.search(query);
      allResults.push(...results);
      onResults({ source: 'apps', results, done: false });
    } catch (err) {
      console.error('App search worker failed:', err.message);
      onResults({ source: 'apps', results: [], error: err.message, done: false });
    }
  }

  async #searchWeb(query, allResults, onResults) {
    try {
      const encoded = encodeURIComponent(query);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://html.duckduckgo.com/html/?q=${encoded}`,
        {
          signal: controller.signal,
          headers: { 'User-Agent': 'OpenCowork/0.1' },
        }
      );
      clearTimeout(timeout);

      const html = await response.text();
      const results = [];
      const regex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
      const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>(.*?)<\/a>/gi;
      let match;

      while ((match = regex.exec(html)) && results.length < 5) {
        const snippetMatch = snippetRegex.exec(html);
        results.push({
          source: 'web',
          type: 'web-result',
          url: match[1],
          title: match[2].replace(/<[^>]*>/g, ''),
          snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '') : '',
        });
      }

      allResults.push(...results);
      onResults({ source: 'web', results, done: false });
    } catch (err) {
      console.error('Web search worker failed:', err.message);
      onResults({ source: 'web', results: [], error: err.message, done: false });
    }
  }

  /**
   * AI-powered re-ranking and summarization of search results.
   * Uses a tiny Claude call with a 300-token budget.
   * @param {string} query
   * @param {Array<object>} results
   * @returns {Promise<Array<object>>}
   */
  async #rerankResults(query, results) {
    if (!this.#anthropic || results.length === 0) return results;

    const top = results.slice(0, 15);
    const summaryInput = top.map((r, i) => ({
      index: i,
      source: r.source,
      title: r.name || r.title || r.conversationTitle || r.path || '',
      snippet: (r.snippet || '').slice(0, 100),
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RERANK_TIMEOUT);

    try {
      const response = await this.#anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: RERANK_MAX_TOKENS,
        system: 'You re-rank search results by relevance. Return ONLY a JSON array of objects with "index" (original index) and "summary" (one-sentence summary). Most relevant first. Top 10 only.',
        messages: [
          {
            role: 'user',
            content: `Query: "${query}"\n\nResults:\n${JSON.stringify(summaryInput)}`,
          },
        ],
      });

      clearTimeout(timeout);

      const text = response.content[0]?.text || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return top.slice(0, 10);

      const ranked = JSON.parse(jsonMatch[0]);
      return ranked
        .filter((r) => typeof r.index === 'number' && r.index < top.length)
        .map((r) => ({
          ...top[r.index],
          aiSummary: r.summary || '',
        }))
        .slice(0, 10);
    } catch {
      clearTimeout(timeout);
      return top.slice(0, 10);
    }
  }
}

/**
 * Parses scope prefix from query (e.g., "@slack query" -> { scope: 'slack', cleanQuery: 'query' }).
 * @param {string} query
 * @returns {{ scope: string | null, cleanQuery: string }}
 */
function parseScope(query) {
  const scopeMatch = query.match(/^@(\w+)\s+(.+)$/);
  if (scopeMatch) {
    const scopeMap = {
      files: 'files',
      file: 'files',
      history: 'history',
      chat: 'history',
      apps: 'apps',
      slack: 'apps',
      gmail: 'apps',
      github: 'apps',
      drive: 'apps',
      notion: 'apps',
      linear: 'apps',
      web: 'web',
    };
    return {
      scope: scopeMap[scopeMatch[1].toLowerCase()] || null,
      cleanQuery: scopeMatch[2].trim(),
    };
  }
  return { scope: null, cleanQuery: query };
}

/**
 * Deduplicates results across all sources by content hash.
 * @param {Array<object>} results
 * @returns {Array<object>}
 */
function deduplicateResults(results) {
  const seen = new Set();
  return results.filter((r) => {
    const hashInput = `${r.source}:${r.path || r.url || r.id || ''}:${(r.snippet || '').slice(0, 50)}`;
    const hash = createHash('md5').update(hashInput).digest('hex');
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });
}
