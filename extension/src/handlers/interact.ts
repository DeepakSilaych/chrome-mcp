import { executeScript, resolveTabId, tabsGet } from "../chromeApi.js";

export async function click(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabId(params.tabId as number | undefined);
  const selector = params.selector as string;
  return executeScript(
    tabId,
    (sel: string) => {
      const el = document.querySelector(sel);
      if (!(el instanceof HTMLElement)) throw new Error("Element not found");
      el.click();
      return true;
    },
    [selector],
  );
}

export async function typeText(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabId(params.tabId as number | undefined);
  const selector = params.selector as string;
  const text = params.text as string;
  const clear = Boolean(params.clear);
  return executeScript(
    tabId,
    (sel: string, val: string, clr: boolean) => {
      const el = document.querySelector(sel);
      if (!(el instanceof HTMLElement)) throw new Error("Element not found");
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (clr) el.value = "";
        el.value += val;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (el.isContentEditable) {
        el.textContent = (clr ? "" : el.textContent ?? "") + val;
      } else {
        throw new Error("Element is not input or textarea");
      }
      return true;
    },
    [selector, text, clear],
  );
}

type Field = { selector: string; value: string };

export async function fillForm(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabId(params.tabId as number | undefined);
  const fields = params.fields as Field[];
  const submit = Boolean(params.submit);
  return executeScript(
    tabId,
    (items: Field[], doSubmit: boolean) => {
      for (const { selector, value } of items) {
        const el = document.querySelector(selector);
        if (!el) throw new Error(`Element not found: ${selector}`);

        if (el instanceof HTMLSelectElement) {
          el.value = value;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (el instanceof HTMLInputElement && el.type === "checkbox") {
          el.checked = value === "true" || value === "1" || value === "on";
          el.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (el instanceof HTMLInputElement && el.type === "radio") {
          el.checked = true;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        } else if ((el as HTMLElement).isContentEditable) {
          (el as HTMLElement).textContent = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          throw new Error(`Not a fillable element: ${selector}`);
        }
      }
      if (doSubmit) {
        const form = document.querySelector("form");
        if (form) form.requestSubmit();
      }
      return true;
    },
    [fields, submit],
  );
}

export async function clickAndWait(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabId(params.tabId as number | undefined);
  const selector = params.selector as string;
  const waitFor = params.waitFor as string | undefined;
  const waitForNavigation = Boolean(params.waitForNavigation);
  const timeoutMs = (params.timeout as number | undefined) ?? 5_000;

  await executeScript(
    tabId,
    (sel: string) => {
      const el = document.querySelector(sel);
      if (!(el instanceof HTMLElement)) throw new Error(`Element not found: ${sel}`);
      el.click();
      return true;
    },
    [selector],
  );

  if (waitForNavigation) {
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
  } else if (waitFor) {
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

export async function scroll(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabId(params.tabId as number | undefined);
  const direction = params.direction as string;
  const amount = (params.amount as number) ?? 400;
  return executeScript(
    tabId,
    (dir: string, amt: number) => {
      let dx = 0;
      let dy = 0;
      if (dir === "up") dy = -amt;
      if (dir === "down") dy = amt;
      if (dir === "left") dx = -amt;
      if (dir === "right") dx = amt;
      window.scrollBy(dx, dy);
      return { dx, dy };
    },
    [direction, amount],
  );
}
