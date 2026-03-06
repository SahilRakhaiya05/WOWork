import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { strings } from '../strings';
import { slideFromBottom, thinkingDots } from '../animations';

function ToolCallBlock({ message }) {
  const [expanded, setExpanded] = useState(false);
  const isRunning = message._status === 'running';
  const isError = message._status === 'error';

  return (
    <motion.div
      className="mx-4 my-2 rounded-lg border border-border bg-bg-card overflow-hidden"
      {...slideFromBottom}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-bg-hover transition-colors"
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${
          isRunning ? 'bg-warning animate-pulse' : isError ? 'bg-error' : 'bg-success'
        }`} />
        <span className="font-mono text-xs text-accent">{message.tool_name}</span>
        <span className="text-xs text-text-muted">
          {isRunning ? strings.toolRunning : isError ? 'Error' : 'Done'}
        </span>
        <svg
          className={`w-3 h-3 ml-auto text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-border"
          >
            {message.tool_input && (
              <div className="px-4 py-2">
                <p className="text-xs text-text-muted mb-1">Input</p>
                <pre className="text-xs font-mono text-text-secondary bg-bg-primary rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                  {message.tool_input}
                </pre>
              </div>
            )}
            {message.tool_output && (
              <div className="px-4 py-2">
                <p className="text-xs text-text-muted mb-1">Output</p>
                <pre className={`text-xs font-mono rounded p-2 overflow-x-auto max-h-60 overflow-y-auto ${
                  isError ? 'text-error bg-error/10' : 'text-text-secondary bg-bg-primary'
                }`}>
                  {message.tool_output}
                </pre>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  if (message.role === 'tool') {
    return <ToolCallBlock message={message} />;
  }

  return (
    <motion.div
      className={`px-4 py-1 ${isUser ? 'flex justify-end' : ''}`}
      {...slideFromBottom}
    >
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-accent text-white rounded-br-md'
          : 'bg-bg-card text-text-primary rounded-bl-md'
      }`}>
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="px-4 py-2 flex items-center gap-1.5">
      <div className="bg-bg-card rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-text-muted"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function TaskStream({ messages, isThinking, onSendMessage, onCancel }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    onSendMessage(text);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {messages.length === 0 && !isThinking && (
          <div className="h-full flex flex-col items-center justify-center text-text-muted">
            <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">{strings.inputPlaceholder}</p>
            <p className="text-xs mt-1 text-text-muted">
              <kbd className="bg-bg-hover rounded px-1.5 py-0.5">⌘K</kbd> to search anything
            </p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))}
        </AnimatePresence>

        {isThinking && <ThinkingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={strings.inputPlaceholder}
              rows={1}
              className="w-full bg-bg-input text-text-primary rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted border border-border"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>

          {isThinking ? (
            <button
              type="button"
              onClick={onCancel}
              className="bg-error hover:bg-error/80 text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors shrink-0"
            >
              {strings.cancelTask}
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors shrink-0"
            >
              {strings.sendButton}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
