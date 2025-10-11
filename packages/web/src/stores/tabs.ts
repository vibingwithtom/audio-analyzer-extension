import { writable, type Writable } from 'svelte/store';

export type TabType = 'local' | 'googleDrive' | 'box' | 'settings';

interface CurrentTabStore {
  subscribe: Writable<TabType>['subscribe'];
  setTab: (tab: TabType) => void;
}

function createCurrentTab(): CurrentTabStore {
  // Try to restore tab from localStorage
  const storedTab = typeof window !== 'undefined' ? localStorage.getItem('current_tab') : null;
  const initialTab: TabType = (storedTab as TabType) || 'local';

  const { subscribe, set } = writable<TabType>(initialTab);

  return {
    subscribe,
    setTab: (tab: TabType) => {
      set(tab);
      // Persist to localStorage for tab restoration after OAuth redirects
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_tab', tab);
      }
    }
  };
}

export const currentTab = createCurrentTab();