import { resolveTabId, tabsUpdate } from "../chromeApi.js";

export async function navigateTo(params: Record<string, unknown>): Promise<unknown> {
  const url = params.url as string;
  const tabId = await resolveTabId(params.tabId as number | undefined);
  await tabsUpdate(tabId, { url });
  return { tabId, url };
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
