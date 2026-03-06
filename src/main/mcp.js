/**
 * MCP Server Manager — manages Model Context Protocol server connections.
 *
 * Handles built-in MCP servers (filesystem, shell, web) and custom
 * user-configured MCP server URLs.
 */

export class MCPManager {
  #servers = new Map();

  constructor() {
    this.#servers = new Map();
  }

  /**
   * Registers a new MCP server.
   * @param {string} id
   * @param {object} config
   */
  async addServer(id, config) {
    this.#servers.set(id, {
      id,
      url: config.url,
      name: config.name || id,
      status: 'disconnected',
      tools: [],
    });

    try {
      await this.#connectServer(id);
    } catch (err) {
      console.error(`Failed to connect MCP server ${id}:`, err.message);
    }
  }

  /**
   * Removes an MCP server connection.
   * @param {string} id
   */
  async removeServer(id) {
    const server = this.#servers.get(id);
    if (server) {
      server.status = 'disconnected';
      this.#servers.delete(id);
    }
  }

  /**
   * Returns all registered servers and their status.
   * @returns {Array<object>}
   */
  getServers() {
    return Array.from(this.#servers.values());
  }

  /**
   * Returns tools from all connected MCP servers.
   * @returns {Array<object>}
   */
  getAllTools() {
    const tools = [];
    for (const server of this.#servers.values()) {
      if (server.status === 'connected') {
        tools.push(...server.tools);
      }
    }
    return tools;
  }

  async #connectServer(id) {
    const server = this.#servers.get(id);
    if (!server) return;

    try {
      // MCP server connection would happen here via the MCP protocol.
      // For now, mark as connected — actual MCP client implementation
      // would use the @modelcontextprotocol/sdk.
      server.status = 'connected';
      console.log(`MCP server ${id} connected at ${server.url}`);
    } catch (err) {
      server.status = 'error';
      throw err;
    }
  }
}
