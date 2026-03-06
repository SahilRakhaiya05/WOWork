/**
 * Composio Tool Router — manages external app integrations.
 *
 * Provides access to 500+ external tools (Gmail, Slack, GitHub, Google Drive,
 * Notion, Linear, etc.) via the Composio API.
 */

export class ComposioManager {
  #apiKey = null;
  #connectedApps = new Map();
  #initialized = false;

  constructor() {
    this.#apiKey = process.env.COMPOSIO_API_KEY || null;
    if (this.#apiKey) {
      this.#init();
    }
  }

  async #init() {
    if (!this.#apiKey) return;
    try {
      // Composio SDK initialization would happen here.
      // In production, this would use: new Composio({ apiKey: this.#apiKey })
      this.#initialized = true;
      console.log('Composio Tool Router initialized.');
    } catch (err) {
      console.error('Failed to initialize Composio:', err.message);
    }
  }

  /**
   * Whether Composio is configured and initialized.
   * @returns {boolean}
   */
  get isAvailable() {
    return this.#initialized;
  }

  /**
   * Returns the list of connected app integrations.
   * @returns {Array<object>}
   */
  getConnectedApps() {
    return Array.from(this.#connectedApps.values());
  }

  /**
   * Connects a new app via Composio OAuth flow.
   * @param {string} appName
   * @returns {Promise<object>}
   */
  async connectApp(appName) {
    if (!this.#initialized) {
      throw new Error('Composio not configured. Add your COMPOSIO_API_KEY in Settings.');
    }

    try {
      // In production: initiate OAuth flow via Composio SDK
      this.#connectedApps.set(appName, {
        name: appName,
        status: 'connected',
        connectedAt: new Date().toISOString(),
      });
      return { success: true, app: appName };
    } catch (err) {
      throw new Error(`Failed to connect ${appName}: ${err.message}`);
    }
  }

  /**
   * Disconnects an app integration.
   * @param {string} appName
   */
  async disconnectApp(appName) {
    this.#connectedApps.delete(appName);
  }

  /**
   * Searches connected apps for the given query.
   * Returns results from all connected apps that support search.
   * @param {string} query
   * @returns {Promise<Array<object>>}
   */
  async search(query) {
    if (!this.#initialized) return [];

    const results = [];

    for (const [appName, app] of this.#connectedApps) {
      if (app.status !== 'connected') continue;

      try {
        // In production, this would call Composio search actions for each app.
        // e.g., composio.executeAction('GMAIL_SEARCH', { query })
        // For now, return empty results — actual implementation requires
        // live Composio API calls.
      } catch (err) {
        console.error(`Search failed for ${appName}:`, err.message);
      }
    }

    return results;
  }

  /**
   * Returns Composio tools formatted for the Claude SDK.
   * @returns {Array<object>}
   */
  getTools() {
    if (!this.#initialized) return [];
    // In production, this returns tool definitions from Composio SDK
    return [];
  }
}
