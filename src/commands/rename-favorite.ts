import Enquirer from "enquirer";
import { ConfigStoreProxy } from "../util/config-store.js";
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

    const { favToEdit } = await Enquirer.prompt<{ favToEdit: string }>({
      type: "autocomplete",
      name: "favToEdit",
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
    console.error(chalk.redBright(error));
  }
}

async function promptForNewName(name: string, existingNames: string[]): Promise<string> {
  const { newName } = await Enquirer.prompt<{ newName: string }>({
    type: "input",
    name: "newName",
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
  return newName;
}
