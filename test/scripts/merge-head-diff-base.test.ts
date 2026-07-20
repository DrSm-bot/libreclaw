import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseArgs, resolveMergeHeadDiffBase } from "../../scripts/lib/merge-head-diff-base.mjs";

const tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    rmSync(tempDir, { force: true, recursive: true });
  }
});

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function writeRepoFile(repoDir: string, filePath: string, contents: string): void {
  const absolutePath = path.join(repoDir, filePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents, "utf8");
}

describe("merge-head-diff-base", () => {
  it("parses explicit refs", () => {
    expect(parseArgs(["--base", "origin/main", "--head", "HEAD"])).toEqual({
      base: "origin/main",
      head: "HEAD",
      preferFirstParent: false,
    });
  });

  it("rejects missing refs", () => {
    expect(() => parseArgs(["--base", "--head", "HEAD"])).toThrow("--base requires a value");
    expect(() => parseArgs(["--base", "-h", "--head", "HEAD"])).toThrow("--base requires a value");
    expect(() => parseArgs(["--head"])).toThrow("--head requires a value");
    expect(() => parseArgs(["--head", "-h"])).toThrow("--head requires a value");
    expect(() => parseArgs(["--base", ""])).toThrow("--base requires a value");
  });

  it("keeps empty base resolution as the no-op programmatic default", () => {
    expect(resolveMergeHeadDiffBase({ base: "", preferFirstParent: true })).toBe("");
  });

  it("uses a bridged PR head first parent when the synthetic merge first parent is the base", () => {
    const repoDir = mkdtempSync(path.join(os.tmpdir(), "openclaw-merge-head-bridge-"));
    tempDirs.push(repoDir);

    git(repoDir, ["init", "-b", "main"]);
    git(repoDir, ["config", "user.email", "ci@example.invalid"]);
    git(repoDir, ["config", "user.name", "CI"]);
    writeRepoFile(repoDir, "README.md", "base\n");
    git(repoDir, ["add", "."]);
    git(repoDir, ["commit", "-m", "base"]);

    git(repoDir, ["switch", "-c", "feature"]);
    writeRepoFile(repoDir, "src/pr.ts", "export const pr = true;\n");
    git(repoDir, ["add", "."]);
    git(repoDir, ["commit", "-m", "feature"]);
    const featureTipBeforeBridge = git(repoDir, ["rev-parse", "HEAD"]);

    git(repoDir, ["switch", "main"]);
    writeRepoFile(repoDir, "src/main-only.ts", "export const mainOnly = true;\n");
    git(repoDir, ["add", "."]);
    git(repoDir, ["commit", "-m", "main only"]);
    const base = git(repoDir, ["rev-parse", "HEAD"]);

    git(repoDir, ["switch", "feature"]);
    git(repoDir, ["merge", "-s", "ours", "--no-ff", "main", "-m", "bridge main ancestry"]);
    const bridgedPrHead = git(repoDir, ["rev-parse", "HEAD"]);

    git(repoDir, ["switch", "main"]);
    git(repoDir, ["merge", "--no-ff", "feature", "-m", "synthetic pr merge"]);

    expect(git(repoDir, ["rev-list", "--parents", "-n", "1", "HEAD"]).split(/\s+/u)).toEqual([
      git(repoDir, ["rev-parse", "HEAD"]),
      base,
      bridgedPrHead,
    ]);
    expect(
      resolveMergeHeadDiffBase({ base, head: "HEAD", cwd: repoDir, preferFirstParent: true }),
    ).toBe(featureTipBeforeBridge);
  });
});
