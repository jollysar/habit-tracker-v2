import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
  ) as Record<string, unknown>;
}

describe("production security configuration", () => {
  it("ships a restrictive CSP and prototype hardening", () => {
    const config = readJson("../../../src-tauri/tauri.conf.json") as {
      app: { security: { csp: string; freezePrototype: boolean } };
    };

    expect(config.app.security.csp).toContain("default-src 'self'");
    expect(config.app.security.csp).toContain("object-src 'none'");
    expect(config.app.security.csp).toContain("frame-src 'none'");
    expect(config.app.security.csp).not.toContain("unsafe-eval");
    expect(config.app.security.freezePrototype).toBe(true);
  });

  it("grants the local main window only the SQL and notification commands it uses", () => {
    const capability = readJson("../../../src-tauri/capabilities/default.json") as {
      local: boolean;
      remote?: unknown;
      windows: string[];
      permissions: string[];
    };

    expect(capability.local).toBe(true);
    expect(capability.remote).toBeUndefined();
    expect(capability.windows).toEqual(["main"]);
    expect(capability.permissions).toEqual([
      "sql:allow-load",
      "sql:allow-select",
      "sql:allow-execute",
      "notification:default",
    ]);
  });
});
