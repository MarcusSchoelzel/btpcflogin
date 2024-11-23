import Enquirer from "enquirer";
import { ConfigStoreProxy } from "../util/config-store.js";
import chalk from "chalk";
import { Favorite, mapToPromptChoices } from "../util/favorites.js";

export async function sortFavorites() {
  const configStore = new ConfigStoreProxy();

  try {
    const storedFavorites = configStore.getFavorites();
    if (!storedFavorites.length) {
      console.error(chalk.yellow("No Favorites in Configstore!"));
      return;
    }

    if (storedFavorites.length === 1) {
      console.log(chalk.yellow("Only 1 Favorite available. Sorting not possible!"));
      return;
    }

    const { sortedFavNames } = await Enquirer.prompt<{ sortedFavNames: string[] }>({
      type: "sort",
      name: "sortedFavNames",
      message: "Reorder Favorites",
      choices: mapToPromptChoices(storedFavorites),
    } as any);

    const sortedFavorites: Favorite[] = [];
    for (const name of sortedFavNames) {
      sortedFavorites.push(storedFavorites.find((f) => f.name === name)!);
    }
    configStore.setFavorites(sortedFavorites);
  } catch (error) {
    console.error(chalk.redBright(error));
  }
}
