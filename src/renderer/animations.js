/**
 * Framer Motion animation variants.
 * All animations are defined here and imported by components — no inline variants.
 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};

export const slideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
  transition: { duration: 0.2, ease: 'easeOut' },
};

export const slideFromBottom = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
};

export const slideFromRight = {
  initial: { opacity: 0, x: 300 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 300 },
  transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2, ease: 'easeOut' },
};

export const commandPaletteOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};

export const commandPaletteModal = {
  initial: { opacity: 0, scale: 0.96, y: -10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -10 },
  transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
};

export const listItem = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.15 },
};

export const pulsingDot = {
  animate: {
    scale: [1, 1.3, 1],
    opacity: [1, 0.7, 1],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

export const thinkingDots = {
  animate: {
    opacity: [0.3, 1, 0.3],
  },
  transition: {
    duration: 1.2,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};
