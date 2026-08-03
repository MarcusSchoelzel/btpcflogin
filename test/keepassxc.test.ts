import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";

import { createFakeBin, createTempDir, fakeBinOptions, setPlatform, waitFor } from "./test-utils.js";

// ---------------------------------------------------------------------------
// test setup: isolated config store, fake keepassxc-cli and fake security.
// The platform is pinned to darwin so that the keychain logic behaves the
// same on Linux CI runners (the fake 'security' binary works there too).
// ---------------------------------------------------------------------------

setPlatform("darwin");

const configDir = createTempDir("kp-configstore");
process.env.XDG_CONFIG_HOME = configDir;
const { KeePassXcCli } = await import("../src/util/keepassxc.js");
const configFile = path.join(configDir, "configstore", "btpcflogin.json");

const binDir = createTempDir("kp-bin");

// fake keepassxc-cli: unlocks with password $KP_PASSWORD (a failed unlock is
// silent, like the real cli with --quiet), output controlled via env vars
const fakeKpCli = createFakeBin(
  binDir,
  "fake-keepassxc-cli",
  `
const fs = require("fs");
const args = process.argv.slice(2);
const [pw] = fs.readFileSync(0, "utf-8").split("\\n");
if (pw !== process.env.KP_PASSWORD) process.exit(1);
if (args[0] === "ls") {
  process.stdout.write(process.env.KP_LS_OUTPUT ?? "");
} else if (args[0] === "show") {
  const attrs = args.filter((a, i) => args[i - 1] === "--attributes");
  if (attrs.includes("origin")) {
    if (!process.env.KP_ORIGIN) { process.stderr.write("ERROR: unknown attribute origin.\\n"); process.exit(1); }
    process.stdout.write(process.env.KP_ORIGIN + "\\n");
  } else {
    process.stdout.write((process.env.KP_USERNAME ?? "") + "\\n" + (process.env.KP_ENTRY_PASSWORD ?? "") + "\\n");
  }
}
`,
);

// fake macOS 'security' tool backed by a JSON file ($FAKE_KEYCHAIN)
createFakeBin(
  binDir,
  "security",
  `
const fs = require("fs");
const store = process.env.FAKE_KEYCHAIN;
const args = process.argv.slice(2);
const db = fs.existsSync(store) ? JSON.parse(fs.readFileSync(store, "utf-8")) : {};
const get = (flag) => args[args.indexOf(flag) + 1];
const key = get("-s") + "|" + get("-a");
if (args[0] === "find-generic-password") {
  if (!(key in db)) process.exit(44);
  if (args.includes("-w")) process.stdout.write(db[key] + "\\n");
} else if (args[0] === "add-generic-password") {
  db[key] = get("-w");
  fs.writeFileSync(store, JSON.stringify(db));
} else process.exit(1);
`,
);
process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH}`;

const databaseFile = path.join(createTempDir("kp-db"), "test.kdbx");
fs.writeFileSync(databaseFile, "not-a-real-kdbx");
const keychainFile = path.join(binDir, "fake-keychain.json");
process.env.FAKE_KEYCHAIN = keychainFile;

// stdin replacement for prompts that read from process.stdin
const mockStdin = new PassThrough() as PassThrough & { isTTY: boolean; setRawMode: () => void };
mockStdin.isTTY = true;
mockStdin.setRawMode = () => {};
Object.defineProperty(process, "stdin", { value: mockStdin, configurable: true });

function seedConfig(overrides: Record<string, unknown> = {}) {
  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  fs.writeFileSync(
    configFile,
    JSON.stringify({
      keePassXcDatabase: databaseFile,
      keePassXcCli: fakeKpCli,
      keePassXcKeychain: true,
      ...overrides,
    }),
  );
}

function seedKeychain(dbPassword?: string) {
  fs.rmSync(keychainFile, { force: true });
  if (dbPassword !== undefined) {
    fs.writeFileSync(keychainFile, JSON.stringify({ [`btpcflogin|${databaseFile}`]: dbPassword }));
  }
}

beforeEach(() => {
  seedConfig();
  seedKeychain("db-pass");
  process.env.KP_PASSWORD = "db-pass";
  process.env.KP_USERNAME = "s-user@corp.com";
  process.env.KP_ENTRY_PASSWORD = "btp-secret";
  delete process.env.KP_ORIGIN;
  delete process.env.KP_LS_OUTPUT;
  delete process.env.BTPCFLOGIN_KDBX;
});

// ---------------------------------------------------------------------------

describe("getDatabasePath", fakeBinOptions, () => {
  it("prefers the BTPCFLOGIN_KDBX env var", async () => {
    process.env.BTPCFLOGIN_KDBX = databaseFile;
    assert.equal(await new KeePassXcCli().getDatabasePath(), databaseFile);
  });

  it("throws when BTPCFLOGIN_KDBX points to a missing file", async () => {
    process.env.BTPCFLOGIN_KDBX = "/nowhere/missing.kdbx";
    await assert.rejects(new KeePassXcCli().getDatabasePath(), /BTPCFLOGIN_KDBX/);
  });

  it("uses the path from the config store", async () => {
    assert.equal(await new KeePassXcCli().getDatabasePath(), databaseFile);
  });

  it("throws when the stored path no longer exists", async () => {
    seedConfig({ keePassXcDatabase: "/nowhere/missing.kdbx" });
    await assert.rejects(new KeePassXcCli().getDatabasePath(), /not found at \/nowhere\/missing.kdbx/);
  });
});

describe("listEntries", fakeBinOptions, () => {
  it("filters groups, empty markers and blank lines", async () => {
    process.env.KP_LS_OUTPUT = "Root/\ncorp/btp-dev\ncorp/btp-prod\n[empty]\n\n";
    assert.deepEqual(await new KeePassXcCli().listEntries(), ["corp/btp-dev", "corp/btp-prod"]);
  });
});

describe("getCredentials", fakeBinOptions, () => {
  it("reads username and password from the entry fields", async () => {
    const credentials = await new KeePassXcCli().getCredentials("corp/btp-dev");
    assert.deepEqual(credentials, { username: "s-user@corp.com", password: "btp-secret", origin: undefined });
  });

  it("includes the optional origin attribute when maintained", async () => {
    process.env.KP_ORIGIN = "my-idp";
    const credentials = await new KeePassXcCli().getCredentials("corp/btp-dev");
    assert.equal(credentials.origin, "my-idp");
  });

  it("throws when no username is maintained", async () => {
    process.env.KP_USERNAME = "";
    await assert.rejects(new KeePassXcCli().getCredentials("corp/btp-dev"), /No user name maintained/);
  });

  it("throws when no password is maintained", async () => {
    process.env.KP_ENTRY_PASSWORD = "";
    await assert.rejects(new KeePassXcCli().getCredentials("corp/btp-dev"), /No password maintained/);
  });
});

describe("cli path resolution", fakeBinOptions, () => {
  it("throws when the stored cli path no longer exists", async () => {
    seedConfig({ keePassXcCli: "/nowhere/keepassxc-cli" });
    await assert.rejects(new KeePassXcCli().listEntries(), /not found anymore at \/nowhere\/keepassxc-cli/);
  });
});

describe("macOS keychain", fakeBinOptions, () => {
  it("unlocks silently with the stored password (no prompt)", async () => {
    process.env.KP_LS_OUTPUT = "entry\n";
    // no stdin interaction planned - would time out if a prompt appeared
    assert.deepEqual(await new KeePassXcCli().listEntries(), ["entry"]);
  });

  it("prompts for the password when opted out and does not touch the keychain", async () => {
    seedConfig({ keePassXcKeychain: false });
    seedKeychain(undefined);
    process.env.KP_LS_OUTPUT = "entry\n";

    const entries = new KeePassXcCli().listEntries();
    setTimeout(() => mockStdin.write("db-pass\r"), 300);
    assert.deepEqual(await entries, ["entry"]);
    assert.equal(fs.existsSync(keychainFile), false);
  });

  it("recovers from an outdated keychain entry and updates it", async (t) => {
    t.mock.method(console, "log", () => {});
    seedKeychain("outdated-pass");
    process.env.KP_LS_OUTPUT = "entry\n";

    const entries = new KeePassXcCli().listEntries();
    // wait for the re-prompt after the failed unlock, then type the current password
    setTimeout(() => mockStdin.write("db-pass\r"), 500);
    assert.deepEqual(await entries, ["entry"]);

    await waitFor(
      () => JSON.parse(fs.readFileSync(keychainFile, "utf-8"))[`btpcflogin|${databaseFile}`] === "db-pass",
      "keychain entry to be updated",
    );
  });

  it("throws a clear error for a wrong manually entered password", async () => {
    seedConfig({ keePassXcKeychain: false });
    seedKeychain(undefined);

    const entries = new KeePassXcCli().listEntries();
    setTimeout(() => mockStdin.write("wrong-pass\r"), 300);
    await assert.rejects(entries, /Could not unlock .*wrong password/);
  });
});
