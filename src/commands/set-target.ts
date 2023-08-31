import chalk from "chalk";
import { CloudFoundryCli } from "../util/cf-cli.js";

/**
 * Changes the current target of the Cloud Foundry CLI via
 * prompting the user for 'org' and 'space'
 */
export async function setCfTarget() {
  try {
    await new CloudFoundryCli().setTarget();
  } catch (error) {
    console.error(chalk.redBright(error));
  }
}
