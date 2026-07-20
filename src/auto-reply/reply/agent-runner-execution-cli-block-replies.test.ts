import { describe, expect, it, vi } from "vitest";
import type { TemplateContext } from "../templating.js";
import type { GetReplyOptions } from "../types.js";
import {
  setupAgentRunnerExecutionTestState,
  getRunAgentTurnWithFallback,
  createMockTypingSignaler,
  createFollowupRun,
} from "./agent-runner-execution.test-support.js";
import type { FallbackRunnerParams } from "./agent-runner-execution.test-support.js";
import { createBlockReplyContentKey } from "./block-reply-pipeline.js";

const state = setupAgentRunnerExecutionTestState();

describe("runAgentTurnWithFallback: CLI source-channel block replies", () => {
  it("bridges CLI assistant deltas into source-channel block replies when block streaming is off", async () => {
    state.isCliProviderMock.mockReturnValue(true);
    state.createBlockReplyDeliveryHandlerMock.mockImplementation(
      (params: {
        onBlockReply: NonNullable<GetReplyOptions["onBlockReply"]>;
        directTextBlockRepliesWhenStreamingDisabled?: boolean;
        directlySentBlockKeys?: Set<string>;
        directlySentBlockPayloads?: Array<{ text?: string }>;
      }) =>
        async (payload: { text?: string }) => {
          if (!params.directTextBlockRepliesWhenStreamingDisabled) {
            return;
          }
          await params.onBlockReply(payload);
          if (payload.text) {
            params.directlySentBlockKeys?.add(createBlockReplyContentKey(payload));
            params.directlySentBlockPayloads?.push(payload);
          }
        },
    );
    state.runWithModelFallbackMock.mockImplementationOnce(async (params: FallbackRunnerParams) => ({
      result: await params.run("claude-cli", "claude-opus-4-6"),
      provider: "claude-cli",
      model: "claude-opus-4-6",
      attempts: [],
    }));
    state.runCliAgentMock.mockImplementationOnce(async (params: { runId: string }) => {
      const realAgentEvents = await vi.importActual<typeof import("../../infra/agent-events.js")>(
        "../../infra/agent-events.js",
      );
      realAgentEvents.emitAgentEvent({
        runId: params.runId,
        stream: "assistant",
        data: { text: "Hello", delta: "Hello" },
      });
      realAgentEvents.emitAgentEvent({
        runId: params.runId,
        stream: "assistant",
        data: { text: "Hello world", delta: " world" },
      });
      return { payloads: [{ text: "Hello world" }], meta: {} };
    });

    const onBlockReply = vi.fn<NonNullable<GetReplyOptions["onBlockReply"]>>(async () => undefined);
    const runAgentTurnWithFallback = await getRunAgentTurnWithFallback();
    const followupRun = createFollowupRun();
    followupRun.run.provider = "claude-cli";
    followupRun.run.model = "claude-opus-4-6";

    const result = await runAgentTurnWithFallback({
      commandBody: "hi",
      followupRun,
      sessionCtx: {
        Provider: "discord",
        ChatType: "channel",
        MessageSid: "msg",
      } as unknown as TemplateContext,
      opts: { onBlockReply },
      typingSignals: createMockTypingSignaler(),
      blockReplyPipeline: null,
      blockStreamingEnabled: false,
      resolvedBlockStreamingBreak: "message_end",
      applyReplyToMode: (payload) => payload,
      shouldEmitToolResult: () => true,
      shouldEmitToolOutput: () => false,
      pendingToolTasks: new Set(),
      resetSessionAfterRoleOrderingConflict: async () => false,
      isHeartbeat: false,
      sessionKey: "main",
      getActiveSessionEntry: () => undefined,
      resolvedVerboseLevel: "off",
    });

    expect(onBlockReply.mock.calls.map((call) => call[0].text)).toEqual(["Hello world"]);
    expect(result.kind).toBe("success");
    expect(
      result.kind === "success"
        ? result.directlySentBlockKeys?.has(createBlockReplyContentKey({ text: "Hello world" }))
        : false,
    ).toBe(true);
  });

  it("caps oversized CLI assistant delta block chunks", async () => {
    state.isCliProviderMock.mockReturnValue(true);
    state.createBlockReplyDeliveryHandlerMock.mockImplementation(
      (params: {
        onBlockReply: NonNullable<GetReplyOptions["onBlockReply"]>;
        directTextBlockRepliesWhenStreamingDisabled?: boolean;
        directlySentBlockKeys?: Set<string>;
        directlySentBlockPayloads?: Array<{ text?: string }>;
      }) =>
        async (payload: { text?: string }) => {
          if (!params.directTextBlockRepliesWhenStreamingDisabled) {
            return;
          }
          await params.onBlockReply(payload);
          if (payload.text) {
            params.directlySentBlockKeys?.add(createBlockReplyContentKey(payload));
            params.directlySentBlockPayloads?.push(payload);
          }
        },
    );
    state.runWithModelFallbackMock.mockImplementationOnce(async (params: FallbackRunnerParams) => ({
      result: await params.run("claude-cli", "claude-opus-4-6"),
      provider: "claude-cli",
      model: "claude-opus-4-6",
      attempts: [],
    }));
    const longText = "word ".repeat(220);
    state.runCliAgentMock.mockImplementationOnce(async (params: { runId: string }) => {
      const realAgentEvents = await vi.importActual<typeof import("../../infra/agent-events.js")>(
        "../../infra/agent-events.js",
      );
      realAgentEvents.emitAgentEvent({
        runId: params.runId,
        stream: "assistant",
        data: { text: longText, delta: longText },
      });
      return { payloads: [{ text: longText }], meta: {} };
    });

    const onBlockReply = vi.fn<NonNullable<GetReplyOptions["onBlockReply"]>>(async () => undefined);
    const runAgentTurnWithFallback = await getRunAgentTurnWithFallback();
    const followupRun = createFollowupRun();
    followupRun.run.provider = "claude-cli";
    followupRun.run.model = "claude-opus-4-6";

    await runAgentTurnWithFallback({
      commandBody: "hi",
      followupRun,
      sessionCtx: {
        Provider: "discord",
        ChatType: "channel",
        MessageSid: "msg",
      } as unknown as TemplateContext,
      opts: { onBlockReply },
      typingSignals: createMockTypingSignaler(),
      blockReplyPipeline: null,
      blockStreamingEnabled: false,
      resolvedBlockStreamingBreak: "message_end",
      applyReplyToMode: (payload) => payload,
      shouldEmitToolResult: () => true,
      shouldEmitToolOutput: () => false,
      pendingToolTasks: new Set(),
      resetSessionAfterRoleOrderingConflict: async () => false,
      isHeartbeat: false,
      sessionKey: "main",
      getActiveSessionEntry: () => undefined,
      resolvedVerboseLevel: "off",
    });

    const blockTexts = onBlockReply.mock.calls.map((call) => call[0].text ?? "");
    expect(blockTexts.length).toBeGreaterThan(1);
    expect(blockTexts.every((text) => text.length <= 900)).toBe(true);
    expect(blockTexts.join("")).toBe(longText);
  });

  it("does not bridge CLI assistant deltas into source-channel block replies in message-tool-only mode", async () => {
    state.isCliProviderMock.mockReturnValue(true);
    state.createBlockReplyDeliveryHandlerMock.mockImplementation(
      (params: { onBlockReply: NonNullable<GetReplyOptions["onBlockReply"]> }) =>
        async (payload: { text?: string }) => {
          await params.onBlockReply(payload);
        },
    );
    state.runWithModelFallbackMock.mockImplementationOnce(async (params: FallbackRunnerParams) => ({
      result: await params.run("claude-cli", "claude-opus-4-6"),
      provider: "claude-cli",
      model: "claude-opus-4-6",
      attempts: [],
    }));
    state.runCliAgentMock.mockImplementationOnce(async (params: { runId: string }) => {
      const realAgentEvents = await vi.importActual<typeof import("../../infra/agent-events.js")>(
        "../../infra/agent-events.js",
      );
      realAgentEvents.emitAgentEvent({
        runId: params.runId,
        stream: "assistant",
        data: { text: "tool-owned", delta: "tool-owned" },
      });
      return { payloads: [{ text: "tool-owned" }], meta: {} };
    });

    const onBlockReply = vi.fn<NonNullable<GetReplyOptions["onBlockReply"]>>(async () => undefined);
    const runAgentTurnWithFallback = await getRunAgentTurnWithFallback();
    const followupRun = createFollowupRun();
    followupRun.run.provider = "claude-cli";
    followupRun.run.model = "claude-opus-4-6";
    followupRun.run.sourceReplyDeliveryMode = "message_tool_only";

    const result = await runAgentTurnWithFallback({
      commandBody: "hi",
      followupRun,
      sessionCtx: {
        Provider: "discord",
        ChatType: "channel",
        MessageSid: "msg",
      } as unknown as TemplateContext,
      opts: { onBlockReply, sourceReplyDeliveryMode: "message_tool_only" },
      typingSignals: createMockTypingSignaler(),
      blockReplyPipeline: null,
      blockStreamingEnabled: false,
      resolvedBlockStreamingBreak: "message_end",
      applyReplyToMode: (payload) => payload,
      shouldEmitToolResult: () => true,
      shouldEmitToolOutput: () => false,
      pendingToolTasks: new Set(),
      resetSessionAfterRoleOrderingConflict: async () => false,
      isHeartbeat: false,
      sessionKey: "main",
      getActiveSessionEntry: () => undefined,
      resolvedVerboseLevel: "off",
    });

    expect(onBlockReply).not.toHaveBeenCalled();
    expect(result.kind).toBe("success");
  });

  it("does not bridge CLI assistant deltas into block replies when silentExpected is set", async () => {
    state.isCliProviderMock.mockReturnValue(true);
    state.createBlockReplyDeliveryHandlerMock.mockImplementation(
      (params: { onBlockReply: NonNullable<GetReplyOptions["onBlockReply"]> }) =>
        async (payload: { text?: string }) => {
          await params.onBlockReply(payload);
        },
    );
    state.runWithModelFallbackMock.mockImplementationOnce(async (params: FallbackRunnerParams) => ({
      result: await params.run("claude-cli", "claude-opus-4-6"),
      provider: "claude-cli",
      model: "claude-opus-4-6",
      attempts: [],
    }));
    state.runCliAgentMock.mockImplementationOnce(async (params: { runId: string }) => {
      const realAgentEvents = await vi.importActual<typeof import("../../infra/agent-events.js")>(
        "../../infra/agent-events.js",
      );
      realAgentEvents.emitAgentEvent({
        runId: params.runId,
        stream: "assistant",
        data: { text: "secret", delta: "secret" },
      });
      return { payloads: [{ text: "final" }], meta: {} };
    });

    const onBlockReply = vi.fn<NonNullable<GetReplyOptions["onBlockReply"]>>(async () => undefined);
    const runAgentTurnWithFallback = await getRunAgentTurnWithFallback();
    const followupRun = createFollowupRun();
    followupRun.run.provider = "claude-cli";
    followupRun.run.model = "claude-opus-4-6";
    followupRun.run.silentExpected = true;

    await runAgentTurnWithFallback({
      commandBody: "hi",
      followupRun,
      sessionCtx: {
        Provider: "discord",
        ChatType: "channel",
        MessageSid: "msg",
      } as unknown as TemplateContext,
      opts: { onBlockReply },
      typingSignals: createMockTypingSignaler(),
      blockReplyPipeline: null,
      blockStreamingEnabled: false,
      resolvedBlockStreamingBreak: "message_end",
      applyReplyToMode: (payload) => payload,
      shouldEmitToolResult: () => true,
      shouldEmitToolOutput: () => false,
      pendingToolTasks: new Set(),
      resetSessionAfterRoleOrderingConflict: async () => false,
      isHeartbeat: false,
      sessionKey: "main",
      getActiveSessionEntry: () => undefined,
      resolvedVerboseLevel: "off",
    });

    expect(onBlockReply).not.toHaveBeenCalled();
  });
});
