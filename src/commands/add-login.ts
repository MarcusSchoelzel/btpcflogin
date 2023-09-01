import Enquirer from "enquirer";
import { spawnSync } from "child_process";
import fs from "fs";
import chalk from "chalk";
import { ConfigStoreProxy } from "../util/config-store.js";

type DirTreeFile = {
  type: "file" | "directory" | "report";
  name: string;
  contents?: DirTreeFile[];
};

export async function addLogin() {
  try {
    // Logic to determine default password-store directory taken from manual of 'pass'
    const storeDirectory = process.env.PASSWORD_STORE_DIR ?? `${process.env.HOME}/.password-store`;

    if (!fs.existsSync(storeDirectory)) throw new Error("Password store not found");

    // uses 'tree' util to retrieve directory contents as JSON string
    const passwordStoreTreeJson = spawnSync("tree", ["-J", storeDirectory], {
      stdio: ["inherit", "pipe", "pipe"],
    }).stdout.toString();
    const passwordStoreTree = JSON.parse(passwordStoreTreeJson) as DirTreeFile[];
    let possibleLogins: string[] = [];

    collectPasswords(passwordStoreTree[0]?.contents ?? [], possibleLogins);

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

function collectPasswords(dirContents: DirTreeFile[], possibleLogins: string[], pwPrefix = "") {
  for (let file of dirContents) {
    if (file.type === "directory") {
      collectPasswords(file.contents ?? [], possibleLogins, `${pwPrefix}${file.name}/`);
    } else if (file.type === "file" && file.name.endsWith(".gpg")) {
      const loginFileName = file.name.split(".")[0];
      possibleLogins.push(`${pwPrefix}${loginFileName}`);
    }
  }
}
