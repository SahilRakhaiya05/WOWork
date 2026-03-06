import React from 'react';
import { motion } from 'framer-motion';
import { strings } from '../strings';
import { fadeIn, scaleIn } from '../animations';

const ACTION_DESCRIPTIONS = {
  delete_file: strings.confirmDeleteFile,
  overwrite_file: strings.confirmOverwriteFile,
};

export default function ConfirmDialog({ toolName, toolInput, onApprove, onDeny }) {
  const description = ACTION_DESCRIPTIONS[toolName] || `Confirm action: ${toolName}`;
  const filePath = toolInput?.path || '';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      {...fadeIn}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDeny} />

      <motion.div
        className="relative bg-bg-sidebar border border-border rounded-2xl p-6 w-[420px] shadow-2xl"
        {...scaleIn}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{strings.confirmTitle}</h3>
            <p className="text-xs text-text-muted mt-0.5">{toolName}</p>
          </div>
        </div>

        <p className="text-sm text-text-secondary mb-2">{description}</p>

        {filePath && (
          <div className="bg-bg-primary rounded-lg px-3 py-2 mb-4">
            <p className="text-xs font-mono text-text-secondary truncate">{filePath}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onDeny}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-bg-hover hover:bg-border rounded-lg transition-colors"
          >
            {strings.deny}
          </button>
          <button
            onClick={onApprove}
            className="px-4 py-2 text-sm text-white bg-warning hover:bg-warning/80 rounded-lg transition-colors font-medium"
          >
            {strings.approve}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
