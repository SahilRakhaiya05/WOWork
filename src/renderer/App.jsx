import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import TaskStream from './components/TaskStream';
import CommandPalette from './components/CommandPalette';
import ConfirmDialog from './components/ConfirmDialog';
import FolderPicker from './components/FolderPicker';
import SettingsPanel from './components/SettingsPanel';
import Onboarding from './components/Onboarding';

export default function App() {
  const [view, setView] = useState('loading');
  const [workspace, setWorkspace] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const agentEventCleanup = useRef(null);
  const paletteCleanup = useRef(null);
  const confirmCleanup = useRef(null);

  useEffect(() => {
    async function init() {
      if (!window.api) {
        setView('main');
        return;
      }
      const env = await window.api.getEnvStatus();
      if (!env.hasAnthropicKey) {
        setView('onboarding');
      } else {
        setView('main');
        await loadConversations();
        await loadTasks();
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!window.api) return;

    agentEventCleanup.current = window.api.onAgentEvent((event) => {
      handleAgentEvent(event);
    });

    paletteCleanup.current = window.api.onOpenPalette(() => {
      setPaletteOpen(true);
    });

    confirmCleanup.current = window.api.onConfirmRequest((data) => {
      setConfirmDialog(data);
    });

    return () => {
      agentEventCleanup.current?.();
      paletteCleanup.current?.();
      confirmCleanup.current?.();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadConversations = useCallback(async () => {
    if (!window.api) return;
    const convos = await window.api.getConversations();
    setConversations(convos || []);
  }, []);

  const loadTasks = useCallback(async () => {
    if (!window.api) return;
    const t = await window.api.getTasks();
    setTasks(t || []);
  }, []);

  const loadMessages = useCallback(async (conversationId) => {
    if (!window.api) return;
    const msgs = await window.api.getConversationMessages(conversationId);
    setMessages(msgs || []);
  }, []);

  const handleAgentEvent = useCallback((event) => {
    switch (event.type) {
      case 'thinking':
        setIsThinking(true);
        break;
      case 'text':
        setIsThinking(false);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last._streaming) {
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + event.content },
            ];
          }
          return [...prev, { role: 'assistant', content: event.content, _streaming: true }];
        });
        break;
      case 'tool-start':
        setIsThinking(false);
        setMessages((prev) => [
          ...prev,
          {
            role: 'tool',
            tool_name: event.toolName,
            tool_input: JSON.stringify(event.toolInput, null, 2),
            content: '',
            _status: 'running',
          },
        ]);
        break;
      case 'tool-end':
        setMessages((prev) => {
          const idx = prev.findLastIndex((m) => m.role === 'tool' && m._status === 'running');
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            tool_output: typeof event.result === 'string' ? event.result : JSON.stringify(event.result),
            _status: 'done',
          };
          return updated;
        });
        break;
      case 'tool-error':
        setMessages((prev) => {
          const idx = prev.findLastIndex((m) => m.role === 'tool' && m._status === 'running');
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            tool_output: `Error: ${event.error}`,
            _status: 'error',
          };
          return updated;
        });
        break;
      case 'task-done':
      case 'task-error':
      case 'task-cancelled':
        setIsThinking(false);
        loadTasks();
        break;
      case 'confirm-request':
        setConfirmDialog(event);
        break;
    }
  }, [loadTasks]);

  const handleSelectWorkspace = useCallback(async () => {
    if (!window.api) return;
    const folder = await window.api.selectFolder();
    if (folder) {
      await window.api.setWorkspace(folder);
      setWorkspace(folder);
    }
  }, []);

  const handleSendMessage = useCallback(async (text) => {
    if (!window.api) return;
    let convId = activeConversationId;

    if (!convId) {
      const conv = await window.api.createConversation(text.slice(0, 100));
      if (conv) {
        convId = conv.id;
        setActiveConversationId(conv.id);
        await loadConversations();
      }
    }

    if (!convId) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsThinking(true);

    await window.api.sendMessage(convId, text);
    setIsThinking(false);
  }, [activeConversationId, loadConversations]);

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setIsThinking(false);
  }, []);

  const handleSelectConversation = useCallback(async (id) => {
    setActiveConversationId(id);
    await loadMessages(id);
    setSettingsOpen(false);
  }, [loadMessages]);

  const handleConfirm = useCallback(async (approved) => {
    if (!window.api || !confirmDialog) return;
    await window.api.confirmAction(confirmDialog.actionId, approved);
    setConfirmDialog(null);
  }, [confirmDialog]);

  const handleOnboardingComplete = useCallback(() => {
    setView('main');
  }, []);

  const handlePaletteAction = useCallback((result, action) => {
    setPaletteOpen(false);
    if (action === 'insert') {
      const contextSnippet = result.snippet || result.path || result.title || '';
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: `[Context: ${contextSnippet}]`,
          _contextInsert: true,
        },
      ]);
    } else if (action === 'open') {
      if (result.path && window.api) {
        window.api.revealInFinder(result.path);
      } else if (result.url && window.api) {
        window.api.openExternal(result.url);
      } else if (result.conversationId) {
        handleSelectConversation(result.conversationId);
      }
    } else if (action === 'new-task') {
      handleNewConversation();
      const contextSnippet = result.snippet || result.path || result.title || '';
      handleSendMessage(`Regarding: ${contextSnippet}`);
    }
  }, [handleSelectConversation, handleNewConversation, handleSendMessage]);

  if (view === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-text-muted text-sm">Loading...</div>
      </div>
    );
  }

  if (view === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-screen flex bg-bg-primary">
      <Sidebar
        workspace={workspace}
        conversations={conversations}
        activeConversationId={activeConversationId}
        tasks={tasks}
        isThinking={isThinking}
        onSelectWorkspace={handleSelectWorkspace}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {process.platform === 'darwin' && (
          <div className="drag-region h-10 shrink-0" />
        )}

        {!workspace ? (
          <FolderPicker onSelect={handleSelectWorkspace} />
        ) : (
          <TaskStream
            messages={messages}
            isThinking={isThinking}
            onSendMessage={handleSendMessage}
            onCancel={() => {
              if (activeConversationId && window.api) {
                window.api.cancelTask(activeConversationId);
              }
            }}
          />
        )}
      </main>

      <AnimatePresence>
        {paletteOpen && (
          <CommandPalette
            onClose={() => setPaletteOpen(false)}
            onAction={handlePaletteAction}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDialog && (
          <ConfirmDialog
            toolName={confirmDialog.toolName}
            toolInput={confirmDialog.toolInput}
            onApprove={() => handleConfirm(true)}
            onDeny={() => handleConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
