import Enquirer from "enquirer";
import fs from "fs";
import chalk from "chalk";
import { ConfigStoreProxy } from "../util/config-store.js";
import path from "path";

export async function addLogin() {
  try {
    const storeDirectory = process.platform === "linux" ? getPassStorePath() : getGoPassStorePath();
    if (!fs.existsSync(storeDirectory)) throw new Error("Password store not found");
    let possibleLogins = readPasswordStoreLogins(storeDirectory);

    if (possibleLogins.length === 0) {
      console.error(chalk.yellowBright("No Logins in Password Store"));
      return;
    }

    const configStore = new ConfigStoreProxy();
    // keep only logins that are not already in the store
    possibleLogins = possibleLogins.filter((login) => configStore.getLogins().indexOf(login) === -1);
    if (possibleLogins.length === 0) {
      console.error(chalk.yellowBright("All Pass Logins already added to configstore!"));
      return;
    }

    const chosenLogin = (
      await Enquirer.prompt<{ selection: string }>({
        type: "autocomplete",
        name: "selection",
        message: "Select 'pass' login",
        choices: possibleLogins,
      })
    ).selection;

    configStore.addLogin(chosenLogin);
  } catch (error) {
    console.error(chalk.redBright(error));
  }
}

function readPasswordStoreLogins(path: string): string[] {
  return (
    (fs.readdirSync(path, { recursive: true }) as string[])
      .filter((f) => f.endsWith(".gpg"))
      .map((f) => f.split(".")[0].replace(/\\/g, "/")) ?? []
  );
}

function getPassStorePath() {
  return process.env.PASSWORD_STORE_DIR ?? `${process.env.HOME}/.password-store`;
}

function getGoPassStorePath() {
  return path.join(process.env.LOCALAPPDATA as string, "gopass", "stores", "root");
}
