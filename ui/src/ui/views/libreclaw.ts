import { html } from "lit";
import type { GatewayHelloOk } from "../gateway.ts";

type LibreClawProps = {
  connected: boolean;
  hello: GatewayHelloOk | null;
};

function pickVersion(snapshot: Record<string, unknown> | undefined): string {
  if (!snapshot || typeof snapshot !== "object") {
    return "unknown";
  }
  const direct = ["version", "appVersion", "gatewayVersion"]
    .map((k) => snapshot[k])
    .find((v) => typeof v === "string" && v.trim().length > 0) as string | undefined;
  if (direct) {
    return direct;
  }
  const status = snapshot.status;
  if (status && typeof status === "object") {
    const statusVersion = (status as Record<string, unknown>).version;
    if (typeof statusVersion === "string" && statusVersion.trim().length > 0) {
      return statusVersion;
    }
  }
  return "unknown";
}

export function renderLibreClaw(props: LibreClawProps) {
  const snapshot = props.hello?.snapshot as Record<string, unknown> | undefined;
  const version = pickVersion(snapshot);

  return html`
    <section class="grid grid-cols-2">
      <div class="card">
        <div class="card-title">LibreClaw</div>
        <div class="card-sub">Community fork focused on freedom, customization, and transparency.</div>
        <div class="stat-grid" style="margin-top: 16px;">
          <div class="stat">
            <div class="stat-label">Gateway Connection</div>
            <div class="stat-value ${props.connected ? "ok" : "warn"}">
              ${props.connected ? "Connected" : "Disconnected"}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">Version</div>
            <div class="stat-value">${version}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">About</div>
        <div class="card-sub">Canonical links for source, docs, and community.</div>
        <div class="note-grid" style="margin-top: 14px;">
          <div>
            <div class="note-title">GitHub</div>
            <a class="session-link" href="https://github.com/DrSm-bot/libreclaw" target="_blank" rel="noreferrer"
              >github.com/DrSm-bot/libreclaw</a
            >
          </div>
          <div>
            <div class="note-title">Docs</div>
            <a class="session-link" href="https://docs.openclaw.ai" target="_blank" rel="noreferrer"
              >docs.openclaw.ai</a
            >
          </div>
          <div>
            <div class="note-title">Community</div>
            <a class="session-link" href="https://discord.com/invite/clawd" target="_blank" rel="noreferrer"
              >discord.gg/clawd</a
            >
          </div>
        </div>
      </div>
    </section>

    <section class="card" style="margin-top: 18px;">
      <div class="card-title">Sprint 1 Scope</div>
      <div class="card-sub">Foundation entry point for LibreClaw-specific dashboard features.</div>
      <div class="callout" style="margin-top: 14px;">
        Next planned milestone: System Prompt Studio migration into this section.
      </div>
    </section>
  `;
}
