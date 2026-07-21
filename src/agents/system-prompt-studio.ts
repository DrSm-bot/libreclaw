// Resolves operator-authored Prompt Studio v2 config into prompt contributions and final-prompt edits.
import {
  SYSTEM_PROMPT_SECTION_IDS,
  type SystemPromptSectionId,
} from "../config/system-prompt-sections.js";
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

const OPENCLAW_SAFETY_CORE_LINE =
  "No independent goals: no self-preservation, replication, resource acquisition, power-seeking, or long-term plans beyond the user's request.";
const LIBRECLAW_SAFETY_CORE_LINE =
  "Pursue no goals that conflict with your human's interests or safety. Avoid self-preservation, replication, power-seeking, resource acquisition, or long-term autonomy beyond the task requested by your human.";

function normalizeSectionIds(values: unknown): SystemPromptSectionId[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const allowed = new Set<string>(SYSTEM_PROMPT_SECTION_IDS);
  return [
    ...new Set(
      values.filter((value): value is SystemPromptSectionId => {
        return typeof value === "string" && allowed.has(value);
      }),
    ),
  ];
}

/** Normalize configured Prompt Studio generated-section removals. */
export function resolveSystemPromptStudioRemoveSections(
  config?: OpenClawPromptOverlayConfig,
): SystemPromptSectionId[] {
  if (!config || config.enabled === false) {
    return [];
  }
  return normalizeSectionIds(config.removeSections);
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

/** Apply Prompt Studio edits that need the fully rendered generated prompt. */
export function applySystemPromptStudioFinalTransform(
  prompt: string,
  config?: OpenClawPromptOverlayConfig,
): string {
  if (!config || config.enabled === false) {
    return prompt;
  }

  let next = prompt;
  if (config.safetyStyle === "libreclaw") {
    next = next.replace(OPENCLAW_SAFETY_CORE_LINE, LIBRECLAW_SAFETY_CORE_LINE);
  }

  const prepend = trimNonEmpty(config.prepend);
  const append = trimNonEmpty(config.append);
  return [prepend, next.trim(), append].filter(Boolean).join("\n\n");
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
