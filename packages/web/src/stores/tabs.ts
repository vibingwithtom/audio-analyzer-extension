import { writable, type Writable } from 'svelte/store';

export type TabType = 'local' | 'googleDrive' | 'box' | 'settings';

interface CurrentTabStore {
  subscribe: Writable<TabType>['subscribe'];
  setTab: (tab: TabType) => void;
}

function createCurrentTab(): CurrentTabStore {
  const { subscribe, set } = writable<TabType>('local');

  return {
    subscribe,
    setTab: (tab: TabType) => set(tab)
  };
}

export const currentTab = createCurrentTab();