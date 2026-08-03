import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { autocomplete, reorder, Separator } from "../src/util/prompts.js";
import { createMockIO, KEY } from "./test-utils.js";

const REGION_CHOICES = [
  { value: "eu10", name: "eu10 - Europe (Frankfurt)", description: "Amazon Web Services" },
  { value: "eu20", name: "eu20 - Europe (Netherlands)", description: "Microsoft Azure" },
  { value: "us10", name: "us10 - US East (VA)", description: "Amazon Web Services" },
];

describe("autocomplete", () => {
  it("returns the default choice when enter is pressed immediately", async () => {
    const io = createMockIO();
    const selection = autocomplete({ message: "pick region", choices: REGION_CHOICES, default: "eu20" }, io);
    await io.answer("pick region", KEY.enter);
    assert.equal(await selection, "eu20");
  });

  it("filters choices by their display name", async () => {
    const io = createMockIO();
    const selection = autocomplete({ message: "pick region", choices: REGION_CHOICES }, io);
    await io.answer("pick region", "netherlands");
    await io.answer("Netherlands", KEY.enter);
    assert.equal(await selection, "eu20");
  });

  it("falls back to filtering by value when no display name exists", async () => {
    const io = createMockIO();
    const selection = autocomplete(
      { message: "pick login", choices: [{ value: "corp/btp" }, { value: "corp/other" }] },
      io,
    );
    await io.answer("pick login", "other");
    await io.answer("other", KEY.enter);
    assert.equal(await selection, "corp/other");
  });

  it("drops separators while filtering", async () => {
    const io = createMockIO();
    const selection = autocomplete(
      { message: "choose", choices: [{ value: "sso" }, new Separator(), { value: "corp/btp" }] },
      io,
    );
    await io.answer("choose", "btp");
    await io.answer("btp", KEY.enter);
    assert.equal(await selection, "corp/btp");
  });
});

describe("reorder", () => {
  const choices = () => [{ value: "one" }, { value: "two" }, { value: "three" }];

  it("returns the unchanged order when enter is pressed immediately", async () => {
    const io = createMockIO();
    const result = reorder({ message: "sort", choices: choices() }, io);
    await io.answer("sort", KEY.enter);
    assert.deepEqual(await result, ["one", "two", "three"]);
  });

  it("moves a grabbed entry down", async () => {
    const io = createMockIO();
    const result = reorder({ message: "sort", choices: choices() }, io);
    await io.answer("sort", KEY.space + KEY.down + KEY.down + KEY.space + KEY.enter);
    assert.deepEqual(await result, ["two", "three", "one"]);
  });

  it("moves a grabbed entry up", async () => {
    const io = createMockIO();
    const result = reorder({ message: "sort", choices: choices() }, io);
    await io.answer("sort", KEY.down + KEY.space + KEY.up + KEY.space + KEY.enter);
    assert.deepEqual(await result, ["two", "one", "three"]);
  });

  it("moves only the cursor when nothing is grabbed", async () => {
    const io = createMockIO();
    const result = reorder({ message: "sort", choices: choices() }, io);
    await io.answer("sort", KEY.down + KEY.up + KEY.down + KEY.enter);
    assert.deepEqual(await result, ["one", "two", "three"]);
  });

  it("ignores moves beyond the list boundaries", async () => {
    const io = createMockIO();
    const result = reorder({ message: "sort", choices: choices() }, io);
    // grab first entry, try to move above the top, then move to the very
    // bottom and try to move further down
    await io.answer("sort", KEY.space + KEY.up + KEY.down + KEY.down + KEY.down + KEY.enter);
    assert.deepEqual(await result, ["two", "three", "one"]);
  });

  it("shows the entry descriptions in the list", async () => {
    const io = createMockIO();
    const result = reorder(
      { message: "sort", choices: [{ value: "dev", description: "Region: eu10" }, { value: "prod" }] },
      io,
    );
    await io.answer("Region: eu10", KEY.enter);
    await result;
    assert.match(io.rendered(), /Region: eu10/);
  });
});
