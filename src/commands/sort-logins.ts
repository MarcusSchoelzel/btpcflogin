import Enquirer from "enquirer";
import { ConfigStoreProxy } from "../util/config-store.js";
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

    const sortedLogins = (
      await Enquirer.prompt<{ logins: string[] }>({
        type: "sort",
        name: "logins",
        message: "Reorder pass logins",
        choices: storedLogins,
      } as any)
    ).logins;

    configStore.setLogins(sortedLogins);
  } catch (error) {
    console.error(chalk.redBright(error));
  }
}
