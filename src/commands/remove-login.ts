import Enquirer from "enquirer";
import { ConfigStoreProxy } from "../util/config-store.js";
import chalk from "chalk";

export async function removeLogin() {
  const configStore = new ConfigStoreProxy();

  try {
    const storedLogins = configStore.getLogins();
    if (!storedLogins.length) {
      console.error(chalk.yellow("No Logins in Configstore!"));
      return;
    }

    const loginToRemove = (
      await Enquirer.prompt<{ selection: string }>({
        type: "autocomplete",
        name: "selection",
        message: "Select 'pass' login to remove",
        choices: storedLogins,
      })
    ).selection;

    configStore.removeLogin(loginToRemove);
  } catch (error) {
    console.error(chalk.redBright(error));
  }
}
