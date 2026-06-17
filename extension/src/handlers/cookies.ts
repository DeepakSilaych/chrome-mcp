import { executeScript, resolveTabSpec, type TabSpec } from "../chromeApi.js";

export async function getCookies(params: Record<string, unknown>): Promise<unknown> {
  const url = params.url as string;
  return new Promise<chrome.cookies.Cookie[]>((resolve, reject) => {
    chrome.cookies.getAll({ url }, (cookies) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(cookies);
      }
    });
  });
}

export async function getLocalStorage(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabSpec(params as TabSpec);
  return executeScript(
    tabId,
    () => {
      const o: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) o[k] = localStorage.getItem(k) ?? "";
      }
      return o;
    },
    [],
  );
}
