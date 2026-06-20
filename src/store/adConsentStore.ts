import { create } from 'zustand';
import { getString, setItem, removeItem } from '../services/preferencesService';

/**
 * Local consent store that mirrors the native UMP SDK state.
 * The native UMP SDK is the primary source, but on the emulator
 * `requestConsentInfo()` may not reliably reflect the user's choice
 * after the form is dismissed. This store provides a reliable backup
 * for the UI to read the current consent preference.
 */

const CONSENT_STORAGE_KEY = 'csr_ad_consent';

type ConsentChoice = 'personalized' | 'non-personalized' | 'not-set';

function loadConsent(): ConsentChoice {
  const stored = getString(CONSENT_STORAGE_KEY);
  if (stored === 'personalized' || stored === 'non-personalized') return stored;
  return 'not-set';
}

function saveConsent(choice: ConsentChoice) {
  setItem(CONSENT_STORAGE_KEY, choice);
}

interface ConsentStore {
  choice: ConsentChoice;
  setPersonalized: () => void;
  setNonPersonalized: () => void;
  reset: () => void;
}

export const useConsentStore = create<ConsentStore>((set) => ({
  choice: loadConsent(),
  setPersonalized: () => {
    saveConsent('personalized');
    set({ choice: 'personalized' });
  },
  setNonPersonalized: () => {
    saveConsent('non-personalized');
    set({ choice: 'non-personalized' });
  },
  reset: () => {
    removeItem(CONSENT_STORAGE_KEY);
    set({ choice: 'not-set' });
  },
}));
