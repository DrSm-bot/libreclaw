import { ChannelType } from "@buape/carbon";
import { describe, expect, it, vi } from "vitest";
import type { DiscordMessagePreflightParams } from "./message-handler.preflight.types.js";

const resolveAgentRoute = vi.fn(() => ({
  agentId: "main",
  channel: "discord",
  accountId: "default",
  sessionKey: "agent:main:discord:channel:c1",
  mainSessionKey: "agent:main:main",
}));
const loadConfig = vi.fn(() => ({}));

vi.mock("../../routing/resolve-route.js", () => ({
  resolveAgentRoute,
}));

vi.mock("../../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/config.js")>();
  return {
    ...actual,
    loadConfig,
  };
});

const { preflightDiscordMessage } = await import("./message-handler.preflight.js");

function createPreflightParams(
  overrides: Partial<DiscordMessagePreflightParams> = {},
): DiscordMessagePreflightParams {
  const now = new Date().toISOString();
  return {
    cfg: { messages: {} } as DiscordMessagePreflightParams["cfg"],
    discordConfig: { allowBots: false, historyIncludeBots: true },
    accountId: "default",
    token: "token",
    runtime: { log: () => {}, error: () => {} } as DiscordMessagePreflightParams["runtime"],
    botUserId: "bot-self",
    guildHistories: new Map(),
    historyLimit: 10,
    mediaMaxBytes: 1024 * 1024,
    textLimit: 4000,
    replyToMode: "off",
    dmEnabled: true,
    groupDmEnabled: true,
    groupDmChannels: undefined,
    allowFrom: [],
    guildEntries: undefined,
    ackReactionScope: "group-mentions",
    groupPolicy: "open",
    data: {
      guild_id: "g1",
      guild: { id: "g1", name: "Guild" },
      channel_id: "c1",
      member: { nickname: null },
      message: {
        id: "m1",
        channelId: "c1",
        content: "hello",
        timestamp: now,
        attachments: [],
        mentionedUsers: [],
        mentionedRoles: [],
        mentionedEveryone: false,
      },
      author: {
        id: "u1",
        username: "alice",
        discriminator: "0",
        globalName: "Alice",
      },
    } as DiscordMessagePreflightParams["data"],
    client: {
      rest: {},
      fetchChannel: async () =>
        ({
          id: "c1",
          type: ChannelType.GuildText,
          name: "general",
        }) as unknown,
    } as DiscordMessagePreflightParams["client"],
    ...overrides,
  };
}

describe("preflightDiscordMessage history recording", () => {
  it("records both split bot chunks under resolved channel key when historyIncludeBots is enabled", async () => {
    const guildHistories = new Map();
    const base = createPreflightParams({
      guildHistories,
      historyLimit: 5,
      discordConfig: { allowBots: false, historyIncludeBots: true },
      data: {
        guild_id: "g1",
        guild: { id: "g1", name: "Guild" },
        channel_id: "c1",
        member: { nickname: null },
        message: {
          id: "m1",
          content: "first bot chunk (no mention)",
          timestamp: new Date().toISOString(),
          attachments: [],
        },
        author: {
          id: "bot-a",
          username: "botA",
          bot: true,
          discriminator: "0",
        },
      } as DiscordMessagePreflightParams["data"],
    });

    const second = createPreflightParams({
      ...base,
      data: {
        ...base.data,
        message: {
          id: "m2",
          channelId: "c1",
          content: "second bot chunk @bot-self",
          timestamp: new Date().toISOString(),
          attachments: [],
        },
      } as DiscordMessagePreflightParams["data"],
    });

    await preflightDiscordMessage(base);
    await preflightDiscordMessage(second);

    expect(guildHistories.get("c1")?.map((entry) => entry.body)).toEqual([
      "first bot chunk (no mention)",
      "second bot chunk @bot-self",
    ]);
  });

  it("records no-mention guild drops to pending history when history is enabled", async () => {
    const guildHistories = new Map();
    const params = createPreflightParams({
      guildHistories,
      historyLimit: 5,
      data: {
        guild_id: "g1",
        guild: { id: "g1", name: "Guild" },
        channel_id: "c1",
        member: { nickname: null },
        message: {
          id: "m3",
          channelId: "c1",
          content: "plain text without mention",
          timestamp: new Date().toISOString(),
          attachments: [],
          mentionedUsers: [],
          mentionedRoles: [],
          mentionedEveryone: false,
        },
        author: {
          id: "u2",
          username: "bob",
          discriminator: "0",
        },
      } as DiscordMessagePreflightParams["data"],
      discordConfig: { allowBots: true, historyIncludeBots: false },
    });

    const result = await preflightDiscordMessage(params);

    expect(result).toBeNull();
    expect(guildHistories.get("c1")?.map((entry) => entry.body)).toEqual([
      "plain text without mention",
    ]);
  });

  it("keeps guildHistories isolated per account map even with identical channel ids", async () => {
    const accountAHistories = new Map();
    const accountBHistories = new Map();

    await preflightDiscordMessage(
      createPreflightParams({
        accountId: "account-a",
        guildHistories: accountAHistories,
        data: {
          guild_id: "g1",
          guild: { id: "g1", name: "Guild" },
          channel_id: "c1",
          member: { nickname: null },
          message: {
            id: "m4",
            channelId: "c1",
            content: "account a bot message",
            timestamp: new Date().toISOString(),
            attachments: [],
          },
          author: {
            id: "bot-a",
            username: "botA",
            bot: true,
            discriminator: "0",
          },
        } as DiscordMessagePreflightParams["data"],
      }),
    );

    await preflightDiscordMessage(
      createPreflightParams({
        accountId: "account-b",
        guildHistories: accountBHistories,
        data: {
          guild_id: "g1",
          guild: { id: "g1", name: "Guild" },
          channel_id: "c1",
          member: { nickname: null },
          message: {
            id: "m5",
            channelId: "c1",
            content: "account b bot message",
            timestamp: new Date().toISOString(),
            attachments: [],
          },
          author: {
            id: "bot-b",
            username: "botB",
            bot: true,
            discriminator: "0",
          },
        } as DiscordMessagePreflightParams["data"],
      }),
    );

    expect(accountAHistories.get("c1")?.map((entry) => entry.body)).toEqual([
      "account a bot message",
    ]);
    expect(accountBHistories.get("c1")?.map((entry) => entry.body)).toEqual([
      "account b bot message",
    ]);
  });
});
