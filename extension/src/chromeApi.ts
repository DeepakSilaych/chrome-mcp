export function tabsQuery(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query(queryInfo, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(tabs);
      }
    });
  });
}

export function tabsGet(tabId: number): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(tab);
      }
    });
  });
}

export function tabsUpdate(tabId: number, props: chrome.tabs.UpdateProperties): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    chrome.tabs.update(tabId, props, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        reject(new Error(chrome.runtime.lastError?.message ?? "tabs.update failed"));
      } else {
        resolve(tab);
      }
    });
  });
}

export function tabsRemove(tabIds: number | number[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.tabs.remove(tabIds, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

export function tabsCreate(props: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    chrome.tabs.create(props, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        reject(new Error(chrome.runtime.lastError?.message ?? "tabs.create failed"));
      } else {
        resolve(tab);
      }
    });
  });
}

export function executeScript<TArgs extends unknown[], TResult>(
  tabId: number,
  func: (...args: TArgs) => TResult,
  args: TArgs,
): Promise<TResult> {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func,
        args,
      },
      (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          const first = results?.[0]?.result as TResult;
          resolve(first);
        }
      },
    );
  });
}

export async function resolveTabId(tabId?: number): Promise<number> {
  if (tabId != null) return tabId;
  const tabs = await tabsQuery({ active: true, currentWindow: true });
  const id = tabs[0]?.id;
  if (id == null) throw new Error("No active tab");
  return id;
}

export type TabSpec = { tabId?: number; tabUrl?: string; tabTitle?: string };

export async function resolveTabSpec(spec: TabSpec): Promise<number> {
  if (spec.tabId != null) return spec.tabId;
  if (spec.tabUrl || spec.tabTitle) {
    const all = await tabsQuery({});
    const needle_url = spec.tabUrl?.toLowerCase();
    const needle_title = spec.tabTitle?.toLowerCase();
    const tab = all.find((t) => {
      if (needle_url && t.url?.toLowerCase().includes(needle_url)) return true;
      if (needle_title && t.title?.toLowerCase().includes(needle_title)) return true;
      return false;
    });
    if (!tab?.id) {
      throw new Error(`No tab found matching ${spec.tabUrl ? `url="${spec.tabUrl}"` : `title="${spec.tabTitle}"`}`);
    }
    return tab.id;
  }
  return resolveTabId();
}

export function tabSummary(t: chrome.tabs.Tab) {
  return {
    id: t.id,
    title: t.title,
    url: t.url,
    active: t.active,
    windowId: t.windowId,
    index: t.index,
  };
}
