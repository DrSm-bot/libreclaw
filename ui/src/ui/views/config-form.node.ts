import { html, nothing, type TemplateResult } from "lit";
import type { ConfigUiHints } from "../types.ts";
import {
  defaultValue,
  hintForPath,
  humanize,
  pathKey,
  schemaType,
  type JsonSchema,
} from "./config-form.shared.ts";

const META_KEYS = new Set(["title", "description", "default", "nullable"]);

const SYSTEM_PROMPT_SECTION_IDS_FALLBACK = [
  "tooling",
  "tool_call_style",
  "safety",
  "openclaw_cli_quick_reference",
  "skills",
  "memory_recall",
  "openclaw_self_update",
  "model_aliases",
  "workspace",
  "documentation",
  "sandbox",
  "user_identity",
  "current_date_time",
  "workspace_files_injected",
  "reply_tags",
  "messaging",
  "voice_tts",
  "group_chat_context",
  "subagent_context",
  "reactions",
  "reasoning_format",
  "project_context",
  "silent_replies",
  "heartbeats",
  "runtime",
] as const;

const SYSTEM_PROMPT_SECTION_DESCRIPTIONS_FALLBACK: Record<string, string> = {
  tooling: "Available tools and their usage constraints.",
  tool_call_style: "Guidelines for when and how to narrate tool calls.",
  safety: "Safety constraints and behavior boundaries.",
  openclaw_cli_quick_reference: "Valid OpenClaw CLI commands and usage notes.",
  skills: "Rules for selecting and loading skills.",
  memory_recall: "Memory search policy and citation behavior.",
  openclaw_self_update: "Restrictions for self-update and config apply operations.",
  model_aliases: "Model alias mappings when configured.",
  workspace: "Workspace path and file operation scope.",
  documentation: "Pointers to local and remote documentation.",
  sandbox: "Sandbox runtime constraints.",
  user_identity: "Context about the user identity and naming.",
  current_date_time: "Current timezone and date-time context.",
  workspace_files_injected: "Injected workspace files included in prompt context.",
  reply_tags: "Reply-tag behavior for native quote/reply surfaces.",
  messaging: "Messaging routing and tool usage rules.",
  voice_tts: "Voice and text-to-speech behavior.",
  group_chat_context: "Group chat metadata and participation guidance.",
  subagent_context: "Sub-agent orchestration context and guardrails.",
  reactions: "Reaction handling guidance.",
  reasoning_format: "Reasoning/verbosity format requirements.",
  project_context: "Injected project context and loaded files.",
  silent_replies: "When to respond with NO_REPLY.",
  heartbeats: "Heartbeat poll acknowledgment behavior.",
  runtime: "Runtime environment details.",
};

function isAnySchema(schema: JsonSchema): boolean {
  const keys = Object.keys(schema ?? {}).filter((key) => !META_KEYS.has(key));
  return keys.length === 0;
}

function jsonValue(value: unknown): string {
  if (value === undefined) {
    return "";
  }
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return "";
  }
}

// SVG Icons as template literals
const icons = {
  chevronDown: html`
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `,
  plus: html`
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  `,
  minus: html`
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  `,
  trash: html`
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  `,
  edit: html`
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  `,
};

export function renderNode(params: {
  schema: JsonSchema;
  value: unknown;
  path: Array<string | number>;
  hints: ConfigUiHints;
  unsupported: Set<string>;
  disabled: boolean;
  showLabel?: boolean;
  onPatch: (path: Array<string | number>, value: unknown) => void;
}): TemplateResult | typeof nothing {
  const { schema, value, path, hints, unsupported, disabled, onPatch } = params;
  const showLabel = params.showLabel ?? true;
  const type = schemaType(schema);
  const hint = hintForPath(path, hints);
  const label = hint?.label ?? schema.title ?? humanize(String(path.at(-1)));
  const help = hint?.help ?? schema.description;
  const key = pathKey(path);

  if (unsupported.has(key)) {
    return html`<div class="cfg-field cfg-field--error">
      <div class="cfg-field__label">${label}</div>
      <div class="cfg-field__error">Unsupported schema node. Use Raw mode.</div>
    </div>`;
  }

  // Handle anyOf/oneOf unions
  if (schema.anyOf || schema.oneOf) {
    const variants = schema.anyOf ?? schema.oneOf ?? [];
    const nonNull = variants.filter(
      (v) => !(v.type === "null" || (Array.isArray(v.type) && v.type.includes("null"))),
    );

    if (nonNull.length === 1) {
      return renderNode({ ...params, schema: nonNull[0] });
    }

    // Check if it's a set of literal values (enum-like)
    const extractLiteral = (v: JsonSchema): unknown => {
      if (v.const !== undefined) {
        return v.const;
      }
      if (v.enum && v.enum.length === 1) {
        return v.enum[0];
      }
      return undefined;
    };
    const literals = nonNull.map(extractLiteral);
    const allLiterals = literals.every((v) => v !== undefined);

    if (allLiterals && literals.length > 0 && literals.length <= 5) {
      // Use segmented control for small sets
      const resolvedValue = value ?? schema.default;
      return html`
        <div class="cfg-field">
          ${showLabel ? html`<label class="cfg-field__label">${label}</label>` : nothing}
          ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
          <div class="cfg-segmented">
            ${literals.map(
              (lit) => html`
              <button
                type="button"
                class="cfg-segmented__btn ${
                  // oxlint-disable typescript/no-base-to-string
                  lit === resolvedValue || String(lit) === String(resolvedValue) ? "active" : ""
                }"
                ?disabled=${disabled}
                @click=${() => onPatch(path, lit)}
              >
                ${
                  // oxlint-disable typescript/no-base-to-string
                  String(lit)
                }
              </button>
            `,
            )}
          </div>
        </div>
      `;
    }

    if (allLiterals && literals.length > 5) {
      // Use dropdown for larger sets
      return renderSelect({ ...params, options: literals, value: value ?? schema.default });
    }

    // Handle mixed primitive types
    const primitiveTypes = new Set(nonNull.map((variant) => schemaType(variant)).filter(Boolean));
    const normalizedTypes = new Set(
      [...primitiveTypes].map((v) => (v === "integer" ? "number" : v)),
    );

    if ([...normalizedTypes].every((v) => ["string", "number", "boolean"].includes(v as string))) {
      const hasString = normalizedTypes.has("string");
      const hasNumber = normalizedTypes.has("number");
      const hasBoolean = normalizedTypes.has("boolean");

      if (hasBoolean && normalizedTypes.size === 1) {
        return renderNode({
          ...params,
          schema: { ...schema, type: "boolean", anyOf: undefined, oneOf: undefined },
        });
      }

      if (hasString || hasNumber) {
        return renderTextInput({
          ...params,
          inputType: hasNumber && !hasString ? "number" : "text",
        });
      }
    }
  }

  // Enum - use segmented for small, dropdown for large
  if (schema.enum) {
    const options = schema.enum;
    if (options.length <= 5) {
      const resolvedValue = value ?? schema.default;
      return html`
        <div class="cfg-field">
          ${showLabel ? html`<label class="cfg-field__label">${label}</label>` : nothing}
          ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
          <div class="cfg-segmented">
            ${options.map(
              (opt) => html`
              <button
                type="button"
                class="cfg-segmented__btn ${opt === resolvedValue || String(opt) === String(resolvedValue) ? "active" : ""}"
                ?disabled=${disabled}
                @click=${() => onPatch(path, opt)}
              >
                ${String(opt)}
              </button>
            `,
            )}
          </div>
        </div>
      `;
    }
    return renderSelect({ ...params, options, value: value ?? schema.default });
  }

  // Object type - collapsible section
  if (type === "object") {
    if (key === "agents.defaults.systemPrompt") {
      return renderSystemPromptEditor(params);
    }
    return renderObject(params);
  }

  // Array type
  if (type === "array") {
    return renderArray(params);
  }

  // Boolean - toggle row
  if (type === "boolean") {
    const displayValue =
      typeof value === "boolean"
        ? value
        : typeof schema.default === "boolean"
          ? schema.default
          : false;
    return html`
      <label class="cfg-toggle-row ${disabled ? "disabled" : ""}">
        <div class="cfg-toggle-row__content">
          <span class="cfg-toggle-row__label">${label}</span>
          ${help ? html`<span class="cfg-toggle-row__help">${help}</span>` : nothing}
        </div>
        <div class="cfg-toggle">
          <input
            type="checkbox"
            .checked=${displayValue}
            ?disabled=${disabled}
            @change=${(e: Event) => onPatch(path, (e.target as HTMLInputElement).checked)}
          />
          <span class="cfg-toggle__track"></span>
        </div>
      </label>
    `;
  }

  // Number/Integer
  if (type === "number" || type === "integer") {
    return renderNumberInput(params);
  }

  // String
  if (type === "string") {
    return renderTextInput({ ...params, inputType: "text" });
  }

  // Fallback
  return html`
    <div class="cfg-field cfg-field--error">
      <div class="cfg-field__label">${label}</div>
      <div class="cfg-field__error">Unsupported type: ${type}. Use Raw mode.</div>
    </div>
  `;
}

function renderTextInput(params: {
  schema: JsonSchema;
  value: unknown;
  path: Array<string | number>;
  hints: ConfigUiHints;
  disabled: boolean;
  showLabel?: boolean;
  inputType: "text" | "number";
  onPatch: (path: Array<string | number>, value: unknown) => void;
}): TemplateResult {
  const { schema, value, path, hints, disabled, onPatch, inputType } = params;
  const showLabel = params.showLabel ?? true;
  const hint = hintForPath(path, hints);
  const label = hint?.label ?? schema.title ?? humanize(String(path.at(-1)));
  const help = hint?.help ?? schema.description;
  const isSensitive =
    (hint?.sensitive ?? false) && !/^\$\{[^}]*\}$/.test(String(value ?? "").trim());
  const placeholder =
    hint?.placeholder ??
    // oxlint-disable typescript/no-base-to-string
    (isSensitive
      ? "••••"
      : schema.default !== undefined
        ? `Default: ${String(schema.default)}`
        : "");
  const displayValue = value ?? "";

  return html`
    <div class="cfg-field">
      ${showLabel ? html`<label class="cfg-field__label">${label}</label>` : nothing}
      ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
      <div class="cfg-input-wrap">
        <input
          type=${isSensitive ? "password" : inputType}
          class="cfg-input"
          placeholder=${placeholder}
          .value=${displayValue == null ? "" : String(displayValue)}
          ?disabled=${disabled}
          @input=${(e: Event) => {
            const raw = (e.target as HTMLInputElement).value;
            if (inputType === "number") {
              if (raw.trim() === "") {
                onPatch(path, undefined);
                return;
              }
              const parsed = Number(raw);
              onPatch(path, Number.isNaN(parsed) ? raw : parsed);
              return;
            }
            onPatch(path, raw);
          }}
          @change=${(e: Event) => {
            if (inputType === "number") {
              return;
            }
            const raw = (e.target as HTMLInputElement).value;
            onPatch(path, raw.trim());
          }}
        />
        ${
          schema.default !== undefined
            ? html`
          <button
            type="button"
            class="cfg-input__reset"
            title="Reset to default"
            ?disabled=${disabled}
            @click=${() => onPatch(path, schema.default)}
          >↺</button>
        `
            : nothing
        }
      </div>
    </div>
  `;
}

function renderNumberInput(params: {
  schema: JsonSchema;
  value: unknown;
  path: Array<string | number>;
  hints: ConfigUiHints;
  disabled: boolean;
  showLabel?: boolean;
  onPatch: (path: Array<string | number>, value: unknown) => void;
}): TemplateResult {
  const { schema, value, path, hints, disabled, onPatch } = params;
  const showLabel = params.showLabel ?? true;
  const hint = hintForPath(path, hints);
  const label = hint?.label ?? schema.title ?? humanize(String(path.at(-1)));
  const help = hint?.help ?? schema.description;
  const displayValue = value ?? schema.default ?? "";
  const numValue = typeof displayValue === "number" ? displayValue : 0;

  return html`
    <div class="cfg-field">
      ${showLabel ? html`<label class="cfg-field__label">${label}</label>` : nothing}
      ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
      <div class="cfg-number">
        <button
          type="button"
          class="cfg-number__btn"
          ?disabled=${disabled}
          @click=${() => onPatch(path, numValue - 1)}
        >−</button>
        <input
          type="number"
          class="cfg-number__input"
          .value=${displayValue == null ? "" : String(displayValue)}
          ?disabled=${disabled}
          @input=${(e: Event) => {
            const raw = (e.target as HTMLInputElement).value;
            const parsed = raw === "" ? undefined : Number(raw);
            onPatch(path, parsed);
          }}
        />
        <button
          type="button"
          class="cfg-number__btn"
          ?disabled=${disabled}
          @click=${() => onPatch(path, numValue + 1)}
        >+</button>
      </div>
    </div>
  `;
}

function renderSelect(params: {
  schema: JsonSchema;
  value: unknown;
  path: Array<string | number>;
  hints: ConfigUiHints;
  disabled: boolean;
  showLabel?: boolean;
  options: unknown[];
  onPatch: (path: Array<string | number>, value: unknown) => void;
}): TemplateResult {
  const { schema, value, path, hints, disabled, options, onPatch } = params;
  const showLabel = params.showLabel ?? true;
  const hint = hintForPath(path, hints);
  const label = hint?.label ?? schema.title ?? humanize(String(path.at(-1)));
  const help = hint?.help ?? schema.description;
  const resolvedValue = value ?? schema.default;
  const currentIndex = options.findIndex(
    (opt) => opt === resolvedValue || String(opt) === String(resolvedValue),
  );
  const unset = "__unset__";

  return html`
    <div class="cfg-field">
      ${showLabel ? html`<label class="cfg-field__label">${label}</label>` : nothing}
      ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
      <select
        class="cfg-select"
        ?disabled=${disabled}
        .value=${currentIndex >= 0 ? String(currentIndex) : unset}
        @change=${(e: Event) => {
          const val = (e.target as HTMLSelectElement).value;
          onPatch(path, val === unset ? undefined : options[Number(val)]);
        }}
      >
        <option value=${unset}>Select...</option>
        ${options.map(
          (opt, idx) => html`
          <option value=${String(idx)}>${String(opt)}</option>
        `,
        )}
      </select>
    </div>
  `;
}

function renderSystemPromptEditor(params: {
  schema: JsonSchema;
  value: unknown;
  path: Array<string | number>;
  hints: ConfigUiHints;
  disabled: boolean;
  onPatch: (path: Array<string | number>, value: unknown) => void;
}): TemplateResult {
  const { schema, value, path, hints, disabled, onPatch } = params;
  const hint = hintForPath(path, hints);
  const label = hint?.label ?? schema.title ?? "System Prompt";
  const help = hint?.help ?? schema.description;

  const obj =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const modePath = [...path, "mode"];
  const unsafePath = [...path, "allowUnsafeReplace"];
  const removeSectionsPath = [...path, "removeSections"];
  const prependPath = [...path, "prepend"];
  const appendPath = [...path, "append"];

  const modeNode = schema.properties?.mode;
  const removeSectionsNode = schema.properties?.removeSections;
  const removeItemsNode =
    removeSectionsNode && !Array.isArray(removeSectionsNode.items)
      ? removeSectionsNode.items
      : undefined;
  const removeOptions = Array.isArray(removeItemsNode?.enum)
    ? removeItemsNode.enum.filter((item): item is string => typeof item === "string")
    : [...SYSTEM_PROMPT_SECTION_IDS_FALLBACK];

  const mode = obj.mode === "replace" ? "replace" : "default";
  const allowUnsafeReplace = obj.allowUnsafeReplace === true;
  const removeSections = Array.isArray(obj.removeSections)
    ? obj.removeSections.filter((entry): entry is string => typeof entry === "string")
    : [];
  const prepend = typeof obj.prepend === "string" ? obj.prepend : "";
  const append = typeof obj.append === "string" ? obj.append : "";

  const modeHelp =
    hintForPath(modePath, hints)?.help ??
    modeNode?.description ??
    'Choose "replace" to ignore generated prompt sections.';

  const replaceBlocked = mode === "replace" && !allowUnsafeReplace;

  return html`
    <section class="cfg-system-prompt">
      <div class="cfg-system-prompt__head">
        <div class="cfg-system-prompt__title">${label}</div>
        ${help ? html`<div class="cfg-system-prompt__help">${help}</div>` : nothing}
      </div>

      <div class="cfg-field">
        <label class="cfg-field__label">Prompt Mode</label>
        <div class="cfg-field__help">${modeHelp}</div>
        <div class="cfg-segmented">
          <button
            type="button"
            class="cfg-segmented__btn ${mode === "default" ? "active" : ""}"
            ?disabled=${disabled}
            @click=${() => onPatch(modePath, "default")}
          >
            default
          </button>
          <button
            type="button"
            class="cfg-segmented__btn ${mode === "replace" ? "active" : ""}"
            ?disabled=${disabled}
            @click=${() => onPatch(modePath, "replace")}
          >
            replace
          </button>
        </div>
      </div>

      <label class="cfg-toggle-row ${disabled ? "disabled" : ""} cfg-toggle-row--danger">
        <div class="cfg-toggle-row__content">
          <span class="cfg-toggle-row__label">Allow Unsafe Replace</span>
          <span class="cfg-toggle-row__help"
            >Required for replace mode to take effect. Disabling keeps built-in generated prompt sections active.</span
          >
        </div>
        <div class="cfg-toggle">
          <input
            type="checkbox"
            .checked=${allowUnsafeReplace}
            ?disabled=${disabled || mode !== "replace"}
            @change=${(e: Event) => onPatch(unsafePath, (e.target as HTMLInputElement).checked)}
          />
          <span class="cfg-toggle__track"></span>
        </div>
      </label>

      ${
        mode === "replace"
          ? html`
              <div class="callout danger cfg-system-prompt__warning">
                Replace mode is active. Generated prompt sections are ignored
                ${replaceBlocked ? " until you enable Allow Unsafe Replace." : "."}
              </div>
            `
          : nothing
      }

      <div class="cfg-field">
        <label class="cfg-field__label">Removed Sections</label>
        <div class="cfg-field__help">
          Remove generated sections by stable section ID.
        </div>
        ${
          removeOptions.length === 0
            ? html`
                <div class="muted">No section IDs available from schema.</div>
              `
            : html`
                <div class="cfg-check-grid">
                  ${removeOptions.map((sectionId) => {
                    const selected = removeSections.includes(sectionId);
                    const description = SYSTEM_PROMPT_SECTION_DESCRIPTIONS_FALLBACK[sectionId];
                    return html`
                      <label
                        class="cfg-check-grid__item ${selected ? "active" : ""}"
                        title=${description ?? ""}
                      >
                        <input
                          type="checkbox"
                          .checked=${selected}
                          ?disabled=${disabled}
                          @change=${(e: Event) => {
                            const checked = (e.target as HTMLInputElement).checked;
                            const next = checked
                              ? [...removeSections, sectionId]
                              : removeSections.filter((entry) => entry !== sectionId);
                            onPatch(removeSectionsPath, next);
                          }}
                        />
                        <span class="cfg-check-grid__label" title=${description ?? ""}>${sectionId}</span>
                      </label>
                    `;
                  })}
                </div>
              `
        }
      </div>

      <div class="cfg-field">
        <label class="cfg-field__label">Prompt Prepend</label>
        <div class="cfg-field__help">Text injected before generated prompt sections.</div>
        <textarea
          class="cfg-textarea cfg-textarea--prompt"
          rows="8"
          placeholder="Optional text prepended to the generated system prompt"
          .value=${prepend}
          ?disabled=${disabled}
          @input=${(e: Event) => onPatch(prependPath, (e.target as HTMLTextAreaElement).value)}
        ></textarea>
      </div>

      <div class="cfg-field">
        <label class="cfg-field__label">Prompt Append</label>
        <div class="cfg-field__help">Text injected after generated prompt sections.</div>
        <textarea
          class="cfg-textarea cfg-textarea--prompt"
          rows="8"
          placeholder="Optional text appended to the generated system prompt"
          .value=${append}
          ?disabled=${disabled}
          @input=${(e: Event) => onPatch(appendPath, (e.target as HTMLTextAreaElement).value)}
        ></textarea>
      </div>
    </section>
  `;
}

function renderObject(params: {
  schema: JsonSchema;
  value: unknown;
  path: Array<string | number>;
  hints: ConfigUiHints;
  unsupported: Set<string>;
  disabled: boolean;
  showLabel?: boolean;
  onPatch: (path: Array<string | number>, value: unknown) => void;
}): TemplateResult {
  const { schema, value, path, hints, unsupported, disabled, onPatch } = params;
  const hint = hintForPath(path, hints);
  const label = hint?.label ?? schema.title ?? humanize(String(path.at(-1)));
  const help = hint?.help ?? schema.description;

  const fallback = value ?? schema.default;
  const obj =
    fallback && typeof fallback === "object" && !Array.isArray(fallback)
      ? (fallback as Record<string, unknown>)
      : {};
  const props = schema.properties ?? {};
  const entries = Object.entries(props);

  // Sort by hint order
  const sorted = entries.toSorted((a, b) => {
    const orderA = hintForPath([...path, a[0]], hints)?.order ?? 0;
    const orderB = hintForPath([...path, b[0]], hints)?.order ?? 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a[0].localeCompare(b[0]);
  });

  const reserved = new Set(Object.keys(props));
  const additional = schema.additionalProperties;
  const allowExtra = Boolean(additional) && typeof additional === "object";

  const fields = html`
    ${sorted.map(([propKey, node]) =>
      renderNode({
        schema: node,
        value: obj[propKey],
        path: [...path, propKey],
        hints,
        unsupported,
        disabled,
        onPatch,
      }),
    )}
    ${
      allowExtra
        ? renderMapField({
            schema: additional,
            value: obj,
            path,
            hints,
            unsupported,
            disabled,
            reservedKeys: reserved,
            onPatch,
          })
        : nothing
    }
  `;

  // For top-level, don't wrap in collapsible
  if (path.length === 1) {
    return html`
      <div class="cfg-fields">
        ${fields}
      </div>
    `;
  }

  // Nested objects get collapsible treatment
  return html`
    <details class="cfg-object" open>
      <summary class="cfg-object__header">
        <span class="cfg-object__title">${label}</span>
        <span class="cfg-object__chevron">${icons.chevronDown}</span>
      </summary>
      ${help ? html`<div class="cfg-object__help">${help}</div>` : nothing}
      <div class="cfg-object__content">
        ${fields}
      </div>
    </details>
  `;
}

function renderArray(params: {
  schema: JsonSchema;
  value: unknown;
  path: Array<string | number>;
  hints: ConfigUiHints;
  unsupported: Set<string>;
  disabled: boolean;
  showLabel?: boolean;
  onPatch: (path: Array<string | number>, value: unknown) => void;
}): TemplateResult {
  const { schema, value, path, hints, unsupported, disabled, onPatch } = params;
  const showLabel = params.showLabel ?? true;
  const hint = hintForPath(path, hints);
  const label = hint?.label ?? schema.title ?? humanize(String(path.at(-1)));
  const help = hint?.help ?? schema.description;

  const itemsSchema = Array.isArray(schema.items) ? schema.items[0] : schema.items;
  if (!itemsSchema) {
    return html`
      <div class="cfg-field cfg-field--error">
        <div class="cfg-field__label">${label}</div>
        <div class="cfg-field__error">Unsupported array schema. Use Raw mode.</div>
      </div>
    `;
  }

  const arr = Array.isArray(value) ? value : Array.isArray(schema.default) ? schema.default : [];

  return html`
    <div class="cfg-array">
      <div class="cfg-array__header">
        ${showLabel ? html`<span class="cfg-array__label">${label}</span>` : nothing}
        <span class="cfg-array__count">${arr.length} item${arr.length !== 1 ? "s" : ""}</span>
        <button
          type="button"
          class="cfg-array__add"
          ?disabled=${disabled}
          @click=${() => {
            const next = [...arr, defaultValue(itemsSchema)];
            onPatch(path, next);
          }}
        >
          <span class="cfg-array__add-icon">${icons.plus}</span>
          Add
        </button>
      </div>
      ${help ? html`<div class="cfg-array__help">${help}</div>` : nothing}

      ${
        arr.length === 0
          ? html`
              <div class="cfg-array__empty">No items yet. Click "Add" to create one.</div>
            `
          : html`
        <div class="cfg-array__items">
          ${arr.map(
            (item, idx) => html`
            <div class="cfg-array__item">
              <div class="cfg-array__item-header">
                <span class="cfg-array__item-index">#${idx + 1}</span>
                <button
                  type="button"
                  class="cfg-array__item-remove"
                  title="Remove item"
                  ?disabled=${disabled}
                  @click=${() => {
                    const next = [...arr];
                    next.splice(idx, 1);
                    onPatch(path, next);
                  }}
                >
                  ${icons.trash}
                </button>
              </div>
              <div class="cfg-array__item-content">
                ${renderNode({
                  schema: itemsSchema,
                  value: item,
                  path: [...path, idx],
                  hints,
                  unsupported,
                  disabled,
                  showLabel: false,
                  onPatch,
                })}
              </div>
            </div>
          `,
          )}
        </div>
      `
      }
    </div>
  `;
}

function renderMapField(params: {
  schema: JsonSchema;
  value: Record<string, unknown>;
  path: Array<string | number>;
  hints: ConfigUiHints;
  unsupported: Set<string>;
  disabled: boolean;
  reservedKeys: Set<string>;
  onPatch: (path: Array<string | number>, value: unknown) => void;
}): TemplateResult {
  const { schema, value, path, hints, unsupported, disabled, reservedKeys, onPatch } = params;
  const anySchema = isAnySchema(schema);
  const entries = Object.entries(value ?? {}).filter(([key]) => !reservedKeys.has(key));

  return html`
    <div class="cfg-map">
      <div class="cfg-map__header">
        <span class="cfg-map__label">Custom entries</span>
        <button
          type="button"
          class="cfg-map__add"
          ?disabled=${disabled}
          @click=${() => {
            const next = { ...value };
            let index = 1;
            let key = `custom-${index}`;
            while (key in next) {
              index += 1;
              key = `custom-${index}`;
            }
            next[key] = anySchema ? {} : defaultValue(schema);
            onPatch(path, next);
          }}
        >
          <span class="cfg-map__add-icon">${icons.plus}</span>
          Add Entry
        </button>
      </div>

      ${
        entries.length === 0
          ? html`
              <div class="cfg-map__empty">No custom entries.</div>
            `
          : html`
        <div class="cfg-map__items">
          ${entries.map(([key, entryValue]) => {
            const valuePath = [...path, key];
            const fallback = jsonValue(entryValue);
            return html`
              <div class="cfg-map__item">
                <div class="cfg-map__item-key">
                  <input
                    type="text"
                    class="cfg-input cfg-input--sm"
                    placeholder="Key"
                    .value=${key}
                    ?disabled=${disabled}
                    @change=${(e: Event) => {
                      const nextKey = (e.target as HTMLInputElement).value.trim();
                      if (!nextKey || nextKey === key) {
                        return;
                      }
                      const next = { ...value };
                      if (nextKey in next) {
                        return;
                      }
                      next[nextKey] = next[key];
                      delete next[key];
                      onPatch(path, next);
                    }}
                  />
                </div>
                <div class="cfg-map__item-value">
                  ${
                    anySchema
                      ? html`
                        <textarea
                          class="cfg-textarea cfg-textarea--sm"
                          placeholder="JSON value"
                          rows="2"
                          .value=${fallback}
                          ?disabled=${disabled}
                          @change=${(e: Event) => {
                            const target = e.target as HTMLTextAreaElement;
                            const raw = target.value.trim();
                            if (!raw) {
                              onPatch(valuePath, undefined);
                              return;
                            }
                            try {
                              onPatch(valuePath, JSON.parse(raw));
                            } catch {
                              target.value = fallback;
                            }
                          }}
                        ></textarea>
                      `
                      : renderNode({
                          schema,
                          value: entryValue,
                          path: valuePath,
                          hints,
                          unsupported,
                          disabled,
                          showLabel: false,
                          onPatch,
                        })
                  }
                </div>
                <button
                  type="button"
                  class="cfg-map__item-remove"
                  title="Remove entry"
                  ?disabled=${disabled}
                  @click=${() => {
                    const next = { ...value };
                    delete next[key];
                    onPatch(path, next);
                  }}
                >
                  ${icons.trash}
                </button>
              </div>
            `;
          })}
        </div>
      `
      }
    </div>
  `;
}
