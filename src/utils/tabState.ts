// Tab state management functionality

export type TabState = {
  pageInfo: any;
  analysis: any[];
  failedProviders: string[];
  showButton: boolean;
  isAnalyzing: boolean;
  hasAttemptedAnalysis: boolean;
  isViewingFromRecent?: boolean;
  originalTabId?: number;
  hasPreloadedAnalysis?: boolean;
  requiresManualTrigger?: boolean;
};

// In-memory tab state storage
const tabStates = new Map<number, TabState>();

// Track tabs that are currently being set up to prevent double execution
const tabsBeingSetup = new Set<number>();

// Get default state for a new tab
export const getDefaultState = (): TabState => ({
  pageInfo: null,
  analysis: [],
  failedProviders: [],
  showButton: true,
  isAnalyzing: false,
  hasAttemptedAnalysis: false
});

// Persistent tab state storage helpers
export async function saveTabState(tabId: number, state: TabState): Promise<void> {
  try {
    const existing = await chrome.storage.local.get('tabStates');
    const tabStatesObj = existing.tabStates || {};
    tabStatesObj[tabId] = state;
    await chrome.storage.local.set({ tabStates: tabStatesObj });
    // Also keep in memory for quick access
    tabStates.set(tabId, state);
  } catch (error) {
    console.error('Failed to save tab state:', error);
    // Fallback to memory only
    tabStates.set(tabId, state);
  }
}

export async function getTabState(tabId: number): Promise<TabState | undefined> {
  // First check memory
  if (tabStates.has(tabId)) {
    return tabStates.get(tabId);
  }
  
  // Then check persistent storage
  try {
    const existing = await chrome.storage.local.get('tabStates');
    const tabStatesObj = existing.tabStates || {};
    const state = tabStatesObj[tabId];
    if (state) {
      // Restore to memory
      tabStates.set(tabId, state);
      return state;
    }
  } catch (error) {
    console.error('Failed to get tab state:', error);
  }
  
  return undefined;
}

export async function deleteTabState(tabId: number): Promise<void> {
  try {
    const existing = await chrome.storage.local.get('tabStates');
    const tabStatesObj = existing.tabStates || {};
    delete tabStatesObj[tabId];
    await chrome.storage.local.set({ tabStates: tabStatesObj });
    // Also remove from memory
    tabStates.delete(tabId);
  } catch (error) {
    console.error('Failed to delete tab state:', error);
    // Fallback to memory only
    tabStates.delete(tabId);
  }
}

// Tab setup tracking
export function isTabBeingSetup(tabId: number): boolean {
  return tabsBeingSetup.has(tabId);
}

export function markTabAsBeingSetup(tabId: number): void {
  tabsBeingSetup.add(tabId);
}

export function unmarkTabAsBeingSetup(tabId: number): void {
  tabsBeingSetup.delete(tabId);
}

// Cleanup old tab states from storage (for closed tabs)
export const cleanupTabStates = async (): Promise<void> => {
  try {
    const tabStatesData = await chrome.storage.local.get('tabStates');
    const tabStatesObj = tabStatesData.tabStates || {};
    const allTabs = await chrome.tabs.query({});
    const activeTabIds = new Set(allTabs.map(tab => tab.id));
    
    // Remove states for tabs that no longer exist
    let cleaned = false;
    for (const tabId of Object.keys(tabStatesObj)) {
      if (!activeTabIds.has(parseInt(tabId))) {
        delete tabStatesObj[tabId];
        cleaned = true;
      }
    }
    
    if (cleaned) {
      await chrome.storage.local.set({ tabStates: tabStatesObj });
    }
  } catch (error) {
    console.error('Error cleaning up tab states:', error);
  }
};
