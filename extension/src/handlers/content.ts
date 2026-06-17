import { executeScript, resolveTabSpec, type TabSpec } from "../chromeApi.js";

export async function getPage(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabSpec(params as TabSpec);
  const format = (params.format as string) ?? "text";
  return executeScript(
    tabId,
    (fmt: string) => {
      if (fmt === "html") return document.documentElement.outerHTML;
      if (fmt === "markdown") return document.body?.innerText ?? "";
      return document.body?.innerText ?? "";
    },
    [format],
  );
}

export async function getSelection(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabSpec(params as TabSpec);
  return executeScript(tabId, () => window.getSelection()?.toString() ?? "", []);
}
