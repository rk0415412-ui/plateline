import { createContext } from 'react';

export const TabBarScrollContext = createContext({
  onScroll: () => {},
  showTabBar: () => {},
  hideTabBar: () => {},
});
