import { executeScript, resolveTabId, tabsGet, tabsUpdate } from "../chromeApi.js";

export async function navigateTo(params: Record<string, unknown>): Promise<unknown> {
  const url = params.url as string;
  const tabId = await resolveTabId(params.tabId as number | undefined);
  await tabsUpdate(tabId, { url });
  return { tabId, url };
}

export async function navigateAndWait(params: Record<string, unknown>): Promise<unknown> {
  const url = params.url as string;
  const waitFor = params.waitFor as string | undefined;
  const timeoutMs = (params.timeout as number | undefined) ?? 10_000;
  const tabId = await resolveTabId(params.tabId as number | undefined);

  await tabsUpdate(tabId, { url });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error(`Navigation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    function listener(updatedId: number, info: chrome.tabs.TabChangeInfo) {
      if (updatedId === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });

  if (waitFor) {
    await executeScript(
      tabId,
      (sel: string, ms: number) =>
        new Promise<boolean>((resolve, reject) => {
          if (document.querySelector(sel)) { resolve(true); return; }
          const obs = new MutationObserver(() => {
            if (document.querySelector(sel)) { obs.disconnect(); resolve(true); }
          });
          obs.observe(document.documentElement, { childList: true, subtree: true });
          setTimeout(() => { obs.disconnect(); reject(new Error(`waitFor "${sel}" timed out`)); }, ms);
        }),
      [waitFor, timeoutMs],
    );
  }

  const tab = await tabsGet(tabId);
  return { tabId, url: tab.url, title: tab.title };
}

export async function goBack(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabId(params.tabId as number | undefined);
  await new Promise<void>((resolve, reject) => {
    chrome.tabs.goBack(tabId, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
  return { tabId };
}

export async function goForward(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabId(params.tabId as number | undefined);
  await new Promise<void>((resolve, reject) => {
    chrome.tabs.goForward(tabId, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
  return { tabId };
}

export async function reload(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabId(params.tabId as number | undefined);
  await new Promise<void>((resolve, reject) => {
    chrome.tabs.reload(tabId, {}, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
  return { tabId };
}
