/**
 * Agent Core — Claude Agent SDK loop with streaming.
 *
 * Manages the agentic loop: builds system prompts, calls Claude with tools,
 * streams responses to the UI, handles confirmation dialogs for destructive actions.
 */
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { getDb, insertMessage, createTask, updateTaskStatus } from './db.js';
import { createFilesystemTools } from './tools/filesystem.js';
import { createShellTools } from './tools/shell.js';
import { createWebTools } from './tools/web.js';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

const BASE_SYSTEM_PROMPT = `You are OpenCowork, an AI assistant with full access to the user's workspace folder. You can read, write, create, and delete files, run shell commands, and fetch web content.

Rules:
- Always explain what you're about to do before taking action.
- For destructive actions (deleting files, overwriting important files), ask for confirmation.
- Be thorough but concise in your responses.
- When creating files, use appropriate formats and best practices.
- Report errors clearly and suggest fixes.
- Maintain context across the conversation.`;

export class AgentCore {
  /** @type {Anthropic | null} */
  #client = null;
  #globalInstructions = '';
  #folderInstructions = '';
  #workspacePath = '';
  #skills = [];
  #activeConversations = new Map();
  #confirmationResolvers = new Map();
  #cancelledTasks = new Set();

  /**
   * @param {object} options
   * @param {string} options.globalInstructions
   * @param {Array} options.skills
   */
  constructor({ globalInstructions = '', skills = [] }) {
    this.#globalInstructions = globalInstructions;
    this.#skills = skills;
    this.#initClient();
  }

  #initClient() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('ANTHROPIC_API_KEY not set. Agent will not function until key is provided.');
      return;
    }
    this.#client = new Anthropic({ apiKey });
  }

  /**
   * Sets the active workspace and folder-specific instructions.
   * @param {string} path
   * @param {string} folderInstructions
   */
  setWorkspace(path, folderInstructions = '') {
    this.#workspacePath = path;
    this.#folderInstructions = folderInstructions;
  }

  /**
   * Updates global instructions.
   * @param {string} instructions
   */
  setGlobalInstructions(instructions) {
    this.#globalInstructions = instructions;
  }

  #buildSystemPrompt(userMessage) {
    let prompt = BASE_SYSTEM_PROMPT;

    if (this.#globalInstructions) {
      prompt += `\n\n## User's Global Instructions\n${this.#globalInstructions}`;
    }

    if (this.#folderInstructions) {
      prompt += `\n\n## Workspace-Specific Instructions\n${this.#folderInstructions}`;
    }

    const activeSkills = this.#skills.filter((skill) => {
      if (!skill.triggerKeywords?.length) return false;
      const lower = userMessage.toLowerCase();
      return skill.triggerKeywords.some((kw) => lower.includes(kw.toLowerCase()));
    });

    for (const skill of activeSkills) {
      if (skill.systemPromptFragment) {
        prompt += `\n\n## Skill: ${skill.name}\n${skill.systemPromptFragment}`;
      }
    }

    prompt += `\n\n## Current Workspace\nPath: ${this.#workspacePath || '(none selected)'}`;

    return prompt;
  }

  #getTools() {
    const tools = [
      ...createFilesystemTools(this.#workspacePath),
      ...createShellTools(this.#workspacePath),
      ...createWebTools(),
    ];
    return tools;
  }

  /**
   * Processes a tool call, handling confirmation for destructive actions.
   * @param {object} toolUse
   * @param {Function} emitEvent
   * @returns {Promise<string>}
   */
  async #processToolCall(toolUse, emitEvent) {
    const { name, input, id } = toolUse;

    const destructiveTools = ['delete_file', 'overwrite_file'];
    if (destructiveTools.includes(name)) {
      const actionId = uuidv4();
      emitEvent({
        type: 'confirm-request',
        actionId,
        toolName: name,
        toolInput: input,
      });

      const approved = await new Promise((resolve) => {
        this.#confirmationResolvers.set(actionId, resolve);
      });
      this.#confirmationResolvers.delete(actionId);

      if (!approved) {
        return JSON.stringify({ error: 'Action cancelled by user.' });
      }
    }

    emitEvent({ type: 'tool-start', toolName: name, toolInput: input });

    try {
      const tools = this.#getTools();
      const tool = tools.find((t) => t.name === name);
      if (!tool || !tool.execute) {
        return JSON.stringify({ error: `Unknown tool: ${name}` });
      }
      const result = await tool.execute(input);
      emitEvent({ type: 'tool-end', toolName: name, result });
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (err) {
      const errorResult = JSON.stringify({ error: err.message });
      emitEvent({ type: 'tool-error', toolName: name, error: err.message });
      return errorResult;
    }
  }

  /**
   * Sends a message and runs the agentic loop.
   * @param {string} conversationId
   * @param {string} message
   * @param {Function} emitEvent
   * @returns {Promise<object>}
   */
  async sendMessage(conversationId, message, emitEvent) {
    if (!this.#client) {
      this.#initClient();
      if (!this.#client) {
        return { error: 'No API key configured. Please add your Anthropic API key in Settings.' };
      }
    }

    const db = getDb();
    const userMsgId = uuidv4();
    insertMessage({
      id: userMsgId,
      conversationId,
      role: 'user',
      content: message,
    });

    const taskId = uuidv4();
    createTask({
      id: taskId,
      conversationId,
      status: 'running',
      title: message.slice(0, 100),
    });

    emitEvent({ type: 'task-start', taskId, conversationId });

    const history = db
      ? db.prepare(
          'SELECT role, content, tool_name, tool_input, tool_output FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC'
        ).all(conversationId)
      : [];

    const messages = history.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.tool_name,
              content: msg.tool_output || '',
            },
          ],
        };
      }
      return { role: msg.role === 'system' ? 'user' : msg.role, content: msg.content };
    });

    const systemPrompt = this.#buildSystemPrompt(message);
    const tools = this.#getTools().map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));

    try {
      let continueLoop = true;

      while (continueLoop) {
        if (this.#cancelledTasks.has(conversationId)) {
          this.#cancelledTasks.delete(conversationId);
          updateTaskStatus(taskId, 'cancelled');
          emitEvent({ type: 'task-cancelled', taskId });
          return { cancelled: true };
        }

        emitEvent({ type: 'thinking' });

        const response = await this.#client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages,
          tools: tools.length > 0 ? tools : undefined,
        });

        let assistantContent = '';
        const toolUseBlocks = [];

        for (const block of response.content) {
          if (block.type === 'text') {
            assistantContent += block.text;
            emitEvent({ type: 'text', content: block.text });
          } else if (block.type === 'tool_use') {
            toolUseBlocks.push(block);
          }
        }

        if (assistantContent) {
          const assistantMsgId = uuidv4();
          insertMessage({
            id: assistantMsgId,
            conversationId,
            role: 'assistant',
            content: assistantContent,
          });
        }

        messages.push({ role: 'assistant', content: response.content });

        if (toolUseBlocks.length > 0) {
          const toolResults = [];
          for (const toolBlock of toolUseBlocks) {
            const result = await this.#processToolCall(toolBlock, emitEvent);

            const toolMsgId = uuidv4();
            insertMessage({
              id: toolMsgId,
              conversationId,
              role: 'tool',
              content: result,
              toolName: toolBlock.id,
              toolInput: toolBlock.input,
              toolOutput: result,
            });

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: result,
            });
          }

          messages.push({ role: 'user', content: toolResults });
          continueLoop = true;
        } else {
          continueLoop = false;
        }

        if (response.stop_reason === 'end_turn') {
          continueLoop = false;
        }
      }

      updateTaskStatus(taskId, 'done');
      emitEvent({ type: 'task-done', taskId });
      return { success: true, taskId };
    } catch (err) {
      updateTaskStatus(taskId, 'failed');
      emitEvent({ type: 'task-error', taskId, error: err.message });
      return { error: err.message };
    }
  }

  /**
   * Cancels a running task.
   * @param {string} conversationId
   */
  cancelTask(conversationId) {
    this.#cancelledTasks.add(conversationId);
  }

  /**
   * Resolves a pending confirmation dialog.
   * @param {string} actionId
   * @param {boolean} approved
   */
  resolveConfirmation(actionId, approved) {
    const resolver = this.#confirmationResolvers.get(actionId);
    if (resolver) {
      resolver(approved);
    }
  }
}
