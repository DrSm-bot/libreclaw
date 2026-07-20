import { definePage } from "@openclaw/uirouter";
import { html } from "lit";
import type { ApplicationContext } from "../../app/context.ts";

export const page = definePage({
  id: "prompt-studio",
  path: "/settings/prompt-studio",
  aliases: ["/prompt-studio"],
  loader: (context: ApplicationContext) => context.runtimeConfig.ensureLoaded(),
  component: () =>
    import("./prompt-studio-page.ts").then(() => ({
      header: true,
      render: () => html`<openclaw-prompt-studio-page></openclaw-prompt-studio-page>`,
    })),
});
