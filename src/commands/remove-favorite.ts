import { ConfigStoreProxy } from "../util/config-store.js";
import { printCliError } from "../util/helper.js";
import { autocomplete } from "../util/prompts.js";
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

    const favToRemove = await autocomplete({
      message: "Select favorite to remove",
      choices: mapToPromptChoices(storedFavorites),
    });

    storedFavorites.splice(
      storedFavorites.findIndex((f) => f.name === favToRemove),
      1,
    );
    configStore.setFavorites(storedFavorites);
  } catch (error) {
    printCliError(error);
  }
}
