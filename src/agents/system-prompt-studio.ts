// Resolves operator-authored Prompt Studio v2 config into prompt contributions.
import type { OpenClawPromptOverlayConfig } from "../config/types.agent-defaults.js";
import type { ProviderSystemPromptContribution } from "./system-prompt-contribution.js";

function trimNonEmpty(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function joinPromptBlocks(blocks: Array<string | undefined>): string | undefined {
  const normalized = blocks.map(trimNonEmpty).filter((entry): entry is string => Boolean(entry));
  return normalized.length > 0 ? normalized.join("\n\n") : undefined;
}

/** Convert safe Prompt Studio v2 config into the shared system-prompt contribution shape. */
export function resolveSystemPromptStudioContribution(
  config?: OpenClawPromptOverlayConfig,
): ProviderSystemPromptContribution | undefined {
  if (!config || config.enabled === false) {
    return undefined;
  }

  const customInstructions = trimNonEmpty(config.customInstructions);
  if (!customInstructions) {
    return undefined;
  }

  return {
    stablePrefix: ["## Custom Instructions", customInstructions].join("\n"),
  };
}

/** Merge provider/model-owned prompt contribution with operator Prompt Studio config. */
export function mergeSystemPromptContributions(params: {
  base?: ProviderSystemPromptContribution;
  studio?: ProviderSystemPromptContribution;
}): ProviderSystemPromptContribution | undefined {
  const stablePrefix = joinPromptBlocks([params.base?.stablePrefix, params.studio?.stablePrefix]);
  const dynamicSuffix = joinPromptBlocks([
    params.base?.dynamicSuffix,
    params.studio?.dynamicSuffix,
  ]);
  const sectionOverrides = {
    ...params.base?.sectionOverrides,
    ...params.studio?.sectionOverrides,
  } satisfies ProviderSystemPromptContribution["sectionOverrides"];

  if (!stablePrefix && !dynamicSuffix && Object.keys(sectionOverrides).length === 0) {
    return undefined;
  }

  return {
    ...(stablePrefix ? { stablePrefix } : {}),
    ...(dynamicSuffix ? { dynamicSuffix } : {}),
    ...(Object.keys(sectionOverrides).length > 0 ? { sectionOverrides } : {}),
  };
}
