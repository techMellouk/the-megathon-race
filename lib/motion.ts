import type { Transition, MotionProps } from "framer-motion";

/**
 * Shared easing curve — fast ease-out used throughout the app.
 */
export const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Reusable transition presets.
 */
export const transitions = {
  smooth: { duration: 0.5, ease: EASE_OUT_EXPO } satisfies Transition,
  slow: { duration: 0.7, ease: EASE_OUT_EXPO } satisfies Transition,
  fade: { duration: 0.45, ease: "easeInOut" } satisfies Transition,
} as const;

/**
 * Reusable motion variant presets for AnimatePresence sections.
 */
export const fadeBlurIn: Pick<MotionProps, "initial" | "animate" | "exit" | "transition"> = {
  initial: { opacity: 0, y: 18, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -24, scale: 0.97, filter: "blur(10px)" },
  transition: transitions.smooth,
};

export const fadeIn: Pick<MotionProps, "initial" | "animate" | "exit" | "transition"> = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, scale: 1.04 },
  transition: transitions.fade,
};

export const scaleBlurIn: Pick<MotionProps, "initial" | "animate" | "exit" | "transition"> = {
  initial: { opacity: 0, scale: 1.06, filter: "blur(14px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.98 },
  transition: transitions.slow,
};
