import { ConfigStoreProxy } from "../util/config-store.js";
import { printCliError } from "../util/helper.js";
import { reorder } from "../util/prompts.js";
import chalk from "chalk";

/**
 * Sorts the available pass logins in the configstore
 */
export async function sortLogins() {
  const configStore = new ConfigStoreProxy();

  try {
    const storedLogins = configStore.getLogins();
    if (!storedLogins.length) {
      console.error(chalk.yellow("No Logins in Configstore!"));
      return;
    }

    if (storedLogins.length === 1) {
      console.log(chalk.yellow("Only 1 Login available. Sorting not possible!"));
      return;
    }

    const sortedLogins = await reorder({
      message: "Reorder pass logins",
      choices: storedLogins.map((login) => ({ value: login })),
    });

    configStore.setLogins(sortedLogins);
  } catch (error) {
    printCliError(error);
  }
}
