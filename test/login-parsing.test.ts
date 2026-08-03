import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LoginFlow } from "../src/commands/login.js";

// the parsing helpers are private implementation details of LoginFlow,
// but they encode the documented pass entry format - so they are tested
// directly via runtime access
const flow = new LoginFlow(false, false) as any;

describe("getUsernameFromLogin", () => {
  it("extracts the username from the documented line format", () => {
    assert.equal(flow.getUsernameFromLogin("username: s-user@corp.com"), "s-user@corp.com");
  });

  it("throws when the username line is missing", () => {
    assert.throws(() => flow.getUsernameFromLogin(undefined), /Add user name in second line/);
  });

  it("throws for an invalid username line", () => {
    assert.throws(() => flow.getUsernameFromLogin("user = s-user@corp.com"), /Invalid username config/);
  });
});

describe("getOriginFromLogin", () => {
  it("extracts the origin from the documented line format", () => {
    assert.equal(flow.getOriginFromLogin("origin: my-idp-origin"), "my-idp-origin");
  });

  it("returns undefined when no origin line exists", () => {
    assert.equal(flow.getOriginFromLogin(undefined), undefined);
    assert.equal(flow.getOriginFromLogin(""), undefined);
  });

  it("throws for an invalid origin line", () => {
    assert.throws(() => flow.getOriginFromLogin("origin=my-idp"), /Invalid origin config/);
  });
});
