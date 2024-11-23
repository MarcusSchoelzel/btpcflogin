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
