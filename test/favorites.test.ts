import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { favoritesSchema, mapToPromptChoices, type Favorite } from "../src/util/favorites.js";

const validFavorite: Favorite = {
  name: "dev",
  region: "eu10",
  org: "my-org",
  space: "my-space",
  sso: false,
  passLogin: "corp/btp",
};

describe("favoritesSchema", () => {
  it("parses a valid favorites array", () => {
    assert.deepEqual(favoritesSchema.parse([validFavorite]), [validFavorite]);
  });

  it("allows a missing passLogin (sso favorites)", () => {
    const { passLogin, ...ssoFavorite } = { ...validFavorite, sso: true };
    assert.deepEqual(favoritesSchema.parse([ssoFavorite]), [ssoFavorite]);
  });

  it("allows undefined (no favorites stored yet)", () => {
    assert.equal(favoritesSchema.parse(undefined), undefined);
  });

  it("rejects entries with missing required properties", () => {
    assert.throws(() => favoritesSchema.parse([{ name: "incomplete" }]));
  });

  it("rejects non-array values", () => {
    assert.throws(() => favoritesSchema.parse({ name: "not-an-array" }));
  });
});

describe("mapToPromptChoices", () => {
  it("maps favorites to prompt choices with a description", () => {
    const [choice] = mapToPromptChoices([validFavorite]);
    assert.equal(choice.value, "dev");
    assert.match(choice.description, /Region: eu10/);
    assert.match(choice.description, /Org: my-org/);
    assert.match(choice.description, /Space: my-space/);
  });

  it("keeps the favorite order", () => {
    const favorites = [validFavorite, { ...validFavorite, name: "prod" }];
    assert.deepEqual(
      mapToPromptChoices(favorites).map((c) => c.value),
      ["dev", "prod"],
    );
  });
});
