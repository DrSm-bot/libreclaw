import { describe, expect, it } from "vitest";
import { OpenClawSchema } from "./zod-schema.js";

describe("config.systemPrompt removeSections", () => {
  it("rejects invalid section IDs with a helpful message", () => {
    const result = OpenClawSchema.safeParse({
      agents: {
        defaults: {
          systemPrompt: {
            removeSections: ["definitely_not_a_section"],
          },
        },
      },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    const flattened = result.error.issues.map((issue) => issue.message).join("\n");
    expect(flattened).toContain("Invalid system prompt section ID");
    expect(flattened).toContain("tooling");
    expect(flattened).toContain("runtime");
  });

  it("accepts known section IDs", () => {
    const result = OpenClawSchema.safeParse({
      agents: {
        defaults: {
          systemPrompt: {
            removeSections: ["tooling", "runtime", "safety"],
          },
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts safetyStyle presets", () => {
    const libre = OpenClawSchema.safeParse({
      agents: { defaults: { systemPrompt: { safetyStyle: "libreclaw" } } },
    });
    const oc = OpenClawSchema.safeParse({
      agents: { defaults: { systemPrompt: { safetyStyle: "openclaw" } } },
    });
    expect(libre.success).toBe(true);
    expect(oc.success).toBe(true);
  });
});
