import { Preferences } from '@capacitor/preferences';
import { getString } from './preferencesService';

/**
 * Design mode service — lets the user pick the app's visual design.
 *
 * Available modes:
 *  - classic     Legacy design (unchanged default)
 *  - ocean       "Ocean Fresh" — bright, airy, azure gradient
 *
 * The mode is persisted under `csr_design_mode` via @capacitor/preferences
 * (mirrored to localStorage for synchronous reads) and applied as a
 * `<mode>-theme` class on <body>. The theme CSS (src/theme/ocean/) is
 * completely inert unless the body class is set — the legacy design is
 * byte-for-byte untouched.
 */

export type DesignMode = 'classic' | 'ocean';

const DESIGN_MODE_KEY = 'csr_design_mode';

/** Body class per mode (empty = legacy, no class). */
export const DESIGN_MODE_BODY_CLASS: Record<DesignMode, string> = {
  classic: '',
  ocean: 'ocean-theme',
};

const ALL_BODY_CLASSES = Object.values(DESIGN_MODE_BODY_CLASS).filter(Boolean);

const ALL_MODES = Object.keys(DESIGN_MODE_BODY_CLASS) as DesignMode[];

function toMode(v: string | null): DesignMode | null {
  return v !== null && (ALL_MODES as string[]).includes(v) ? (v as DesignMode) : null;
}

/** Read the persisted design mode (defaults to 'classic' for existing users). */
export function getDesignMode(): DesignMode {
  // Preferences cache first (survives WebView storage clearing on Android),
  // then localStorage, then default.
  const fromCache = toMode(getString(DESIGN_MODE_KEY));
  if (fromCache) return fromCache;
  try {
    if (typeof localStorage !== 'undefined') {
      const fromLs = toMode(localStorage.getItem(DESIGN_MODE_KEY));
      if (fromLs) return fromLs;
    }
  } catch {
    // ignore
  }
  return 'classic';
}

/** Persist the design mode. Fire-and-forget native write with localStorage mirror. */
export function setDesignMode(mode: DesignMode): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DESIGN_MODE_KEY, mode);
    }
  } catch {
    // ignore
  }
  Preferences.set({ key: DESIGN_MODE_KEY, value: mode }).catch(err =>
    console.error('[DesignModeService] persist failed', err)
  );
  applyDesignMode();
}

/** Apply (or remove) the theme body class based on the saved mode. */
export function applyDesignMode(): void {
  const mode = getDesignMode();
  // Remove every theme class, then apply the active one (keeps body clean
  // even if the mode was changed while the app is running).
  ALL_BODY_CLASSES.forEach(cls => document.body.classList.remove(cls));
  const cls = DESIGN_MODE_BODY_CLASS[mode];
  if (cls) document.body.classList.add(cls);
}