import { describe, expect, test } from "bun:test";
import { buildStartPlan } from "../../src/runtime/start-plan";

describe("buildStartPlan", () => {
  test("usa un puerto distinto al de Talend y expone el health endpoint", () => {
    const plan = buildStartPlan({});

    expect(plan.bridgePort).toBe(3937);
    expect(plan.healthUrl).toBe("http://127.0.0.1:3937/healthz");
    expect(plan.serverCommand).toEqual(["bun", "run", "src/index.ts"]);
  });

  test("permite sobrescribir el puerto por entorno", () => {
    const plan = buildStartPlan({ TABLEAU_MCP_BRIDGE_PORT: "3999" });

    expect(plan.bridgePort).toBe(3999);
    expect(plan.healthUrl).toBe("http://127.0.0.1:3999/healthz");
  });
});
