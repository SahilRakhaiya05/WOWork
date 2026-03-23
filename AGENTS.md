## Cursor Cloud specific instructions

### Product Overview

OpenCowork is a Claude-powered Electron desktop app with workspace access, universal search (Cmd+K), and 500+ app integrations via Composio.

### Services

- **Vite Dev Server** (port 5173): Serves the React renderer UI
- **Electron Main Process**: BrowserWindow, IPC handlers, agent core, SQLite DB
- Both started together via `npm run dev`

### Development Commands

See `package.json` scripts and `README.md` for standard commands:
- `npm run dev` — starts Vite + Electron concurrently
- `npm run build` — production build (Vite + electron-builder)
- `npm run lint` — ESLint (see known issues below)

### Known Issues

- **ESLint config missing**: repo uses ESLint 9 but has no `eslint.config.js` flat config. `npm run lint` fails.
- **No automated tests** defined in `package.json`.

### Native Module Rebuild

`better-sqlite3` must be rebuilt for Electron after `npm install`:

```
npx @electron/rebuild -f -w better-sqlite3
```

System Node.js (v22) compiles native modules with a different `NODE_MODULE_VERSION` than Electron's internal Node.js. Without this rebuild, Electron crashes with `ERR_DLOPEN_FAILED`.

### Headless Cloud VM Caveats

- **Display**: Electron requires a display. Use `DISPLAY=:1` (the VM desktop).
- **GPU**: The GPU process exits during initialization in headless VMs. The Electron window frame renders, but React content may appear black due to software rendering limitations. This is expected.
- **D-Bus errors** (`Failed to connect to the bus`) are harmless on headless Linux.
- **ANTHROPIC_API_KEY**: Required for the AI agent. Create `.env` from `.env.example` and add the key. Without it, the app shows an onboarding screen.
- **CRITICAL**: Never kill `node` processes broadly (e.g., `ps | grep node | xargs kill`). This kills the Cloud Agent infrastructure. Always kill by specific PID only.
- **React requires Electron**: The React app uses `window.api` (Electron contextBridge) and `process.platform`. It cannot run standalone in a browser.
