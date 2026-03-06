import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { strings } from '../strings';
import { pulsingDot, listItem } from '../animations';

export default function Sidebar({
  workspace,
  conversations,
  activeConversationId,
  tasks,
  isThinking,
  onSelectWorkspace,
  onSelectConversation,
  onNewConversation,
  onOpenSettings,
}) {
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const activeTasks = tasks.filter((t) => t.status === 'running');
  const queuedTasks = tasks.filter((t) => t.status === 'queued');

  return (
    <aside className="w-60 bg-bg-sidebar border-r border-border flex flex-col h-full shrink-0">
      {/* Workspace header */}
      <div className="p-4 border-b border-border drag-region">
        <div className="flex items-center justify-between no-drag">
          <div className="truncate">
            <p className="text-xs text-text-muted uppercase tracking-wider">{strings.workspace}</p>
            <p className="text-sm text-text-primary truncate mt-0.5">
              {workspace ? workspace.split('/').pop() : strings.noWorkspace}
            </p>
          </div>
          <button
            onClick={onSelectWorkspace}
            className="text-xs text-accent hover:text-accent-hover transition-colors px-2 py-1 rounded hover:bg-bg-hover"
          >
            {workspace ? strings.switchWorkspace : strings.selectFolder}
          </button>
        </div>
      </div>

      {/* Active task */}
      {activeTasks.length > 0 && (
        <div className="p-4 border-b border-border">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">{strings.activeTask}</p>
          {activeTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-success shrink-0"
                {...pulsingDot}
              />
              <p className="text-sm text-text-primary truncate">{task.title}</p>
            </div>
          ))}
        </div>
      )}

      {/* Task queue */}
      {queuedTasks.length > 0 && (
        <div className="p-4 border-b border-border">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">{strings.taskQueue}</p>
          <div className="space-y-1">
            {queuedTasks.map((task) => (
              <motion.div key={task.id} className="flex items-center gap-2" {...listItem}>
                <div className="w-2 h-2 rounded-full bg-warning shrink-0" />
                <p className="text-xs text-text-secondary truncate">{task.title}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* New conversation button */}
      <div className="p-3">
        <button
          onClick={onNewConversation}
          className="w-full text-sm text-text-secondary hover:text-text-primary bg-bg-hover hover:bg-border transition-colors rounded-lg px-3 py-2 text-left flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {strings.newConversation}
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto">
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className="w-full px-4 py-2 flex items-center justify-between text-xs text-text-muted uppercase tracking-wider hover:bg-bg-hover transition-colors"
        >
          {strings.history}
          <svg
            className={`w-3 h-3 transition-transform ${historyExpanded ? 'rotate-0' : '-rotate-90'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence>
          {historyExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {conversations.length === 0 ? (
                <p className="px-4 py-2 text-xs text-text-muted">No conversations yet</p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`w-full px-4 py-2 text-left text-sm truncate transition-colors ${
                      activeConversationId === conv.id
                        ? 'bg-accent/10 text-accent'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    {conv.title}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="px-4 py-2 border-t border-border">
        <p className="text-xs text-text-muted text-center">
          <kbd className="bg-bg-hover rounded px-1.5 py-0.5 text-text-secondary">⌘K</kbd> Search anything
        </p>
      </div>

      {/* Settings */}
      <div className="border-t border-border">
        <button
          onClick={onOpenSettings}
          className="w-full px-4 py-3 flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {strings.settings}
        </button>
      </div>
    </aside>
  );
}
