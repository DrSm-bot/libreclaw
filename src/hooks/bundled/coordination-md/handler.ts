import fsSync from "node:fs";
import path from "node:path";
import {
  MAX_WORKSPACE_BOOTSTRAP_FILE_BYTES,
  readWorkspaceBootstrapFile,
} from "../../../agents/workspace-bootstrap-read.js";
import type { WorkspaceBootstrapFile } from "../../../agents/workspace.js";
import { openRootFile } from "../../../infra/boundary-file-read.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";
import {
  isAcpSessionKey,
  isCronSessionKey,
  isSubagentSessionKey,
  parseAgentSessionKey,
  parseSessionDeliveryRoute,
} from "../../../routing/session-key.js";
import { resolveHookConfig } from "../../config.js";
import type { InternalHookEvent } from "../../internal-hook-types.js";
import { isAgentBootstrapEvent } from "../../internal-hooks.js";

const HOOK_KEY = "coordination-md";
const COORDINATION_FILENAME = "COORDINATION.md";
const log = createSubsystemLogger(HOOK_KEY);

function isMainAgentBootstrapSession(sessionKey: string | undefined): boolean {
  const parsed = parseAgentSessionKey(sessionKey);
  if (!parsed) {
    return false;
  }
  if (
    parsed.rest === "unknown" ||
    parsed.rest.startsWith("unknown:") ||
    isSubagentSessionKey(sessionKey) ||
    isAcpSessionKey(sessionKey) ||
    isCronSessionKey(sessionKey)
  ) {
    return false;
  }
  return parsed.rest === "main" || parseSessionDeliveryRoute(sessionKey) !== null;
}

async function readCoordinationFile(workspaceDir: string): Promise<WorkspaceBootstrapFile | null> {
  const candidate = path.join(workspaceDir, COORDINATION_FILENAME);
  const opened = await openRootFile({
    absolutePath: candidate,
    rootPath: workspaceDir,
    boundaryLabel: "workspace root",
    maxBytes: MAX_WORKSPACE_BOOTSTRAP_FILE_BYTES,
  });
  if (!opened.ok) {
    if ((opened.error as NodeJS.ErrnoException | undefined)?.code !== "ENOENT") {
      log.warn(`skipping ${COORDINATION_FILENAME}: file failed workspace boundary checks`);
    }
    return null;
  }
  try {
    const content = await readWorkspaceBootstrapFile(opened.fd);
    return {
      name: COORDINATION_FILENAME as WorkspaceBootstrapFile["name"],
      path: opened.path,
      content,
      missing: false,
    };
  } finally {
    fsSync.closeSync(opened.fd);
  }
}

async function hasCoordinationFile(
  bootstrapFiles: WorkspaceBootstrapFile[],
  coordinationPath: string,
): Promise<boolean> {
  for (const file of bootstrapFiles) {
    if (file.path === coordinationPath) {
      return true;
    }
    try {
      if ((await fsSync.promises.realpath(file.path)) === coordinationPath) {
        return true;
      }
    } catch {
      // Ignore missing or inaccessible bootstrap paths; they cannot identify this open file.
    }
  }
  return false;
}

const coordinationMdHook = async (event: InternalHookEvent) => {
  if (!isAgentBootstrapEvent(event)) {
    return;
  }
  const context = event.context;
  const hookConfig = resolveHookConfig(context.cfg, HOOK_KEY);
  if (!hookConfig || hookConfig.enabled === false) {
    return;
  }
  if (!isMainAgentBootstrapSession(context.sessionKey)) {
    return;
  }
  try {
    const coordinationFile = await readCoordinationFile(context.workspaceDir);
    if (!coordinationFile) {
      return;
    }
    if (await hasCoordinationFile(context.bootstrapFiles, coordinationFile.path)) {
      return;
    }
    context.bootstrapFiles = [...context.bootstrapFiles, coordinationFile];
  } catch (err) {
    log.warn(`failed: ${String(err)}`);
  }
};

export default coordinationMdHook;
