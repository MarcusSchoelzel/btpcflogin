import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import fs from "fs";
import path from "path";

import { CloudFoundryCli } from "../src/util/cf-cli.js";
import { createFakeBin, createTempDir, fakeBinOptions } from "./test-utils.js";

// fake 'cf' executable, controlled via environment variables:
// - CF_ARGV_DUMP: file to append the received argv to (as JSON lines)
// - CF_STDOUT / CF_STDERR: canned output
// - CF_SIGINT: kill itself with SIGINT
const binDir = createTempDir("cf-bin");
createFakeBin(
  binDir,
  "cf",
  `
const fs = require("fs");
if (process.env.CF_ARGV_DUMP) fs.appendFileSync(process.env.CF_ARGV_DUMP, JSON.stringify(process.argv.slice(2)) + "\\n");
if (process.env.CF_SIGINT) process.kill(process.pid, "SIGINT");
if (process.env.CF_STDERR) { process.stderr.write(process.env.CF_STDERR); process.exit(1); }
if (process.env.CF_STDOUT) process.stdout.write(process.env.CF_STDOUT);
`,
);
process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH}`;

const argvDump = path.join(binDir, "argv.jsonl");
const receivedArgv = (): string[][] =>
  fs
    .readFileSync(argvDump, "utf-8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));

beforeEach(() => {
  fs.rmSync(argvDump, { force: true });
  process.env.CF_ARGV_DUMP = argvDump;
  delete process.env.CF_STDOUT;
  delete process.env.CF_STDERR;
  delete process.env.CF_SIGINT;
});

describe("login", fakeBinOptions, () => {
  it("passes user and password verbatim to cf auth", async () => {
    const nastyPassword = 'pa$s"w`rd; rm -rf $(HOME)';
    await new CloudFoundryCli().login("user@corp.com", nastyPassword);
    assert.deepEqual(receivedArgv(), [["auth", "user@corp.com", nastyPassword]]);
  });

  it("appends the origin option when provided", async () => {
    await new CloudFoundryCli().login("user@corp.com", "secret", "my-idp");
    assert.deepEqual(receivedArgv(), [["auth", "user@corp.com", "secret", "--origin", "my-idp"]]);
  });

  it("unwraps the error_description of a JSON error response", async () => {
    process.env.CF_STDERR = JSON.stringify({ error_description: "Bad credentials" });
    await assert.rejects(new CloudFoundryCli().login("user", "wrong"), { message: "Bad credentials" });
  });

  it("throws plain stderr output as error", async () => {
    process.env.CF_STDERR = "API endpoint not set";
    await assert.rejects(new CloudFoundryCli().login("user", "pw"), { message: "API endpoint not set" });
  });

  it("reports a cancelled process (SIGINT)", async () => {
    process.env.CF_SIGINT = "1";
    await assert.rejects(new CloudFoundryCli().login("user", "pw"), { message: "Process terminated!" });
  });
});

describe("loginWithSso", fakeBinOptions, () => {
  it("passes the passcode verbatim", async () => {
    await new CloudFoundryCli().loginWithSso('pass"code$1');
    assert.deepEqual(receivedArgv(), [["l", "--sso-passcode", 'pass"code$1']]);
  });
});

describe("setOrg / setSpace", fakeBinOptions, () => {
  it("passes org and space names verbatim", () => {
    const cli = new CloudFoundryCli();
    cli.setOrg("My Org (prod)");
    cli.setSpace('space "quoted"');
    assert.deepEqual(receivedArgv(), [
      ["target", "-o", "My Org (prod)"],
      ["target", "-s", 'space "quoted"'],
    ]);
  });

  it("propagates cf errors", () => {
    process.env.CF_STDERR = "Organization 'nope' not found";
    assert.throws(() => new CloudFoundryCli().setOrg("nope"), /Organization 'nope' not found/);
  });
});

describe("chooseApiRegion", fakeBinOptions, () => {
  it("targets the default domain for a given region", async () => {
    const result = await new CloudFoundryCli().chooseApiRegion("eu10");
    assert.deepEqual(result, { apiRegionCode: "eu10", apiRegionDomain: "eu10.hana.ondemand.com" });
    assert.deepEqual(receivedArgv(), [["api", "api.cf.eu10.hana.ondemand.com"]]);
  });

  it("uses the china domain for cn20 and cn40", async () => {
    assert.equal((await new CloudFoundryCli().chooseApiRegion("cn20")).apiRegionDomain, "cn20.platform.sapcloud.cn");
    assert.equal((await new CloudFoundryCli().chooseApiRegion("cn40")).apiRegionDomain, "cn40.platform.sapcloud.cn");
  });
});

describe("setOrgInteractively / setSpaceInteractively", fakeBinOptions, () => {
  it("returns false when no orgs are found", async (t) => {
    t.mock.method(console, "log", () => {});
    process.env.CF_STDOUT = "Getting orgs as user...\n\nNo orgs found.\n";
    assert.equal(await new CloudFoundryCli().setOrgInteractively(), false);
  });

  it("automatically selects the only available org", async (t) => {
    t.mock.method(console, "log", () => {});
    process.env.CF_STDOUT = "Getting orgs as user...\n\nname\nsingle-org\n";
    assert.equal(await new CloudFoundryCli().setOrgInteractively(), true);
    assert.deepEqual(receivedArgv().at(-1), ["target", "-o", "single-org"]);
  });

  it("returns false when no spaces are found", async (t) => {
    t.mock.method(console, "log", () => {});
    process.env.CF_STDOUT = "Getting spaces in org...\n\nNo spaces found.\n";
    assert.equal(await new CloudFoundryCli().setSpaceInteractively(), false);
  });

  it("automatically selects the only available space", async (t) => {
    t.mock.method(console, "log", () => {});
    process.env.CF_STDOUT = "Getting spaces in org...\n\nname\nsingle-space\n";
    assert.equal(await new CloudFoundryCli().setSpaceInteractively(), true);
    assert.deepEqual(receivedArgv().at(-1), ["target", "-s", "single-space"]);
  });
});

describe("getCurrentConfig", fakeBinOptions, () => {
  const homeDir = createTempDir("cf-home");
  const cfConfig = path.join(homeDir, ".cf", "config.json");

  it("parses a valid cf config", () => {
    process.env.HOME = homeDir;
    fs.mkdirSync(path.dirname(cfConfig), { recursive: true });
    fs.writeFileSync(
      cfConfig,
      JSON.stringify({
        Target: "https://api.cf.eu10.hana.ondemand.com",
        SpaceFields: { Name: "my-space" },
        OrganizationFields: { Name: "my-org" },
      }),
    );

    const config = new CloudFoundryCli().getCurrentConfig();
    assert.equal(config.Target, "https://api.cf.eu10.hana.ondemand.com");
    assert.equal(config.OrganizationFields.Name, "my-org");
    assert.equal(config.SpaceFields.Name, "my-space");
  });

  it("throws when the cf config does not exist", () => {
    process.env.HOME = createTempDir("cf-home-empty");
    assert.throws(() => new CloudFoundryCli().getCurrentConfig(), /CF Config not found!/);
  });

  it("throws when the cf config has an unexpected structure", () => {
    process.env.HOME = homeDir;
    fs.mkdirSync(path.dirname(cfConfig), { recursive: true });
    fs.writeFileSync(cfConfig, JSON.stringify({ Target: 42 }));
    assert.throws(() => new CloudFoundryCli().getCurrentConfig());
  });
});
