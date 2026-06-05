import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, rmSync, cpSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { arch, homedir, platform } from "node:os";
import { createInterface } from "node:readline";
import { buildStartPlan } from "../src/runtime/start-plan";

const C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
};

function color(value: string, code: string): string {
  return `${code}${value}${C.reset}`;
}

function log(prefix: string, message: string, code = C.reset): void {
  console.error(`${code}${prefix}${C.reset} ${message}`);
}

function waitForHealth(url: string, timeoutMs = 15_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout esperando ${url}`));
        return;
      }

      fetch(url)
        .then((response) => {
          if (response.ok) {
            resolve();
            return;
          }
          setTimeout(tick, 250);
        })
        .catch(() => setTimeout(tick, 250));
    };

    tick();
  });
}

function clearPort(port: number): void {
  if (process.platform === "win32") return;

  const result = spawnSync("lsof", ["-ti", `tcp:${port}`], { encoding: "utf8" });
  const pids = String(result.stdout ?? "")
    .trim()
    .split("\n")
    .filter(Boolean);

  for (const pid of pids) {
    log("•", `Puerto ${port} ocupado por PID ${pid} — cerrando proceso previo...`, C.yellow);
    spawnSync("kill", ["-9", pid], { stdio: "ignore" });
  }
}

const IS_WIN = platform() === "win32";
const CONTROL_PLANE_API_KEY_VAR = "CONTROL_PLANE_API_KEY";
const TUNNEL_DIR = join(homedir(), ".tableau-mcp", "bin");
const TUNNEL_BIN = join(TUNNEL_DIR, IS_WIN ? "tunnel-client.exe" : "tunnel-client");
const TUNNEL_CONFIG = IS_WIN
  ? join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "tunnel-client")
  : join(homedir(), ".config", "tunnel-client");
const TUNNEL_PROFILE = join(TUNNEL_CONFIG, "tableau.yaml");

type TunnelOS = { label: string; archSuffix: string };

function detectTunnelOS(): TunnelOS {
  const p = platform();
  const a = arch();
  if (p === "darwin") return { label: `macOS (${a === "arm64" ? "Apple Silicon" : "Intel"})`, archSuffix: a === "arm64" ? "darwin-arm64" : "darwin-amd64" };
  if (p === "win32") return { label: "Windows", archSuffix: "windows-amd64" };
  if (p === "linux") return { label: "Linux", archSuffix: "linux-amd64" };
  throw new Error(`SO no soportado para tunnel: ${p}`);
}

async function getLatestTunnelReleaseTag(): Promise<string> {
  const response = await fetch("https://api.github.com/repos/openai/tunnel-client/releases/latest", {
    headers: { "User-Agent": "tableau-mcp/1.0" },
  });
  if (!response.ok) {
    throw new Error(`No se pudo consultar la última versión del tunnel-client: HTTP ${response.status}`);
  }
  const data = await response.json() as { tag_name?: string };
  if (!data.tag_name) throw new Error("No se pudo determinar la versión del tunnel-client");
  return data.tag_name;
}

async function ensureTunnelClient(os: TunnelOS): Promise<void> {
  if (existsSync(TUNNEL_BIN)) return;

  log("•", `Descargando tunnel-client para ${os.label}...`, C.cyan);
  const tag = await getLatestTunnelReleaseTag();
  const zipName = `tunnel-client-${tag}-${os.archSuffix}.zip`;
  const url = `https://github.com/openai/tunnel-client/releases/download/${tag}/${zipName}`;

  mkdirSync(TUNNEL_DIR, { recursive: true });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error descargando tunnel-client: HTTP ${response.status}`);
  }

  const zipPath = join(TUNNEL_DIR, zipName);
  Bun.write(zipPath, await response.arrayBuffer());
  const extractDir = join(TUNNEL_DIR, "extract");
  mkdirSync(extractDir, { recursive: true });

  if (IS_WIN) {
    const result = spawnSync("powershell", ["-Command", `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`], { stdio: "pipe", timeout: 30000 });
    if (result.status !== 0) throw new Error(`No se pudo extraer tunnel-client: ${result.stderr?.toString() || result.error?.message}`);
  } else {
    const result = spawnSync("unzip", ["-o", zipPath, "-d", extractDir], { stdio: "pipe", timeout: 30000 });
    if (result.status !== 0) throw new Error(`No se pudo extraer tunnel-client: ${result.stderr?.toString() || result.error?.message}`);
  }

  const candidates = IS_WIN
    ? [join(extractDir, "tunnel-client.exe"), join(extractDir, "tunnel-client")]
    : [join(extractDir, "tunnel-client")];
  const binary = candidates.find((candidate) => existsSync(candidate));
  if (!binary) throw new Error(`No se encontró tunnel-client en ${zipName}`);

  cpSync(binary, TUNNEL_BIN);
  if (!IS_WIN) {
    spawnSync("chmod", ["+x", TUNNEL_BIN], { stdio: "ignore" });
  }

  try {
    rmSync(extractDir, { recursive: true, force: true });
    rmSync(zipPath, { force: true });
  } catch {}
}

function readEnvFileValue(key: string): string | null {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return null;
  const content = readFileSync(envPath, "utf8");
  const line = content.split("\n").find((entry) => entry.startsWith(`${key}=`));
  if (!line) return null;
  return line.slice(key.length + 1).replace(/^"|"$/g, "");
}

function appendEnvFileValue(key: string, value: string): void {
  const envPath = join(process.cwd(), ".env.local");
  appendFileSync(envPath, `\n${key}="${value}"\n`);
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return await new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function ensureTunnelCredentials(): Promise<{ apiKey: string; tunnelId: string } | null> {
  let apiKey = process.env[CONTROL_PLANE_API_KEY_VAR] || readEnvFileValue(CONTROL_PLANE_API_KEY_VAR);
  let tunnelId = process.env.TABLEAU_MCP_TUNNEL_ID || readEnvFileValue("TABLEAU_MCP_TUNNEL_ID");

  if (!apiKey) {
    if (!process.stdin.isTTY) return null;
    apiKey = await prompt(`Ingresa tu ${CONTROL_PLANE_API_KEY_VAR} de OpenAI (sk-...): `);
    if (apiKey) appendEnvFileValue(CONTROL_PLANE_API_KEY_VAR, apiKey);
  }

  if (!tunnelId) {
    if (!process.stdin.isTTY) return null;
    tunnelId = await prompt("Ingresa tu Tunnel ID: ");
    if (tunnelId) appendEnvFileValue("TABLEAU_MCP_TUNNEL_ID", tunnelId);
  }

  if (!apiKey || !tunnelId) return null;
  return { apiKey, tunnelId };
}

async function ensureTunnelProfile(tunnelId: string, mcpUrl: string): Promise<void> {
  if (existsSync(TUNNEL_PROFILE)) return;

  mkdirSync(TUNNEL_CONFIG, { recursive: true });
  const result = Bun.spawnSync({
    cmd: [TUNNEL_BIN, "init", "--sample", "sample_mcp_remote_no_auth", "--profile", "tableau", "--tunnel-id", tunnelId, "--mcp-server-url", mcpUrl],
    env: { ...process.env },
    stdout: "inherit",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    throw new Error(`tunnel-client init falló: ${result.stderr?.toString()}`);
  }
}

function processTunnelOutput(stream: NodeJS.ReadableStream | null): void {
  if (!stream) return;
  const rl = createInterface({ input: stream as unknown as NodeJS.ReadableStream });
  rl.on("line", (line: string) => {
    const text = line.trim();
    if (text) console.error(`  ${color("│", C.magenta)} ${text}`);
  });
}

function spawnTunnelProcess(): ReturnType<typeof spawn> | null {
  if (!existsSync(TUNNEL_BIN)) return null;

  return spawn(TUNNEL_BIN, ["run", "--profile", "tableau"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
}

async function main() {
  const plan = buildStartPlan(process.env);
  const rootDir = process.cwd();
  const mcpAppDir = join(rootDir, "apps/mcp-app");
  const tableauExtensionDir = join(rootDir, "apps/tableau-extension");

  console.error(`\n  ${color("Tableau MCP", C.bold)} ${color("— Inicio automatizado", C.cyan)}\n`);
  log("•", `Bridge local: ${plan.bridgeHost}:${plan.bridgePort}`, C.cyan);
  log("•", `Health: ${plan.healthUrl}`, C.cyan);

  if (process.platform !== "win32") {
    clearPort(plan.bridgePort);
  }

  const server = spawn(plan.serverCommand[0], plan.serverCommand.slice(1), {
    env: {
      ...process.env,
      TABLEAU_MCP_MODE: "http",
      TABLEAU_MCP_BRIDGE_PORT: String(plan.bridgePort),
      TABLEAU_MCP_HOST: plan.bridgeHost,
    },
    stdio: ["ignore", "inherit", "pipe"],
  });

  const uiApps: Array<{ name: string; port: number; cwd: string; process: ReturnType<typeof spawn> }> = [];
  if (existsSync(mcpAppDir)) {
    uiApps.push({
      name: "MCP App",
      port: 5173,
      cwd: mcpAppDir,
      process: spawn("bun", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"], {
        cwd: mcpAppDir,
        env: { ...process.env },
        stdio: ["ignore", "inherit", "pipe"],
      }),
    });
  }
  if (existsSync(tableauExtensionDir)) {
    uiApps.push({
      name: "Tableau Extension",
      port: 5174,
      cwd: tableauExtensionDir,
      process: spawn("bun", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5174"], {
        cwd: tableauExtensionDir,
        env: { ...process.env },
        stdio: ["ignore", "inherit", "pipe"],
      }),
    });
  }

  server.stderr.setEncoding("utf8");
  server.stderr.on("data", (chunk: string) => {
    const text = chunk.trim();
    if (text) {
      console.error(`  ${color("│", C.magenta)} ${text}`);
    }
  });

  for (const app of uiApps) {
    if (app.process.stderr) {
      app.process.stderr.setEncoding("utf8");
      app.process.stderr.on("data", (chunk: string) => {
        const text = chunk.trim();
        if (text) {
          console.error(`  ${color("│", C.magenta)} [${app.name}] ${text}`);
        }
      });
    }
  }

  server.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      log("✖", `El servidor terminó con código ${code}`, C.yellow);
      process.exit(code ?? 1);
    }
  });

  for (const app of uiApps) {
    app.process.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        log("✖", `${app.name} terminó con código ${code}`, C.yellow);
      }
    });
  }

  try {
    log("•", "Esperando al servidor MCP local...", C.cyan);
    await waitForHealth(plan.healthUrl);
    log("✓", `Servidor listo en ${plan.healthUrl}`, C.green);
  } catch (error) {
    log("⚠", error instanceof Error ? error.message : "No respondió el healthcheck", C.yellow);
  }

  for (const app of uiApps) {
    const url = `http://127.0.0.1:${app.port}`;
    try {
      log("•", `Esperando ${app.name} en ${url}...`, C.cyan);
      await waitForHealth(url);
      log("✓", `${app.name} listo en ${url}`, C.green);
    } catch (error) {
      log("⚠", error instanceof Error ? error.message : `No respondió ${app.name}`, C.yellow);
    }
  }

  let tunnel: ReturnType<typeof spawn> | null = null;
  const tunnelCredentials = await ensureTunnelCredentials();
  if (tunnelCredentials) {
    try {
      const os = detectTunnelOS();
      await ensureTunnelClient(os);
      const tunnelUrl = `${plan.healthUrl.replace("/healthz", "")}/mcp`;
      process.env[CONTROL_PLANE_API_KEY_VAR] = tunnelCredentials.apiKey;
      await ensureTunnelProfile(tunnelCredentials.tunnelId, tunnelUrl);

      log("•", "Iniciando tunnel-client...", C.cyan);
      tunnel = spawnTunnelProcess();
      if (tunnel) {
        if (tunnel.stdout) processTunnelOutput(tunnel.stdout);
        if (tunnel.stderr) processTunnelOutput(tunnel.stderr);
        tunnel.on("exit", (code) => {
          if (code !== 0 && code !== null) {
            log("✖", `tunnel-client terminó con código ${code}`, C.yellow);
          }
        });
      }
    } catch (error) {
      log("⚠", error instanceof Error ? error.message : "No se pudo iniciar el túnel", C.yellow);
    }
  } else {
    log("•", "Tunnel omitido: faltan credenciales o no hay TTY", C.yellow);
  }

  function cleanup() {
    log("•", "Cerrando servidor...", C.cyan);
    server.kill("SIGTERM");
    for (const app of uiApps) {
      app.process.kill("SIGTERM");
    }
    if (tunnel) {
      tunnel.kill("SIGTERM");
    }
    setTimeout(() => {
      try {
        server.kill("SIGKILL");
        for (const app of uiApps) {
          try {
            app.process.kill("SIGKILL");
          } catch {}
        }
        try {
          tunnel?.kill("SIGKILL");
        } catch {}
      } catch {}
      process.exit(0);
    }, 2000);
  }

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

void main();
