import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createHubClient } from "./hub-client.js";
import { registerAllTools } from "./tools/index.js";

const bridge = createHubClient();

const mcp = new McpServer(
  { name: "livemcp", version: "1.3.0" },
  {
    instructions: `
You control the user's real Chrome browser via the LiveMCP bridge extension.

## Core workflow
1. Always call get_page_snapshot before acting on an unfamiliar page — it gives you a screenshot AND the full list of interactive elements with their CSS selectors in one round-trip.
2. Use navigate_and_wait instead of navigate_to — it blocks until the page is loaded so you don't need a follow-up read.
3. Use click_and_wait instead of click_element when the click causes navigation or a modal to appear.
4. Use fill_form with submit:true to fill AND submit a form in a single call.

## Tab targeting
Always prefer tabUrl or tabTitle over tabId — numeric IDs change when new tabs open.
- tabUrl: "github.com" matches the first tab whose URL contains "github.com"
- tabTitle: "Dashboard" matches the first tab whose title contains "Dashboard"
- If neither is given, the currently active tab is used.

## Reading page content
- Default to format:"aria" for get_page_content — it returns a compact accessibility tree (roles, names, selectors) that is 10-20x smaller than HTML and easier to parse.
- Use selector to scope to a specific section: get_page_content selector="#main" avoids noise from nav/footer.
- Use format:"text" for reading article/prose content. Use format:"html" only when you need raw markup.

## Tool selection guide
- To understand a new page → get_page_snapshot
- To read a specific section → get_page_content selector=".results" format="aria"
- To fill and submit a form → fill_form fields=[...] submit:true
- To click something that opens a new page → click_and_wait waitForNavigation:true
- To click something that shows a dialog/dropdown → click_and_wait waitFor:".dialog-selector"
- To check what tabs are open → list_tabs

## Constraints
- Tools fail if the extension is not connected. If a tool returns "extension not connected", ask the user to click Connect in the LiveMCP popup.
- chrome:// pages, the Chrome Web Store, and PDF viewer tabs block script injection — use a normal https:// page.
- Network and console capture use chrome.debugger — only one debugger per tab. Close DevTools first if capture fails.
`.trim(),
  },
);

registerAllTools(mcp, bridge);

const transport = new StdioServerTransport();
await mcp.connect(transport);
