import assert from "node:assert/strict";
import path from "node:path";
import { describe, it, mock } from "node:test";
import { pathToFileURL } from "node:url";

import { assertCmdInPath, getDirname, printCliError } from "../src/util/helper.js";

describe("getDirname", () => {
  it("returns the directory of a file url", () => {
    // Use pathToFileURL so the URL is valid on both POSIX and Windows (which requires a drive letter).
    const filePath = path.resolve("some", "deep", "directory", "file.js");
    assert.equal(getDirname(pathToFileURL(filePath).href), path.dirname(filePath));
  });
});

describe("assertCmdInPath", () => {
  it("resolves for an executable on the PATH", async () => {
    await assert.doesNotReject(assertCmdInPath("node"));
  });

  it("rejects for an unknown executable", async () => {
    await assert.rejects(assertCmdInPath("surely-not-installed-42"), {
      message: "Required executable 'surely-not-installed-42' could not be found on the PATH",
    });
  });

  it("uses the label in the error message when provided", async () => {
    await assert.rejects(assertCmdInPath("surely-not-installed-42", "my-tool (install hint)"), {
      message: "Required executable 'my-tool (install hint)' could not be found on the PATH",
    });
  });
});

describe("printCliError", () => {
  it("prints regular errors to the console", (t) => {
    const consoleError = t.mock.method(console, "error", () => {});
    printCliError(new Error("something broke"));
    assert.equal(consoleError.mock.callCount(), 1);
    assert.match(consoleError.mock.calls[0].arguments[0], /something broke/);
  });

  it("prints thrown non-Error values", (t) => {
    const consoleError = t.mock.method(console, "error", () => {});
    printCliError("plain error string");
    assert.equal(consoleError.mock.callCount(), 1);
    assert.match(consoleError.mock.calls[0].arguments[0], /plain error string/);
  });

  it("ignores cancelled prompts (ExitPromptError)", (t) => {
    const consoleError = t.mock.method(console, "error", () => {});
    const exitPromptError = new Error("User force closed the prompt");
    exitPromptError.name = "ExitPromptError";
    printCliError(exitPromptError);
    assert.equal(consoleError.mock.callCount(), 0);
  });
});
