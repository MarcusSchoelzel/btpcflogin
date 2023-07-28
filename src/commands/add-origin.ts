import Enquirer from "enquirer";
import { cliConfigStore } from "../util/config-store.js";
import chalk from "chalk";

/**
 * Adds new origin of custom identity provider to cli config store
 */
export async function addOrigin() {
  try {
    const newOrigin = (
      await Enquirer.prompt<{ selection: string }>({
        type: "input",
        name: "selection",
        message: "Enter origin of custom Identity Provider"
      })
    ).selection;

    cliConfigStore.addOrigin(newOrigin);
  } catch (error) {
    console.error(chalk.redBright(error));
  }
}
