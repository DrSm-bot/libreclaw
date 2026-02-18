import { describe, expect, it } from "vitest";
import { buildAgentSystemPrompt } from "./system-prompt.js";

describe("system prompt customization composition", () => {
  it("composes prepend + generated + append in default mode", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/openclaw",
      systemPromptConfig: {
        mode: "default",
        prepend: "PREPEND_BLOCK",
        append: "APPEND_BLOCK",
      },
    });

    const prependIndex = prompt.indexOf("PREPEND_BLOCK");
    const toolingIndex = prompt.indexOf("## Tooling");
    const appendIndex = prompt.indexOf("APPEND_BLOCK");

    expect(prependIndex).toBeGreaterThanOrEqual(0);
    expect(toolingIndex).toBeGreaterThanOrEqual(0);
    expect(appendIndex).toBeGreaterThanOrEqual(0);
    expect(prependIndex).toBeLessThan(toolingIndex);
    expect(toolingIndex).toBeLessThan(appendIndex);
  });

  it("removes configured sections from generated prompt", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/openclaw",
      systemPromptConfig: {
        mode: "default",
        removeSections: ["documentation", "model_aliases"],
      },
      docsPath: "/tmp/openclaw/docs",
      modelAliasLines: ["- Demo: provider/model"],
    });

    expect(prompt).not.toContain("## Documentation");
    expect(prompt).not.toContain("## Model Aliases");
    expect(prompt).toContain("## Tooling");
    expect(prompt).toContain("## Runtime");
  });

  it("uses replace mode only when unsafe replace is allowed", () => {
    const replaced = buildAgentSystemPrompt({
      workspaceDir: "/tmp/openclaw",
      systemPromptConfig: {
        mode: "replace",
        allowUnsafeReplace: true,
        prepend: "REPLACE_ONLY",
      },
    });
    expect(replaced).toBe("REPLACE_ONLY");

    const fallback = buildAgentSystemPrompt({
      workspaceDir: "/tmp/openclaw",
      systemPromptConfig: {
        mode: "replace",
        allowUnsafeReplace: false,
        prepend: "IGNORED",
      },
    });
    expect(fallback).toContain("## Tooling");
    expect(fallback).toContain("## Runtime");
  });

  it("removes level-1 sections without being interrupted by nested headings", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/openclaw",
      contextFiles: [
        {
          path: "/tmp/openclaw/NOTE.md",
          content: "## Nested Header\nThis should also be removed with project context.",
        },
      ],
      systemPromptConfig: {
        mode: "default",
        removeSections: ["project_context"],
      },
    });

    expect(prompt).not.toContain("# Project Context");
    expect(prompt).not.toContain("## /tmp/openclaw/NOTE.md");
    expect(prompt).not.toContain("## Nested Header");
    expect(prompt).toContain("## Silent Replies");
    expect(prompt).toContain("## Heartbeats");
    expect(prompt).toContain("## Runtime");
  });

  it("uses LibreClaw safety style by default", () => {
    const prompt = buildAgentSystemPrompt({ workspaceDir: "/tmp/openclaw" });
    expect(prompt).toContain("Pursue no goals that conflict with your human's interests or safety");
    expect(prompt).not.toContain("You have no independent goals:");
  });

  it("switches to OpenClaw safety style when configured", () => {
    const prompt = buildAgentSystemPrompt({
      workspaceDir: "/tmp/openclaw",
      systemPromptConfig: { safetyStyle: "openclaw" },
    });
    expect(prompt).toContain("You have no independent goals:");
  });
});
