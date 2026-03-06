import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { strings } from '../strings';
import { slideFromRight } from '../animations';

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function MaskedInput({ label, placeholder, value, onChange }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="mb-3">
      <label className="block text-sm text-text-secondary mb-1">{label}</label>
      <div className="relative">
        <input
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted pr-10"
        />
        <button
          onClick={() => setRevealed(!revealed)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
          type="button"
        >
          {revealed ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPanel({ onClose }) {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [composioKey, setComposioKey] = useState('');
  const [globalInstructions, setGlobalInstructions] = useState('');
  const [skills, setSkills] = useState([]);
  const [saved, setSaved] = useState(false);
  const [mcpUrl, setMcpUrl] = useState('');

  useEffect(() => {
    async function load() {
      if (!window.api) return;
      const instructions = await window.api.getGlobalInstructions();
      setGlobalInstructions(instructions || '');
      const loadedSkills = await window.api.getSkills();
      setSkills(loadedSkills || []);
    }
    load();
  }, []);

  async function handleSaveKeys() {
    if (!window.api) return;
    await window.api.saveApiKeys({
      anthropicKey: anthropicKey || undefined,
      composioKey: composioKey || undefined,
    });
    flashSaved();
  }

  async function handleSaveInstructions() {
    if (!window.api) return;
    await window.api.saveGlobalInstructions(globalInstructions);
    flashSaved();
  }

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <motion.div className="fixed inset-0 z-40 flex" {...{
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    }}>
      <div className="flex-1 bg-black/40" onClick={onClose} />

      <motion.div
        className="w-[400px] bg-bg-sidebar border-l border-border h-full overflow-y-auto"
        {...slideFromRight}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">{strings.settingsTitle}</h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {saved && (
            <div className="mb-4 px-3 py-2 bg-success/10 border border-success/20 rounded-lg text-success text-sm">
              {strings.saved}
            </div>
          )}

          {/* API Keys */}
          <Section title={strings.apiKeysSection}>
            <MaskedInput
              label={strings.anthropicKeyLabel}
              placeholder={strings.anthropicKeyPlaceholder}
              value={anthropicKey}
              onChange={setAnthropicKey}
            />
            <MaskedInput
              label={strings.composioKeyLabel}
              placeholder={strings.composioKeyPlaceholder}
              value={composioKey}
              onChange={setComposioKey}
            />
            <button
              onClick={handleSaveKeys}
              className="bg-accent hover:bg-accent-hover text-white text-sm rounded-lg px-4 py-2 transition-colors"
            >
              {strings.save}
            </button>
          </Section>

          {/* Connected Apps */}
          <Section title={strings.connectedAppsSection}>
            {['Gmail', 'Slack', 'GitHub', 'Google Drive', 'Notion', 'Linear'].map((app) => (
              <div key={app} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-text-secondary">{app}</span>
                <span className="text-xs text-text-muted px-2 py-0.5 rounded bg-bg-hover">
                  {strings.disconnected}
                </span>
              </div>
            ))}
            <p className="text-xs text-text-muted mt-2">Connect apps via Composio to search them with ⌘K.</p>
          </Section>

          {/* Global Instructions */}
          <Section title={strings.instructionsSection}>
            <p className="text-xs text-text-muted mb-2">{strings.instructionsHelp}</p>
            <textarea
              value={globalInstructions}
              onChange={(e) => setGlobalInstructions(e.target.value)}
              rows={6}
              className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted resize-y"
              placeholder="e.g., I prefer formal English. Always create a summary.md after tasks."
            />
            <button
              onClick={handleSaveInstructions}
              className="mt-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg px-4 py-2 transition-colors"
            >
              {strings.save}
            </button>
          </Section>

          {/* Skills */}
          <Section title={strings.skillsSection}>
            {skills.length === 0 ? (
              <p className="text-xs text-text-muted">No skills installed.</p>
            ) : (
              skills.map((skill) => (
                <div key={skill.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm text-text-secondary">{skill.name}</p>
                    <p className="text-xs text-text-muted">{skill.triggerKeywords?.join(', ')}</p>
                  </div>
                  <span className="text-xs text-success px-2 py-0.5 rounded bg-success/10">
                    {strings.enable}d
                  </span>
                </div>
              ))
            )}
          </Section>

          {/* MCP Servers */}
          <Section title={strings.mcpServersSection}>
            <div className="flex gap-2">
              <input
                type="text"
                value={mcpUrl}
                onChange={(e) => setMcpUrl(e.target.value)}
                placeholder="https://mcp-server-url.com"
                className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted"
              />
              <button className="bg-bg-hover hover:bg-border text-text-secondary text-sm rounded-lg px-3 py-2 transition-colors">
                Add
              </button>
            </div>
          </Section>
        </div>
      </motion.div>
    </motion.div>
  );
}
