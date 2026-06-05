import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { buildTableauMcpManifest } from "../shared/manifest";
import { handleBridgeRequest } from "./bridge-router";
import type { BridgeState } from "./bridge-state";

export type BridgeHttpServerOptions = {
  bridge: BridgeState;
  host?: string;
  port?: number;
  mcpPath?: string;
  handleMcpRequest?: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};

export type BridgeHttpServerHandle = {
  url: string;
  close(): Promise<void>;
};

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return true;
  const manifest = buildTableauMcpManifest();
  return manifest.allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin.endsWith(":*")) {
      return origin.startsWith(allowedOrigin.slice(0, -1));
    }
    return allowedOrigin === origin;
  });
}

async function readBody(req: IncomingMessage): Promise<string> {
  return await new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export async function startBridgeHttpServer(options: BridgeHttpServerOptions): Promise<BridgeHttpServerHandle> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4321;
  const mcpPath = options.mcpPath ?? "/mcp";

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": req.headers.origin ?? "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      });
      res.end();
      return;
    }

    if (!isAllowedOrigin(req.headers.origin)) {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "origin_denied" }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(buildTableauMcpManifest()));
      return;
    }

    if (url.pathname === mcpPath && options.handleMcpRequest) {
      await options.handleMcpRequest(req, res);
      return;
    }

    const body = req.method === "GET" ? "" : await readBody(req);
    const response = await handleBridgeRequest({
      method: req.method ?? "GET",
      path: url.pathname,
      body,
      bridge: options.bridge,
    });

    res.writeHead(response.status, {
      "content-type": "application/json",
      "access-control-allow-origin": req.headers.origin ?? "*",
    });
    res.end(JSON.stringify(response.json));
  });

  await new Promise<void>((resolve) => {
    server.listen(port, host, () => resolve());
  });

  return {
    url: `http://${host}:${port}`,
    close() {
      return new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
