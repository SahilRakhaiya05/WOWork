# OpenCowork

**Universal AI Desktop Work Agent** — a Claude-powered Electron app that gives you an AI agent with full access to your workspace, 500+ app integrations, and a killer **universal "find anything" search**.

## Features

- **Claude-powered agent** with full workspace access (read/write/create/delete files, run shell commands, fetch web content)
- **Universal search (`Cmd+K`)** — simultaneously search local files (via ripgrep), conversation history (SQLite FTS5), connected apps (Composio), and the web
- **AI re-ranking** — search results are instantly re-ranked and summarized by Claude
- **500+ app integrations** via Composio (Gmail, Slack, GitHub, Google Drive, Notion, Linear, etc.)
- **Parallel task queue** — queue multiple tasks, each with isolated context
- **Global + folder instructions** — customize Claude's behavior per-workspace
- **Built-in skills** — create .docx, .pptx, .xlsx, and PDF files
- **Confirmation dialogs** for destructive actions (file deletion, overwrites)
- **Beautiful dark UI** — Raycast meets Linear meets a terminal
- **Cross-platform** — Mac, Windows, Linux

## Quick Start

### Prerequisites

- Node.js ≥ 18
- npm
- Python ≥ 3.9 (optional, for document creation skills)

### Setup

```bash
# Clone the repository
git clone https://github.com/opencowork/opencowork.git
cd opencowork

# Run the setup script (checks prereqs, installs deps)
./setup.sh

# Or manually:
npm install
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### Development

```bash
npm run dev
```

This starts the Vite dev server and Electron concurrently. The app loads from `http://localhost:5173`.

### Build

```bash
npm run build          # Build for current platform
npm run build:mac      # macOS (dmg + zip)
npm run build:win      # Windows (NSIS + portable)
npm run build:linux    # Linux (AppImage)
```

Output goes to `dist-electron/`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key for Claude |
| `COMPOSIO_API_KEY` | No | Composio API key for external app integrations |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Electron Shell                 │
│  ┌──────────────┐          ┌──────────────────┐ │
│  │   Renderer    │◄──IPC──►│   Main Process    │ │
│  │  React/Vite   │         │                   │ │
│  │  Tailwind CSS │         │  ┌─────────────┐  │ │
│  │  Framer Motion│         │  │  Agent Core  │  │ │
│  │               │         │  │  (Claude SDK)│  │ │
│  │  ┌──────────┐│         │  └──────┬──────┘  │ │
│  │  │ Cmd+K    ││         │         │          │ │
│  │  │ Palette  ││         │  ┌──────┴──────┐  │ │
│  │  └──────────┘│         │  │    Tools     │  │ │
│  └──────────────┘         │  │ FS/Shell/Web │  │ │
│                           │  └──────┬──────┘  │ │
│                           │         │          │ │
│                           │  ┌──────┴──────┐  │ │
│                           │  │   Search     │  │ │
│                           │  │ rg/FTS/API   │  │ │
│                           │  └─────────────┘  │ │
│                           └──────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Project Structure

```
opencowork/
├── main.js                        # Electron main process entry
├── preload.js                     # Context bridge (window.api)
├── package.json
├── vite.config.js
├── electron-builder.yml
├── .env.example
├── setup.sh
├── scripts/
│   └── download-ripgrep.js        # Postinstall ripgrep binary download
├── src/
│   ├── main/                      # Main process modules
│   │   ├── agent.js               # Claude Agent SDK loop
│   │   ├── db.js                  # SQLite database + FTS5
│   │   ├── instructions.js        # Global/folder instructions loader
│   │   ├── mcp.js                 # MCP server manager
│   │   ├── composio.js            # Composio Tool Router
│   │   ├── skills.js              # Skill loader
│   │   ├── tools/
│   │   │   ├── filesystem.js      # Sandboxed file operations
│   │   │   ├── shell.js           # Sandboxed shell execution
│   │   │   └── web.js             # Web fetch + search
│   │   └── search/
│   │       ├── localSearch.js     # ripgrep file search
│   │       ├── historySearch.js   # SQLite FTS5 history search
│   │       └── universalSearch.js # Orchestrator (the killer feature)
│   └── renderer/                  # React UI
│       ├── App.jsx
│       ├── main.jsx
│       ├── styles.css
│       ├── strings.js             # All user-facing text
│       ├── animations.js          # Framer Motion variants
│       └── components/
│           ├── Sidebar.jsx
│           ├── TaskStream.jsx
│           ├── CommandPalette.jsx
│           ├── ConfirmDialog.jsx
│           ├── FolderPicker.jsx
│           ├── SettingsPanel.jsx
│           └── Onboarding.jsx
└── skills/                        # Built-in skill definitions
    ├── docx.json
    ├── pptx.json
    ├── xlsx.json
    └── pdf.json
```

## Universal Search (`Cmd+K`)

The killer feature. Press `Cmd+K` (or `Ctrl+K` on Windows/Linux) to open the command palette, which simultaneously searches:

- **Local files** — full-text content search + file name fuzzy match via bundled ripgrep
- **Conversation history** — past Claude sessions via SQLite FTS5
- **Connected apps** — Gmail, Slack, GitHub, etc. via Composio
- **Web** — auto-triggered when local results are sparse

Results stream in progressively as each search worker returns. After 800ms, a small Claude call re-ranks the top results and adds one-sentence AI summaries.

### Keyboard shortcuts in the palette

| Key | Action |
|---|---|
| `↵ Enter` | Open the selected result |
| `⇥ Tab` | Insert result as context in current task |
| `⌘ Enter` | Open a new Claude task with result as context |
| `Esc` | Close the palette |

### Scope filtering

Prefix your query with `@scope` to constrain search:

- `@files query` — search only local files
- `@history query` — search only conversation history
- `@apps query` — search only connected apps
- `@web query` — search only the web
- `@slack query` / `@gmail query` / `@github query` — app-specific

## License

MIT
