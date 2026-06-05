import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type McpAppResourceInput = {
  appId: string;
  appTitle: string;
  appDescription: string;
  htmlContent?: string;
  readAsset?: (assetPath: string) => Uint8Array | null;
  connectDomains?: string[];
};

export type McpAppResourcePayload = {
  title: string;
  description: string;
  mimeType: string;
  contents: Array<
    | {
        uri: string;
        mimeType: string;
        text: string;
        _meta: {
          ui: {
            resourceUri: string;
            prefersBorder: boolean;
            csp: {
              connectDomains: string[];
              resourceDomains: string[];
            };
          };
          "openai/widgetDescription": string;
          "openai/widgetPrefersBorder": boolean;
          "openai/outputTemplate": string;
        };
      }
    | {
        uri: string;
        mimeType: string;
        blob: string;
        _meta: {
          ui: {
            resourceUri: string;
            prefersBorder: boolean;
            csp: {
              connectDomains: string[];
              resourceDomains: string[];
            };
          };
          "openai/widgetDescription": string;
          "openai/widgetPrefersBorder": boolean;
          "openai/outputTemplate": string;
        };
      }
  >;
};

function detectMimeType(assetPath: string): string {
  if (assetPath.endsWith(".js")) return "application/javascript";
  if (assetPath.endsWith(".css")) return "text/css";
  if (assetPath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function injectMetadata(html: string, appId: string): string {
  const withTitle = html.includes("<title>")
    ? html.replace(/<title>(.*?)<\/title>/, `<title>$1 - ${appId}</title>`)
    : html;

  if (withTitle.includes('meta name="app-id"')) {
    return withTitle;
  }

  if (withTitle.includes("<head>")) {
    return withTitle.replace(
      "<head>",
      `<head>\n    <meta name="app-id" content="${appId}" />`,
    );
  }

  return withTitle.replace(
    /<meta name="viewport"/,
    `<meta name="app-id" content="${appId}" />\n    <meta name="viewport"`,
  );
}

function buildFallbackHtml(appTitle: string): string {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appTitle}</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
}

export function buildMcpAppResourcePayload(input: McpAppResourceInput): McpAppResourcePayload {
  const html = injectMetadata(input.htmlContent ?? buildFallbackHtml(input.appTitle), input.appId);
  const resourceUri = `ui://tableau-mcp/${input.appId}.html`;
  const contents: McpAppResourcePayload["contents"] = [
    {
      uri: resourceUri,
      mimeType: "text/html;profile=mcp-app",
      text: html,
      _meta: {
        ui: {
          resourceUri,
          prefersBorder: true,
          csp: {
            connectDomains: input.connectDomains ?? [],
            resourceDomains: [],
          },
        },
        "openai/widgetDescription": input.appDescription,
        "openai/widgetPrefersBorder": true,
        "openai/outputTemplate": resourceUri,
      },
    },
  ];

  const assetMatches = html.matchAll(/(?:src|href)=["']([^"']+)["']/g);
  for (const match of assetMatches) {
    const assetPath = match[1] ?? "";
    if (!assetPath.startsWith("/assets/")) continue;

    const assetContent = input.readAsset?.(assetPath);
    if (!assetContent) continue;

    contents.push({
      uri: `ui://tableau-mcp${assetPath}`,
      mimeType: detectMimeType(assetPath),
      blob: Buffer.from(assetContent).toString("base64"),
      _meta: {
        ui: {
          resourceUri: `ui://tableau-mcp${assetPath}`,
          prefersBorder: true,
          csp: {
            connectDomains: input.connectDomains ?? [],
            resourceDomains: [],
          },
        },
        "openai/widgetDescription": input.appDescription,
        "openai/widgetPrefersBorder": true,
        "openai/outputTemplate": resourceUri,
      },
    });
  }

  return {
    title: input.appTitle,
    description: input.appDescription,
    mimeType: "text/html;profile=mcp-app",
    contents,
  };
}

export function resolveMcpAppHtml(): string {
  const distIndex = join(process.cwd(), "apps/mcp-app/dist/index.html");
  if (existsSync(distIndex)) {
    return readFileSync(distIndex, "utf8");
  }

  return buildFallbackHtml("Tableau MCP App");
}

export function resolveMcpAppAsset(assetPath: string): Uint8Array | null {
  const assetFile = join(process.cwd(), "apps/mcp-app/dist", assetPath.replace(/^\//, ""));
  if (!existsSync(assetFile)) return null;
  return readFileSync(assetFile);
}
