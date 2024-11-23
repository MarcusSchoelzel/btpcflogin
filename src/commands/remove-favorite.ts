import Enquirer from "enquirer";
import { ConfigStoreProxy } from "../util/config-store.js";
import chalk from "chalk";
import { mapToPromptChoices } from "../util/favorites.js";

export async function removeFavorite() {
  const configStore = new ConfigStoreProxy();

  try {
    const storedFavorites = configStore.getFavorites();
    if (!storedFavorites.length) {
      console.error(chalk.yellow("No Favorites in Configstore!"));
      return;
    }

    const { favToRemove } = await Enquirer.prompt<{ favToRemove: string }>({
      type: "autocomplete",
      name: "favToRemove",
      message: "Select favorite to remove",
      choices: mapToPromptChoices(storedFavorites),
    });

    storedFavorites.splice(
      storedFavorites.findIndex((f) => f.name === favToRemove),
      1,
    );
    configStore.setFavorites(storedFavorites);
  } catch (error) {
    console.error(chalk.redBright(error));
  }
}
