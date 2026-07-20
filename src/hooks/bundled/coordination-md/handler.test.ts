import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../../config/config.js";
import { makeTempWorkspace, writeWorkspaceFile } from "../../../test-helpers/workspace.js";
import {
  type AgentBootstrapHookContext,
  createInternalHookEvent as createHookEvent,
} from "../../internal-hooks.js";
import handler from "./handler.js";

function createCoordinationConfig(enabled = true): OpenClawConfig {
  return {
    hooks: {
      internal: {
        entries: {
          "coordination-md": { enabled },
        },
      },
    },
  };
}

async function createBootstrapContext(params: {
  workspaceDir: string;
  cfg: OpenClawConfig;
  sessionKey: string;
  rootFiles: Array<{ name: string; content: string }>;
}): Promise<AgentBootstrapHookContext> {
  const bootstrapFiles = (await Promise.all(
    params.rootFiles.map(async (file) => ({
      name: file.name,
      path: await writeWorkspaceFile({
        dir: params.workspaceDir,
        name: file.name,
        content: file.content,
      }),
      content: file.content,
      missing: false,
    })),
  )) as AgentBootstrapHookContext["bootstrapFiles"];
  return {
    workspaceDir: params.workspaceDir,
    bootstrapFiles,
    cfg: params.cfg,
    sessionKey: params.sessionKey,
  };
}

function isCoordinationFile(file: AgentBootstrapHookContext["bootstrapFiles"][number]): boolean {
  return path.basename(file.path) === "COORDINATION.md";
}

async function runHookForSession(sessionKey: string) {
  const tempDir = await makeTempWorkspace("openclaw-coordination-md-");
  await fs.writeFile(path.join(tempDir, "COORDINATION.md"), "shared plan", "utf-8");
  const context = await createBootstrapContext({
    workspaceDir: tempDir,
    cfg: createCoordinationConfig(),
    sessionKey,
    rootFiles: [{ name: "AGENTS.md", content: "root agents" }],
  });

  const event = createHookEvent("agent", "bootstrap", sessionKey, context);
  await handler(event);
  return context;
}

describe("coordination-md hook", () => {
  it.each(["agent:codex:main", "agent:codex:discord:channel:123"])(
    "injects COORDINATION.md for top-level agent session %s",
    async (sessionKey) => {
      const context = await runHookForSession(sessionKey);

      const injected = context.bootstrapFiles.find(isCoordinationFile);
      expect(injected?.content).toBe("shared plan");
    },
  );

  it("does nothing when disabled", async () => {
    const tempDir = await makeTempWorkspace("openclaw-coordination-md-disabled-");
    await fs.writeFile(path.join(tempDir, "COORDINATION.md"), "shared plan", "utf-8");
    const context = await createBootstrapContext({
      workspaceDir: tempDir,
      cfg: createCoordinationConfig(false),
      sessionKey: "agent:codex:discord:channel:123",
      rootFiles: [{ name: "AGENTS.md", content: "root agents" }],
    });

    const event = createHookEvent("agent", "bootstrap", "agent:codex:discord:channel:123", context);
    await handler(event);

    expect(context.bootstrapFiles.some(isCoordinationFile)).toBe(false);
  });

  it.each([
    ["subagent", "agent:codex:subagent:abc"],
    ["acp worker", "agent:codex:acp:claude:session:abc"],
    ["cron worker", "agent:codex:cron:job-id:run:run-id"],
    ["legacy/unknown", "legacy-session-key"],
    ["parseable unknown agent", "agent:codex:unknown:abc"],
    ["delivery-shaped unknown agent", "agent:main:unknown:group:legacy-room"],
  ])("does not inject COORDINATION.md for %s sessions", async (_name, sessionKey) => {
    const context = await runHookForSession(sessionKey);

    expect(context.bootstrapFiles.some(isCoordinationFile)).toBe(false);
  });

  it("skips oversized COORDINATION.md files", async () => {
    const tempDir = await makeTempWorkspace("openclaw-coordination-md-oversize-");
    await fs.writeFile(path.join(tempDir, "COORDINATION.md"), "x".repeat(2 * 1024 * 1024 + 1));
    const context = await createBootstrapContext({
      workspaceDir: tempDir,
      cfg: createCoordinationConfig(),
      sessionKey: "agent:codex:discord:channel:123",
      rootFiles: [{ name: "AGENTS.md", content: "root agents" }],
    });

    const event = createHookEvent("agent", "bootstrap", "agent:codex:discord:channel:123", context);
    await handler(event);

    expect(context.bootstrapFiles.some(isCoordinationFile)).toBe(false);
  });

  it("skips COORDINATION.md when a symlink escapes the workspace", async () => {
    const tempDir = await makeTempWorkspace("openclaw-coordination-md-symlink-");
    const outsideDir = await makeTempWorkspace("openclaw-coordination-md-outside-");
    const outsideFile = path.join(outsideDir, "COORDINATION.md");
    await fs.writeFile(outsideFile, "outside plan", "utf-8");
    await fs.symlink(outsideFile, path.join(tempDir, "COORDINATION.md"));
    const context = await createBootstrapContext({
      workspaceDir: tempDir,
      cfg: createCoordinationConfig(),
      sessionKey: "agent:codex:discord:channel:123",
      rootFiles: [{ name: "AGENTS.md", content: "root agents" }],
    });

    const event = createHookEvent("agent", "bootstrap", "agent:codex:discord:channel:123", context);
    await handler(event);

    expect(context.bootstrapFiles.some(isCoordinationFile)).toBe(false);
  });

  it("deduplicates an already injected COORDINATION.md", async () => {
    const tempDir = await makeTempWorkspace("openclaw-coordination-md-dedupe-");
    const coordinationPath = path.join(tempDir, "COORDINATION.md");
    await fs.writeFile(coordinationPath, "shared plan", "utf-8");
    const context = await createBootstrapContext({
      workspaceDir: tempDir,
      cfg: createCoordinationConfig(),
      sessionKey: "agent:codex:discord:channel:123",
      rootFiles: [{ name: "AGENTS.md", content: "root agents" }],
    });
    context.bootstrapFiles.push({
      name: "COORDINATION.md" as AgentBootstrapHookContext["bootstrapFiles"][number]["name"],
      path: await fs.realpath(coordinationPath),
      content: "shared plan",
      missing: false,
    });

    const event = createHookEvent("agent", "bootstrap", "agent:codex:discord:channel:123", context);
    await handler(event);

    expect(context.bootstrapFiles.filter(isCoordinationFile)).toHaveLength(1);
  });
});
