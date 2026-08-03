import { input } from "@inquirer/prompts";
import { ConfigStoreProxy } from "../util/config-store.js";
import { printCliError } from "../util/helper.js";
import { autocomplete } from "../util/prompts.js";
import chalk from "chalk";
import { mapToPromptChoices } from "../util/favorites.js";

export async function renameFavorite() {
  const configStore = new ConfigStoreProxy();

  try {
    const storedFavorites = configStore.getFavorites();
    if (!storedFavorites.length) {
      console.error(chalk.yellow("No Favorites in Configstore!"));
      return;
    }

    const favToEdit = await autocomplete({
      message: "Select favorite to rename",
      choices: mapToPromptChoices(storedFavorites),
    });

    const favorite = storedFavorites.find((f) => f.name === favToEdit)!;

    favorite.name = await promptForNewName(
      favorite.name,
      storedFavorites.filter((f) => f.name !== favToEdit).map((f) => f.name),
    );

    configStore.setFavorites(storedFavorites);
  } catch (error) {
    printCliError(error);
  }
}

async function promptForNewName(name: string, existingNames: string[]): Promise<string> {
  return input({
    message: "Enter new name",
    validate(value) {
      if (value === name) {
        return `Favorite is already named '${value}'`;
      } else if (existingNames.includes(value)) {
        return "Favorite with same name already exists";
      }
      return true;
    },
  });
}
