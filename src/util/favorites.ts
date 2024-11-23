import z from "zod";

const favoriteSchema = z.object({
  name: z.string(),
  region: z.string(),
  org: z.string(),
  space: z.string(),
  sso: z.boolean(),
  passLogin: z.string().optional(),
});
export const favoritesSchema = favoriteSchema.array().optional();

export type Favorite = z.infer<typeof favoriteSchema>;

export function mapToPromptChoices(favorites: Favorite[]) {
  return favorites.map((f) => ({
    name: f.name,
    hint: `Region: ${f.region}, Org: ${f.org}, Space: ${f.space}${f.sso ? `, Login: ${f.passLogin}` : ""}`,
  }));
}
