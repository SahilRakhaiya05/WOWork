import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { strings } from '../strings';
import { commandPaletteOverlay, commandPaletteModal } from '../animations';

const SOURCE_ICONS = {
  files: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  history: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  apps: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  web: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
};

const SOURCE_LABELS = {
  files: strings.filesSection,
  history: strings.historySection,
  apps: strings.appsSection,
  web: strings.webSection,
};

export default function CommandPalette({ onClose, onAction }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);
  const searchCleanup = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (window.api) {
      searchCleanup.current = window.api.onSearchResults((data) => {
        if (data.done) {
          setLoading(false);
          if (data.results?.length > 0) {
            setResults(data.results);
          }
        } else if (data.results?.length > 0) {
          setResults((prev) => {
            const newResults = [...prev, ...data.results];
            const seen = new Set();
            return newResults.filter((r) => {
              const key = `${r.source}:${r.path || r.url || r.id || r.title}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          });
        }
      });
    }
    return () => searchCleanup.current?.();
  }, []);

  const performSearch = useCallback((q) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setResults([]);
    setSelectedIndex(0);
    if (window.api) {
      window.api.search(q);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 150);
    return () => clearTimeout(debounceRef.current);
  }, [query, performSearch]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        if (e.metaKey || e.ctrlKey) {
          onAction(results[selectedIndex], 'new-task');
        } else {
          onAction(results[selectedIndex], 'open');
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onAction(results[selectedIndex], 'insert');
      }
    }
  }

  const groupedResults = {};
  for (const r of results) {
    const source = r.source || 'other';
    if (!groupedResults[source]) groupedResults[source] = [];
    groupedResults[source].push(r);
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
      {...commandPaletteOverlay}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        className="relative w-[600px] max-h-[60vh] bg-bg-sidebar/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        {...commandPaletteModal}
      >
        {/* Search input */}
        <div className="flex items-center px-4 border-b border-border">
          <svg className="w-5 h-5 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={strings.searchPlaceholder}
            className="flex-1 bg-transparent text-text-primary text-sm px-3 py-4 focus:outline-none placeholder:text-text-muted"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto" ref={listRef}>
          {results.length === 0 && query.length >= 2 && !loading && (
            <div className="px-4 py-8 text-center text-text-muted text-sm">
              {strings.noResults}
            </div>
          )}

          {results.length === 0 && query.length < 2 && (
            <div className="px-4 py-6 text-center text-text-muted text-xs">
              {strings.searchHint}
            </div>
          )}

          {Object.entries(groupedResults).map(([source, items]) => (
            <div key={source}>
              <div className="px-4 py-2 text-xs text-text-muted uppercase tracking-wider bg-bg-primary/50 sticky top-0">
                {SOURCE_LABELS[source] || source}
              </div>
              {items.map((result, idx) => {
                const globalIdx = results.indexOf(result);
                const isSelected = globalIdx === selectedIndex;
                return (
                  <button
                    key={`${source}-${idx}`}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                      isSelected ? 'bg-accent/10' : 'hover:bg-bg-hover'
                    }`}
                    onClick={() => onAction(result, 'open')}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                  >
                    <div className={`shrink-0 ${isSelected ? 'text-accent' : 'text-text-muted'}`}>
                      {SOURCE_ICONS[source] || SOURCE_ICONS.files}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${isSelected ? 'text-accent' : 'text-text-primary'}`}>
                        {result.name || result.title || result.conversationTitle || result.path?.split('/').pop() || 'Untitled'}
                      </p>
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {result.aiSummary || result.snippet || result.path || result.url || ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-text-muted">
          <span>{strings.enterToOpen}</span>
          <span>{strings.tabToInsert}</span>
          <span className="ml-auto">{strings.escToClose}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
