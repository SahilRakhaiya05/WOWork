import React from 'react';
import { motion } from 'framer-motion';
import { strings } from '../strings';
import { fadeIn } from '../animations';

export default function FolderPicker({ onSelect }) {
  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-center px-8"
      {...fadeIn}
    >
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-text-primary mb-2">
        {strings.folderPickerTitle}
      </h2>
      <p className="text-sm text-text-secondary mb-8 text-center max-w-sm">
        {strings.folderPickerDescription}
      </p>

      <button
        onClick={onSelect}
        className="bg-accent hover:bg-accent-hover text-white rounded-xl px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {strings.browseButton}
      </button>
    </motion.div>
  );
}
