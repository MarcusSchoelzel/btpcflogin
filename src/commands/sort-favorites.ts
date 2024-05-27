import Enquirer from "enquirer";
import { ConfigStoreProxy, Favorite } from "../util/config-store.js";
import chalk from "chalk";

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
      choices: storedFavorites.map((f) => f.name),
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
