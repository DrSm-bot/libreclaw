/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationContext } from "../../app/context.ts";
import { i18n } from "../../i18n/index.ts";
import "./prompt-studio-page.ts";

type PromptStudioPageElement = HTMLElement & { updateComplete: Promise<boolean> };

type RuntimeConfigState = {
  connected: boolean;
  configLoading: boolean;
  configSaving: boolean;
  configApplying: boolean;
  configSnapshot: {
    hash: string;
    sourceConfig: Record<string, unknown>;
  } | null;
  configForm: Record<string, unknown> | null;
  lastError: string | null;
};

function createRuntimeConfig(sourceConfig: Record<string, unknown>) {
  const state: RuntimeConfigState = {
    connected: true,
    configLoading: false,
    configSaving: false,
    configApplying: false,
    configSnapshot: { hash: "config-hash", sourceConfig },
    configForm: sourceConfig,
    lastError: null,
  };
  const listeners = new Set<(state: RuntimeConfigState) => void>();
  return {
    state,
    ensureLoaded: vi.fn(async () => undefined),
    patchForm: vi.fn(),
    removeFormValue: vi.fn(),
    save: vi.fn(async () => true),
    apply: vi.fn(async () => true),
    refresh: vi.fn(async () => undefined),
    subscribe(listener: (state: RuntimeConfigState) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

async function mountPage(sourceConfig: Record<string, unknown>): Promise<{
  page: PromptStudioPageElement;
  runtimeConfig: ReturnType<typeof createRuntimeConfig>;
}> {
  const runtimeConfig = createRuntimeConfig(sourceConfig);
  const context = {
    basePath: "",
    runtimeConfig,
    navigate: vi.fn(),
    preload: vi.fn(async () => undefined),
  } as unknown as ApplicationContext;
  const page = document.createElement("openclaw-prompt-studio-page") as PromptStudioPageElement;
  (page as unknown as { context: ApplicationContext }).context = context;
  document.body.append(page);
  await page.updateComplete;
  return { page, runtimeConfig };
}

function openclawConfig(customInstructions = "Keep replies crisp.", enabled = true) {
  return {
    agents: {
      defaults: {
        promptOverlays: {
          openclaw: {
            enabled,
            customInstructions,
          },
        },
      },
    },
  };
}

describe("PromptStudioPage", () => {
  beforeEach(async () => {
    await i18n.setLocale("en");
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("renders the custom instructions editor and safe section preview", async () => {
    const { page } = await mountPage(openclawConfig("Keep replies crisp."));

    expect(page.querySelector(".page-title")?.textContent).toBe("Prompt Studio");
    expect(page.querySelector<HTMLTextAreaElement>(".prompt-studio-editor")?.value).toBe(
      "Keep replies crisp.",
    );
    expect(page.textContent).toContain(
      "agents.defaults.promptOverlays.openclaw.customInstructions",
    );
    expect(page.querySelector(".prompt-studio-preview")?.textContent).toBe(
      "## Custom Instructions\nKeep replies crisp.",
    );
    expect(page.querySelector<HTMLInputElement>(".prompt-studio-toggle")?.checked).toBe(true);
  });

  it("edits only the customInstructions config path", async () => {
    const { page, runtimeConfig } = await mountPage(openclawConfig());
    const editor = page.querySelector<HTMLTextAreaElement>(".prompt-studio-editor");
    if (!editor) {
      throw new Error("Prompt Studio editor not rendered");
    }

    editor.value = "Prefer source-backed answers.";
    editor.dispatchEvent(new Event("input", { bubbles: true, composed: true }));

    expect(runtimeConfig.patchForm).toHaveBeenCalledWith(
      ["agents", "defaults", "promptOverlays", "openclaw", "customInstructions"],
      "Prefer source-backed answers.",
    );
  });

  it("toggles the openclaw overlay without deleting the text", async () => {
    const { page, runtimeConfig } = await mountPage(openclawConfig("Keep text.", true));
    const toggle = page.querySelector<HTMLInputElement>(".prompt-studio-toggle");
    if (!toggle) {
      throw new Error("Prompt Studio toggle not rendered");
    }

    toggle.checked = false;
    toggle.dispatchEvent(new Event("change", { bubbles: true, composed: true }));

    expect(runtimeConfig.patchForm).toHaveBeenCalledWith(
      ["agents", "defaults", "promptOverlays", "openclaw", "enabled"],
      false,
    );
    expect(runtimeConfig.removeFormValue).not.toHaveBeenCalled();
  });

  it("offers clear, save, apply, and reload controls through runtime config", async () => {
    const { page, runtimeConfig } = await mountPage(openclawConfig());
    const clearButton = [...page.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
      button.textContent?.includes("Clear text"),
    );
    clearButton?.click();
    expect(runtimeConfig.removeFormValue).toHaveBeenCalledWith([
      "agents",
      "defaults",
      "promptOverlays",
      "openclaw",
      "customInstructions",
    ]);

    const saveButton = [...page.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
      button.textContent?.includes("Save"),
    );
    saveButton?.click();
    await vi.waitFor(() => expect(runtimeConfig.save).toHaveBeenCalledOnce());

    const applyButton = [...page.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
      button.textContent?.includes("Apply & restart"),
    );
    applyButton?.click();
    await vi.waitFor(() => expect(runtimeConfig.apply).toHaveBeenCalledOnce());

    const reloadButton = [...page.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
      button.textContent?.includes("Reload"),
    );
    reloadButton?.click();
    await vi.waitFor(() =>
      expect(runtimeConfig.refresh).toHaveBeenCalledWith({ discardPendingChanges: true }),
    );
  });
});
