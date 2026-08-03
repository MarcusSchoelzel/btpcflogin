import fs from "fs";
import os from "os";
import path from "path";
import { PassThrough } from "stream";

/** Input/output streams that mimic a TTY, usable as @inquirer prompt context */
export type MockIO = {
  input: PassThrough & { isTTY?: boolean; setRawMode?: () => void };
  output: PassThrough & { isTTY?: boolean; columns?: number; rows?: number };
  /** everything the prompt has rendered so far */
  rendered: () => string;
  /** waits until the rendered output contains the given text, then sends the keys */
  answer: (waitForText: string, keys: string) => Promise<void>;
};

/**
 * Creates mock TTY streams to drive @inquirer prompts in tests
 */
export function createMockIO(): MockIO {
  const input: MockIO["input"] = new PassThrough();
  input.isTTY = true;
  input.setRawMode = () => {};

  const output: MockIO["output"] = new PassThrough();
  output.isTTY = true;
  output.columns = 120;
  output.rows = 40;

  let captured = "";
  output.on("data", (chunk) => (captured += chunk.toString()));

  const rendered = () => captured;

  const answer = async (waitForText: string, keys: string) => {
    await waitFor(() => rendered().includes(waitForText), `prompt output containing "${waitForText}"`);
    input.write(keys);
  };

  return { input, output, rendered, answer };
}

/**
 * Polls the given condition until it is true (or fails after 3 seconds)
 */
export async function waitFor(condition: () => boolean, description: string): Promise<void> {
  const timeoutAt = Date.now() + 3000;
  while (!condition()) {
    if (Date.now() > timeoutAt) throw new Error(`Timed out waiting for ${description}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/**
 * Creates a unique temporary directory for a test file run
 */
export function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `btpcflogin-test-${prefix}-`));
}

/**
 * Writes an executable fake binary (Node.js script) into the given directory
 * @returns absolute path of the created executable
 */
export function createFakeBin(directory: string, name: string, script: string): string {
  const binPath = path.join(directory, name);
  fs.writeFileSync(binPath, `#!/usr/bin/env node\n${script}`, { mode: 0o755 });
  return binPath;
}

export const KEY = {
  enter: "\r",
  up: "\x1b[A",
  down: "\x1b[B",
  space: " ",
};

/**
 * Overrides process.platform to test platform specific code paths
 * @returns function that restores the real platform
 */
export function setPlatform(platform: NodeJS.Platform): () => void {
  const original = Object.getOwnPropertyDescriptor(process, "platform")!;
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
  return () => Object.defineProperty(process, "platform", original);
}

/**
 * Test options that skip a describe/it block on Windows, where the fake
 * shebang binaries created by createFakeBin() are not executable
 */
export const fakeBinOptions =
  process.platform === "win32" ? { skip: "fake shebang binaries are not executable on Windows" } : {};
