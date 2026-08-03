import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "fs";
import path from "path";

import { getDirname } from "../src/util/helper.js";

const regions = JSON.parse(
  fs.readFileSync(path.join(getDirname(import.meta.url), "..", "data", "regions-data.json"), "utf-8"),
) as { name: string; message: string; hint: string }[];

describe("regions-data.json", () => {
  it("contains only complete entries", () => {
    for (const region of regions) {
      assert.equal(typeof region.name, "string", `name missing in ${JSON.stringify(region)}`);
      assert.ok(region.name.length > 0);
      assert.equal(typeof region.message, "string", `message missing for ${region.name}`);
      assert.equal(typeof region.hint, "string", `hint missing for ${region.name}`);
    }
  });

  it("has unique region keys", () => {
    const names = regions.map((r) => r.name);
    assert.equal(new Set(names).size, names.length);
  });

  it("contains the default region of the login prompt (eu20)", () => {
    // cf-cli.ts places the initial cursor on eu20 - it must exist in the data
    assert.ok(regions.some((r) => r.name === "eu20"));
  });

  it("starts every message with the padded region key", () => {
    for (const region of regions) {
      assert.ok(
        region.message.startsWith(`${region.name.padEnd(8)} - `),
        `message of ${region.name} does not start with the padded region key: "${region.message}"`,
      );
    }
  });

  it("uses valid region key formats", () => {
    for (const region of regions) {
      assert.match(region.name, /^[a-z]{2}\d{2}(-\d{3})?$/, `unexpected region key format: ${region.name}`);
    }
  });
});
