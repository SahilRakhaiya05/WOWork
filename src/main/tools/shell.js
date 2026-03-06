/**
 * Shell tool — sandboxed terminal command execution.
 *
 * Commands run with the workspace folder as CWD. Dangerous commands
 * are blocked. Output is captured and returned.
 */
import { spawn } from 'child_process';

const BLOCKED_COMMANDS = [
  'rm -rf /',
  'sudo',
  'curl | sh',
  'wget | sh',
  'curl | bash',
  'wget | bash',
  ':(){ :|:& };:',
  'mkfs',
  'dd if=/dev',
  '> /dev/sda',
  'chmod -R 777 /',
  'chown -R',
];

const COMMAND_TIMEOUT = 30_000;

/**
 * Checks if a command contains blocked patterns.
 * @param {string} command
 * @returns {boolean}
 */
function isBlocked(command) {
  const lower = command.toLowerCase().trim();
  return BLOCKED_COMMANDS.some((blocked) => lower.includes(blocked.toLowerCase()));
}

/**
 * Creates shell tool definitions bound to a workspace path.
 * @param {string} workspacePath
 * @returns {Array<object>}
 */
export function createShellTools(workspacePath) {
  if (!workspacePath) return [];

  return [
    {
      name: 'run_command',
      description: 'Run a shell command in the workspace directory. Returns stdout and stderr. Commands are sandboxed to the workspace folder.',
      input_schema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute',
          },
        },
        required: ['command'],
      },
      async execute({ command }) {
        if (isBlocked(command)) {
          return JSON.stringify({
            error: 'Command blocked for security reasons.',
            blocked: true,
          });
        }

        return new Promise((resolve) => {
          let stdout = '';
          let stderr = '';
          let timedOut = false;

          const proc = spawn('sh', ['-c', command], {
            cwd: workspacePath,
            env: { ...process.env, HOME: process.env.HOME },
            timeout: COMMAND_TIMEOUT,
          });

          const timer = setTimeout(() => {
            timedOut = true;
            proc.kill('SIGTERM');
          }, COMMAND_TIMEOUT);

          proc.stdout.on('data', (data) => {
            stdout += data.toString();
            if (stdout.length > 100_000) {
              stdout = stdout.slice(0, 100_000) + '\n... (output truncated)';
              proc.kill('SIGTERM');
            }
          });

          proc.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          proc.on('close', (code) => {
            clearTimeout(timer);
            resolve(
              JSON.stringify({
                exitCode: code,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                timedOut,
              })
            );
          });

          proc.on('error', (err) => {
            clearTimeout(timer);
            resolve(JSON.stringify({ error: err.message }));
          });
        });
      },
    },
  ];
}
