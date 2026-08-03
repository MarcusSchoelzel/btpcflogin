import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import fs from "fs";
import path from "path";

import { createTempDir } from "./test-utils.js";

// isolate the config store: XDG_CONFIG_HOME must be set before the
// configstore package (via xdg-basedir) is imported
const configDir = createTempDir("configstore");
process.env.XDG_CONFIG_HOME = configDir;
const { ConfigStoreProxy } = await import("../src/util/config-store.js");

const configFile = path.join(configDir, "configstore", "btpcflogin.json");

const validFavorite = {
  name: "dev",
  region: "eu10",
  org: "my-org",
  space: "my-space",
  sso: false,
  passLogin: "corp/btp",
};

beforeEach(() => {
  fs.rmSync(configFile, { force: true });
});

describe("logins", () => {
  it("returns an empty array for a fresh store", () => {
    assert.deepEqual(new ConfigStoreProxy().getLogins(), []);
  });

  it("adds and retrieves logins", () => {
    const store = new ConfigStoreProxy();
    store.addLogin("corp/btp");
    store.addLogin("corp/other");
    assert.deepEqual(store.getLogins(), ["corp/btp", "corp/other"]);
  });

  it("rejects duplicate logins", () => {
    const store = new ConfigStoreProxy();
    store.addLogin("corp/btp");
    assert.throws(() => store.addLogin("corp/btp"), /already included/);
  });

  it("removes an existing login", () => {
    const store = new ConfigStoreProxy();
    store.setLogins(["a", "b", "c"]);
    store.removeLogin("b");
    assert.deepEqual(store.getLogins(), ["a", "c"]);
  });

  it("throws when removing an unknown login", () => {
    assert.throws(() => new ConfigStoreProxy().removeLogin("unknown"), /not found/);
  });

  it("throws a helpful error when the stored value is not an array", () => {
    fs.mkdirSync(path.dirname(configFile), { recursive: true });
    fs.writeFileSync(configFile, JSON.stringify({ passLogins: "not-an-array" }));
    assert.throws(() => new ConfigStoreProxy().getLogins(), /not of type Array/);
  });
});

describe("favorites", () => {
  it("returns an empty array for a fresh store", () => {
    assert.deepEqual(new ConfigStoreProxy().getFavorites(), []);
  });

  it("adds and retrieves favorites", () => {
    const store = new ConfigStoreProxy();
    store.addFavorite(validFavorite);
    assert.deepEqual(store.getFavorites(), [validFavorite]);
  });

  it("rejects a duplicate favorite name without overwrite flag", () => {
    const store = new ConfigStoreProxy();
    store.addFavorite(validFavorite);
    assert.throws(() => store.addFavorite({ ...validFavorite, org: "other" }), /already exists/);
  });

  it("overwrites an existing favorite when requested", () => {
    const store = new ConfigStoreProxy();
    store.addFavorite(validFavorite);
    store.addFavorite({ ...validFavorite, org: "other" }, true);
    assert.equal(store.getFavorites()[0].org, "other");
    assert.equal(store.getFavorites().length, 1);
  });

  it("throws a helpful error for corrupt favorites in the store", () => {
    fs.mkdirSync(path.dirname(configFile), { recursive: true });
    fs.writeFileSync(configFile, JSON.stringify({ favoriteTargets: [{ name: 42 }] }));
    assert.throws(() => new ConfigStoreProxy().getFavorites(), /favoriteTargets.*invalid/);
  });
});

describe("KeePassXC settings", () => {
  it("stores and retrieves the database path", () => {
    const store = new ConfigStoreProxy();
    assert.equal(store.getKeePassXcDatabase(), undefined);
    store.setKeePassXcDatabase("/tmp/db.kdbx");
    assert.equal(store.getKeePassXcDatabase(), "/tmp/db.kdbx");
  });

  it("stores and retrieves the cli path", () => {
    const store = new ConfigStoreProxy();
    assert.equal(store.getKeePassXcCliPath(), undefined);
    store.setKeePassXcCliPath("/opt/keepassxc-cli");
    assert.equal(store.getKeePassXcCliPath(), "/opt/keepassxc-cli");
  });

  it("stores and retrieves the keychain opt-in (tri-state)", () => {
    const store = new ConfigStoreProxy();
    assert.equal(store.getKeePassXcKeychainOptIn(), undefined);
    store.setKeePassXcKeychainOptIn(false);
    assert.equal(store.getKeePassXcKeychainOptIn(), false);
    store.setKeePassXcKeychainOptIn(true);
    assert.equal(store.getKeePassXcKeychainOptIn(), true);
  });
});
