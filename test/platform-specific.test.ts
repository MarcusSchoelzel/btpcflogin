import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";

import { createFakeBin, createTempDir, fakeBinOptions, setPlatform } from "./test-utils.js";

// ---------------------------------------------------------------------------
// Tests for the Linux (pass), Windows (gopass) and non-macOS code paths.
// process.platform is mocked, the actual execution happens on the host OS -
// therefore all tests rely on fake shebang binaries and are skipped on Windows.
// ---------------------------------------------------------------------------

const configDir = createTempDir("platform-configstore");
process.env.XDG_CONFIG_HOME = configDir;
const { LoginFlow } = await import("../src/commands/login.js");
const { addLogin } = await import("../src/commands/add-login.js");
const { ConfigStoreProxy } = await import("../src/util/config-store.js");
const { KeePassXcCli } = await import("../src/util/keepassxc.js");
const configFile = path.join(configDir, "configstore", "btpcflogin.json");

const binDir = createTempDir("platform-bin");
const argvDump = path.join(binDir, "argv.jsonl");

// fake pass/gopass: dumps argv (incl. own name), then prints $PASS_OUTPUT or fails with $PASS_STDERR
const passScript = `
const fs = require("fs");
const ownName = require("path").basename(process.argv[1] ?? "");
fs.appendFileSync(process.env.PASS_ARGV_DUMP, JSON.stringify([ownName, ...process.argv.slice(2)]) + "\\n");
if (process.env.PASS_STDERR) { process.stderr.write(process.env.PASS_STDERR); process.exit(1); }
process.stdout.write(process.env.PASS_OUTPUT ?? "");
`;
createFakeBin(binDir, "pass", passScript);
createFakeBin(binDir, "gopass", passScript);
// fake macOS 'security': hermetic guard - if the darwin-only check in the
// keychain code regresses, this fake is hit instead of the real keychain
createFakeBin(
  binDir,
  "security",
  `
const fs = require("fs");
if (process.argv[2] === "add-generic-password") fs.writeFileSync(process.env.FAKE_KEYCHAIN, "{}");
process.exit(44);
`,
);
createFakeBin(
  binDir,
  "cf",
  `
const fs = require("fs");
fs.appendFileSync(process.env.PASS_ARGV_DUMP, JSON.stringify(["cf", ...process.argv.slice(2)]) + "\\n");
`,
);
process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH}`;
process.env.PASS_ARGV_DUMP = argvDump;

const receivedArgv = (): string[][] =>
  fs
    .readFileSync(argvDump, "utf-8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));

const mockStdin = new PassThrough() as PassThrough & { isTTY: boolean; setRawMode: () => void };
mockStdin.isTTY = true;
mockStdin.setRawMode = () => {};
Object.defineProperty(process, "stdin", { value: mockStdin, configurable: true });

let restorePlatform: (() => void) | undefined;

beforeEach(() => {
  fs.rmSync(argvDump, { force: true });
  fs.rmSync(configFile, { force: true });
  delete process.env.PASS_OUTPUT;
  delete process.env.PASS_STDERR;
});

afterEach(() => {
  restorePlatform?.();
  restorePlatform = undefined;
});

describe("login with stored credentials on Linux (pass)", fakeBinOptions, () => {
  it("reads the credentials via 'pass show' and forwards them to cf auth", async () => {
    restorePlatform = setPlatform("linux");
    process.env.PASS_OUTPUT = "s3cret\nusername: s-user@corp.com\norigin: my-idp\n";

    await (new LoginFlow(false, false) as any).loginWithStoredCreds("corp/btp");

    assert.deepEqual(receivedArgv(), [
      ["pass", "show", "corp/btp"],
      ["cf", "auth", "s-user@corp.com", "s3cret", "--origin", "my-idp"],
    ]);
  });

  it("omits the origin option for entries without origin line", async () => {
    restorePlatform = setPlatform("linux");
    process.env.PASS_OUTPUT = "s3cret\nusername: s-user@corp.com\n";

    await (new LoginFlow(false, false) as any).loginWithStoredCreds("corp/btp");

    assert.deepEqual(receivedArgv().at(-1), ["cf", "auth", "s-user@corp.com", "s3cret"]);
  });

  it("propagates pass errors", async () => {
    restorePlatform = setPlatform("linux");
    process.env.PASS_STDERR = "corp/btp is not in the password store.";

    await assert.rejects(
      (new LoginFlow(false, false) as any).loginWithStoredCreds("corp/btp"),
      (error: unknown) => error === "corp/btp is not in the password store.",
    );
  });
});

describe("login with stored credentials on Windows (gopass)", fakeBinOptions, () => {
  it("uses the gopass executable instead of pass", async () => {
    restorePlatform = setPlatform("win32");
    // the PATH lookup of 'which' applies Windows semantics when the platform
    // is mocked - an empty entry in PATHEXT accepts extensionless executables
    process.env.PATHEXT = ";";
    process.env.PASS_OUTPUT = "s3cret\nusername: s-user@corp.com\n";

    try {
      await (new LoginFlow(false, false) as any).loginWithStoredCreds("corp/btp");
    } finally {
      delete process.env.PATHEXT;
    }

    assert.deepEqual(receivedArgv(), [
      ["gopass", "show", "corp/btp"],
      ["cf", "auth", "s-user@corp.com", "s3cret"],
    ]);
  });
});

describe("add-login on Linux (pass store)", fakeBinOptions, () => {
  it("lists *.gpg files from PASSWORD_STORE_DIR and stores the selection", async () => {
    restorePlatform = setPlatform("linux");
    const storeDir = createTempDir("pass-store");
    fs.mkdirSync(path.join(storeDir, "corp"), { recursive: true });
    fs.writeFileSync(path.join(storeDir, "corp", "btp.gpg"), "");
    fs.writeFileSync(path.join(storeDir, "other.gpg"), "");
    process.env.PASSWORD_STORE_DIR = storeDir;

    try {
      const pendingAddLogin = addLogin();
      // type the filter first, send enter separately after the list was filtered
      setTimeout(() => mockStdin.write("corp"), 300);
      setTimeout(() => mockStdin.write("\r"), 800);
      await pendingAddLogin;
    } finally {
      delete process.env.PASSWORD_STORE_DIR;
    }

    assert.deepEqual(new ConfigStoreProxy().getLogins(), ["corp/btp"]);
  });

  it("reports a missing password store", async (t) => {
    restorePlatform = setPlatform("linux");
    process.env.PASSWORD_STORE_DIR = "/nowhere/password-store";
    const consoleError = t.mock.method(console, "error", () => {});

    try {
      await addLogin();
    } finally {
      delete process.env.PASSWORD_STORE_DIR;
    }

    assert.match(String(consoleError.mock.calls[0].arguments[0]), /Password store not found/);
  });
});

describe("add-login on Windows (gopass store)", fakeBinOptions, () => {
  it("lists *.gpg files from the gopass root store in LOCALAPPDATA", async () => {
    restorePlatform = setPlatform("win32");
    const localAppData = createTempDir("localappdata");
    const storeDir = path.join(localAppData, "gopass", "stores", "root");
    fs.mkdirSync(storeDir, { recursive: true });
    fs.writeFileSync(path.join(storeDir, "win-entry.gpg"), "");
    process.env.LOCALAPPDATA = localAppData;

    try {
      const pendingAddLogin = addLogin();
      // type the filter first, send enter separately after the list was filtered
      setTimeout(() => mockStdin.write("win"), 300);
      setTimeout(() => mockStdin.write("\r"), 800);
      await pendingAddLogin;
    } finally {
      delete process.env.LOCALAPPDATA;
    }

    assert.deepEqual(new ConfigStoreProxy().getLogins(), ["win-entry"]);
  });
});

describe("keychain caching outside macOS", fakeBinOptions, () => {
  it("never consults or writes the keychain on Linux", async () => {
    restorePlatform = setPlatform("linux");

    const databaseFile = path.join(createTempDir("kp-db-linux"), "test.kdbx");
    fs.writeFileSync(databaseFile, "not-a-real-kdbx");
    const fakeKpCli = createFakeBin(
      path.dirname(databaseFile),
      "fake-keepassxc-cli",
      `
const fs = require("fs");
const [pw] = fs.readFileSync(0, "utf-8").split("\\n");
if (pw !== "db-pass") process.exit(1);
process.stdout.write("entry\\n");
`,
    );
    fs.mkdirSync(path.dirname(configFile), { recursive: true });
    fs.writeFileSync(
      configFile,
      // keychain opted in, but that must have no effect outside macOS
      JSON.stringify({ keePassXcDatabase: databaseFile, keePassXcCli: fakeKpCli, keePassXcKeychain: true }),
    );
    const keychainFile = path.join(path.dirname(databaseFile), "fake-keychain.json");
    process.env.FAKE_KEYCHAIN = keychainFile;

    // the password must be prompted although the keychain is opted in
    const entries = new KeePassXcCli().listEntries();
    setTimeout(() => mockStdin.write("db-pass\r"), 300);
    assert.deepEqual(await entries, ["entry"]);

    assert.equal(fs.existsSync(keychainFile), false);
  });
});
