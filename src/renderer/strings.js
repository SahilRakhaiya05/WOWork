/**
 * All user-facing text strings.
 * No hardcoded strings in components — everything references this module.
 */
export const strings = {
  appName: 'OpenCowork',
  tagline: 'Universal AI Desktop Agent',

  // Onboarding
  onboardingTitle: 'Welcome to OpenCowork',
  onboardingSubtitle: 'Add your API keys to get started',
  anthropicKeyLabel: 'Anthropic API Key',
  anthropicKeyPlaceholder: 'sk-ant-...',
  composioKeyLabel: 'Composio API Key (optional)',
  composioKeyPlaceholder: 'Your Composio key...',
  saveAndContinue: 'Save & Continue',
  skipComposio: 'You can add this later in Settings',

  // Sidebar
  workspace: 'Workspace',
  switchWorkspace: 'Switch',
  noWorkspace: 'No folder selected',
  selectFolder: 'Select Folder',
  activeTask: 'Active Task',
  taskQueue: 'Task Queue',
  history: 'History',
  settings: 'Settings',

  // Task statuses
  statusQueued: 'Queued',
  statusRunning: 'Running',
  statusDone: 'Completed',
  statusFailed: 'Failed',
  statusCancelled: 'Cancelled',

  // Task stream
  inputPlaceholder: 'What would you like me to do?',
  sendButton: 'Send',
  cancelTask: 'Cancel',
  thinking: 'Thinking...',
  toolRunning: 'Running',
  newConversation: 'New Conversation',

  // Command palette
  searchPlaceholder: 'Search files, apps, history, web...',
  searchHint: 'Use @files, @history, @apps, @web to filter',
  noResults: 'No results found',
  filesSection: 'Files',
  appsSection: 'Connected Apps',
  historySection: 'History',
  webSection: 'Web',
  enterToOpen: '↵ Open',
  tabToInsert: '⇥ Insert as context',
  escToClose: 'esc Close',

  // Confirm dialog
  confirmTitle: 'Confirm Action',
  confirmDeleteFile: 'Delete this file? This cannot be undone.',
  confirmOverwriteFile: 'Overwrite this file? The current contents will be replaced.',
  approve: 'Approve',
  deny: 'Cancel',

  // Settings
  settingsTitle: 'Settings',
  apiKeysSection: 'API Keys',
  workspacesSection: 'Recent Workspaces',
  connectedAppsSection: 'Connected Apps',
  instructionsSection: 'Global Instructions',
  instructionsHelp: 'These instructions are included in every Claude interaction.',
  skillsSection: 'Skills',
  mcpServersSection: 'MCP Servers',
  save: 'Save',
  saved: 'Saved!',
  connected: 'Connected',
  disconnected: 'Disconnected',
  enable: 'Enable',
  disable: 'Disable',

  // Folder picker
  folderPickerTitle: 'Choose a Workspace',
  folderPickerDescription: 'Select a folder for Claude to work in',
  browseButton: 'Browse...',
  recentFolders: 'Recent Folders',
};
