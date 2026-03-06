import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { strings } from '../strings';
import { fadeIn, slideUp } from '../animations';

export default function Onboarding({ onComplete }) {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [composioKey, setComposioKey] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!anthropicKey.trim()) {
      setError('Anthropic API key is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (window.api) {
        await window.api.saveApiKeys({
          anthropicKey: anthropicKey.trim(),
          composioKey: composioKey.trim() || undefined,
        });
      }
      onComplete();
    } catch (err) {
      setError('Failed to save keys. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-bg-primary">
      <motion.div className="w-[440px] px-8" {...fadeIn}>
        <motion.div className="text-center mb-8" {...slideUp}>
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{strings.onboardingTitle}</h1>
          <p className="text-sm text-text-secondary mt-2">{strings.onboardingSubtitle}</p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          {error && (
            <div className="px-3 py-2 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              {strings.anthropicKeyLabel} <span className="text-error">*</span>
            </label>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder={strings.anthropicKeyPlaceholder}
              className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-text-muted"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              {strings.composioKeyLabel}
            </label>
            <input
              type="password"
              value={composioKey}
              onChange={(e) => setComposioKey(e.target.value)}
              placeholder={strings.composioKeyPlaceholder}
              className="w-full bg-bg-input border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-text-muted"
            />
            <p className="text-xs text-text-muted mt-1.5">{strings.skipComposio}</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors mt-6"
          >
            {saving ? 'Saving...' : strings.saveAndContinue}
          </button>
        </motion.form>
      </motion.div>
    </div>
  );
}
