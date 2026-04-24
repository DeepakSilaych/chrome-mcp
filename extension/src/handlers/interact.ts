import { executeScript, resolveTabId } from "../chromeApi.js";

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
  return executeScript(
    tabId,
    (items: Field[]) => {
      for (const { selector, value } of items) {
        const el = document.querySelector(selector);
        if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
          throw new Error(`Not an input: ${selector}`);
        }
        el.value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return true;
    },
    [fields],
  );
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
