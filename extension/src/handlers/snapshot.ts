import { executeScript, resolveTabId, tabsGet } from "../chromeApi.js";

export async function getPageSnapshot(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabId(params.tabId as number | undefined);
  const tab = await tabsGet(tabId);

  const [pageInfo, screenshot] = await Promise.all([
    executeScript(
      tabId,
      () => {
        function getName(el: Element): string {
          return (
            el.getAttribute("aria-label") ||
            el.getAttribute("placeholder") ||
            el.getAttribute("title") ||
            el.getAttribute("alt") ||
            (el.id
              ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent?.trim() ?? ""
              : "") ||
            el.textContent?.trim().slice(0, 80) ||
            ""
          );
        }

        function getSelector(el: Element): string {
          if (el.id) return `#${CSS.escape(el.id)}`;
          const testId = el.getAttribute("data-testid");
          if (testId) return `[data-testid="${testId}"]`;
          const name = el.getAttribute("name");
          if (name) return `[name="${name}"]`;
          const cls =
            el.className && typeof el.className === "string"
              ? el.className.trim().split(/\s+/).slice(0, 2).join(".")
              : "";
          return el.tagName.toLowerCase() + (cls ? "." + cls : "");
        }

        const interactive: object[] = [];
        const seen = new Set<Element>();

        document.querySelectorAll<HTMLElement>("input:not([type=hidden]), textarea, select").forEach((el) => {
          if (seen.has(el)) return;
          seen.add(el);
          const inp = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          const node: Record<string, unknown> = {
            role: el.tagName === "SELECT" ? "combobox" : el.tagName === "TEXTAREA" ? "textbox" : "input",
            type: (inp as HTMLInputElement).type || el.tagName.toLowerCase(),
            name: getName(el),
            selector: getSelector(el),
          };
          const val = (inp as HTMLInputElement).value;
          if (val) node.value = val;
          if ((inp as HTMLInputElement).disabled) node.disabled = true;
          interactive.push(node);
        });

        document.querySelectorAll<HTMLElement>("button, input[type=submit], input[type=button], [role=button]").forEach((el) => {
          if (seen.has(el)) return;
          seen.add(el);
          interactive.push({
            role: "button",
            name: getName(el),
            selector: getSelector(el),
            disabled: (el as HTMLButtonElement).disabled || undefined,
          });
        });

        let linkCount = 0;
        document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
          if (seen.has(a) || linkCount >= 30) return;
          seen.add(a);
          const name = getName(a);
          if (!name || name.length < 2) return;
          linkCount++;
          interactive.push({ role: "link", name, selector: getSelector(a), href: a.getAttribute("href") });
        });

        const headings = Array.from(document.querySelectorAll<HTMLHeadingElement>("h1,h2,h3,h4,h5,h6"))
          .map((h) => `${"#".repeat(parseInt(h.tagName[1]))} ${h.textContent?.trim()}`)
          .filter(Boolean);

        return { interactive, headings };
      },
      [],
    ),
    new Promise<string>((resolve, reject) => {
      chrome.tabs.captureVisibleTab(tab.windowId!, { format: "png" }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(dataUrl);
        }
      });
    }),
  ]);

  return {
    url: tab.url,
    title: tab.title,
    screenshot,
    ...(pageInfo as object),
  };
}
