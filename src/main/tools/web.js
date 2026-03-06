/**
 * Web fetch tool — retrieves content from URLs.
 *
 * Used by the agent to fetch web pages, APIs, and documentation.
 * Includes timeout and size limits for safety.
 */

const FETCH_TIMEOUT = 10_000;
const MAX_BODY_SIZE = 500_000;

/**
 * Creates web tool definitions.
 * @returns {Array<object>}
 */
export function createWebTools() {
  return [
    {
      name: 'web_fetch',
      description: 'Fetch the content of a URL. Returns the response body as text. Useful for reading documentation, APIs, or web pages.',
      input_schema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to fetch',
          },
          method: {
            type: 'string',
            description: 'HTTP method (GET, POST, etc.)',
            default: 'GET',
          },
        },
        required: ['url'],
      },
      async execute({ url, method = 'GET' }) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

          const response = await fetch(url, {
            method,
            signal: controller.signal,
            headers: {
              'User-Agent': 'OpenCowork/0.1',
            },
          });

          clearTimeout(timeout);

          if (!response.ok) {
            return JSON.stringify({
              error: `HTTP ${response.status}: ${response.statusText}`,
              url,
            });
          }

          let body = await response.text();
          if (body.length > MAX_BODY_SIZE) {
            body = body.slice(0, MAX_BODY_SIZE) + '\n... (content truncated)';
          }

          return JSON.stringify({
            status: response.status,
            contentType: response.headers.get('content-type'),
            body,
            url,
          });
        } catch (err) {
          return JSON.stringify({
            error: err.name === 'AbortError' ? 'Request timed out' : err.message,
            url,
          });
        }
      },
    },
    {
      name: 'web_search',
      description: 'Search the web for information. Returns search result snippets and URLs.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
        },
        required: ['query'],
      },
      async execute({ query }) {
        try {
          const encoded = encodeURIComponent(query);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

          const response = await fetch(
            `https://html.duckduckgo.com/html/?q=${encoded}`,
            {
              signal: controller.signal,
              headers: {
                'User-Agent': 'OpenCowork/0.1',
              },
            }
          );

          clearTimeout(timeout);

          const html = await response.text();

          const results = [];
          const regex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
          const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>(.*?)<\/a>/gi;
          let match;
          while ((match = regex.exec(html)) && results.length < 10) {
            const snippetMatch = snippetRegex.exec(html);
            results.push({
              url: match[1],
              title: match[2].replace(/<[^>]*>/g, ''),
              snippet: snippetMatch
                ? snippetMatch[1].replace(/<[^>]*>/g, '')
                : '',
            });
          }

          return JSON.stringify({ query, results });
        } catch (err) {
          return JSON.stringify({
            error: err.name === 'AbortError' ? 'Search timed out' : err.message,
            query,
          });
        }
      },
    },
  ];
}
