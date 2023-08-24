import Enquirer from "enquirer";
import { spawnSync } from "child_process";
import fs from "fs";
import chalk from "chalk";
import { cliConfigStore } from "../util/config-store.js";

type DirTreeFile = {
  type: "file" | "directory" | "report";
  name: string;
  contents?: DirTreeFile[];
};

export async function addLogin() {
  try {
    // Logic to determine default password-store directory taken from manual of 'pass'
    const storeDirectory = process.env.PASSWORD_STORE_DIR ?? `${process.env.HOME}/.password-store`;

    if (fs.existsSync(storeDirectory)) {
      // uses 'tree' util to retrieve directory contents as JSON string
      const passwordStoreTreeJson = spawnSync("tree", ["-J", storeDirectory], {
        stdio: ["inherit", "pipe", "pipe"],
      }).stdout.toString();
      const passwordStoreTree = JSON.parse(passwordStoreTreeJson) as DirTreeFile[];
      const possibleLogins: string[] = [];

      collectPasswords(passwordStoreTree[0]?.contents ?? [], possibleLogins);

      if (possibleLogins.length === 0) {
        console.error(chalk.yellowBright("No Logins in Password Store"));
      } else {
        const chosenLogin = (
          await Enquirer.prompt<{ selection: string }>({
            type: "select",
            name: "selection",
            message: "Select 'pass' login",
            choices: possibleLogins,
          })
        ).selection;

        cliConfigStore.addLogin(chosenLogin);
      }
    } else {
      throw new Error("Password store not found");
    }
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
