// Plan limits
export const FREE_MAX_FILES = 2;
export const FREE_MAX_PAGES = 100;
export const CLOUD_MAX_FILES = Infinity;
export const CLOUD_MAX_PAGES = Infinity;
export const DESKTOP_MAX_FILES = Infinity;
export const DESKTOP_MAX_PAGES = Infinity;

// A4 page: ~3000 characters (roughly 250 words at ~12 chars/word)
export const CHARS_PER_PAGE = 3000;

// Session defaults
export const DEFAULT_SESSION_MINUTES = 30;
export const MIN_SESSION_MINUTES = 5;
export const MAX_SESSION_MINUTES = 180;

// Plans
export type PlanType = "free" | "cloud" | "desktop";

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    maxFiles: FREE_MAX_FILES,
    maxPages: FREE_MAX_PAGES,
    features: [
      "2 writing files",
      "100 pages per file",
      "30-minute focus sessions",
      "Local storage",
      "3 text sizes",
    ],
    customTimer: false,
    cloudSync: false,
  },
  cloud: {
    name: "Cloud",
    price: 4.99,
    maxFiles: CLOUD_MAX_FILES,
    maxPages: CLOUD_MAX_PAGES,
    features: [
      "Unlimited files",
      "Unlimited pages",
      "Custom session timer",
      "Cloud sync across devices",
      "Writing statistics",
      "3 text sizes",
    ],
    customTimer: true,
    cloudSync: true,
  },
  desktop: {
    name: "Desktop",
    price: 14.99,
    maxFiles: DESKTOP_MAX_FILES,
    maxPages: DESKTOP_MAX_PAGES,
    features: [
      "Everything in Cloud",
      "Desktop app with true focus mode",
      "Blocks all other apps during sessions",
      "System-level distraction blocking",
      "Offline-first with cloud sync",
      "Priority support",
    ],
    customTimer: true,
    cloudSync: true,
  },
} as const;

// Text sizes
export type TextSize = "small" | "medium" | "large";

export const TEXT_SIZES: Record<TextSize, { label: string; class: string }> = {
  small: { label: "S", class: "text-size-small" },
  medium: { label: "M", class: "text-size-medium" },
  large: { label: "L", class: "text-size-large" },
};
