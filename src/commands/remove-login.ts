import { ConfigStoreProxy } from "../util/config-store.js";
import { printCliError } from "../util/helper.js";
import { autocomplete } from "../util/prompts.js";
import chalk from "chalk";

export async function removeLogin() {
  const configStore = new ConfigStoreProxy();

  try {
    const storedLogins = configStore.getLogins();
    if (!storedLogins.length) {
      console.error(chalk.yellow("No Logins in Configstore!"));
      return;
    }

    const loginToRemove = await autocomplete({
      message: "Select 'pass' login to remove",
      choices: storedLogins.map((login) => ({ value: login })),
    });

    configStore.removeLogin(loginToRemove);
  } catch (error) {
    printCliError(error);
  }
}
