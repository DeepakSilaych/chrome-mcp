import { executeScript, resolveTabSpec, type TabSpec } from "../chromeApi.js";

export async function getPage(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabSpec(params as TabSpec);
  const format = (params.format as string) ?? "text";
  const selector = params.selector as string | undefined;

  return executeScript(
    tabId,
    (fmt: string, sel: string | null) => {
      const root: Element | null = sel
        ? document.querySelector(sel)
        : document.documentElement;
      if (!root) throw new Error(`Selector not found: ${sel}`);

      if (fmt === "html") return (root as HTMLElement).outerHTML;
      if (fmt === "text" || fmt === "markdown") return (root as HTMLElement).innerText ?? "";

      // aria — compact accessibility tree, ~10-20x smaller than raw HTML
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

      function getRef(el: Element): string | null {
        if (el.id) return `#${CSS.escape(el.id)}`;
        const t = el.getAttribute("data-testid");
        if (t) return `[data-testid="${t}"]`;
        const n = el.getAttribute("name");
        if (n) return `[name="${n}"]`;
        return null;
      }

      function roleOf(el: Element): string | null {
        const explicit = el.getAttribute("role");
        if (explicit) return explicit;
        const tag = el.tagName.toLowerCase();
        const inp = el as HTMLInputElement;
        const map: Record<string, string> = {
          a: "link", button: "button", select: "combobox", textarea: "textbox",
          h1: "heading", h2: "heading", h3: "heading", h4: "heading", h5: "heading", h6: "heading",
          nav: "navigation", main: "main", header: "banner", footer: "contentinfo",
          form: "form", img: "img", dialog: "dialog", ul: "list", ol: "list", li: "listitem",
        };
        if (tag === "input") {
          const t = inp.type?.toLowerCase();
          if (t === "checkbox") return "checkbox";
          if (t === "radio") return "radio";
          if (t === "submit" || t === "button" || t === "reset") return "button";
          return "textbox";
        }
        return map[tag] ?? null;
      }

      const skip = new Set(["script", "style", "noscript", "svg", "path", "meta", "link", "head"]);
      const lines: string[] = [];

      function walk(el: Element, depth: number): void {
        if (depth > 12) return;
        const tag = el.tagName?.toLowerCase();
        if (!tag || skip.has(tag)) return;
        const style = window.getComputedStyle(el as HTMLElement);
        if (style.display === "none" || style.visibility === "hidden") return;

        const role = roleOf(el);
        if (role) {
          const name = getName(el);
          const ref = getRef(el);
          const attrs: string[] = [];
          if (role === "heading") attrs.push(`level=${el.tagName[1]}`);
          const inp = el as HTMLInputElement;
          if (inp.type && inp.type !== "text" && inp.type !== "submit") attrs.push(`type=${inp.type}`);
          if (inp.checked) attrs.push("checked");
          if (inp.disabled || el.getAttribute("aria-disabled") === "true") attrs.push("disabled");
          if (inp.value && inp.type !== "password" && inp.value !== inp.placeholder) attrs.push(`value="${inp.value}"`);
          if (role === "link") {
            const href = (el as HTMLAnchorElement).getAttribute("href");
            if (href) attrs.push(`href=${href}`);
          }
          if (ref) attrs.push(`ref=${ref}`);
          const attrStr = attrs.length ? ` [${attrs.join(", ")}]` : "";
          const nameStr = name ? ` "${name}"` : "";
          lines.push(`${"  ".repeat(depth)}- ${role}${nameStr}${attrStr}`);
          // don't recurse into leaf interactive elements
          const isLeaf = ["button", "link", "textbox", "combobox", "checkbox", "radio", "img"].includes(role);
          if (isLeaf) return;
        }

        for (const child of el.children) walk(child, role ? depth + 1 : depth);
      }

      walk(root, 0);
      return lines.join("\n") || "(empty)";
    },
    [format, selector ?? null],
  );
}

export async function getSelection(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabSpec(params as TabSpec);
  return executeScript(tabId, () => window.getSelection()?.toString() ?? "", []);
}
