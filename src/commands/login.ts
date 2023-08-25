import Enquirer from "enquirer";
import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import { spawnSync } from "child_process";

import { SSO_LOGIN_KEY, ConfigStoreProxy } from "../util/config-store.js";
import { CloudFoundryCli } from "../util/cf-cli.js";

export class LoginFlow {
  private cfCli: CloudFoundryCli;
  constructor() {
    this.cfCli = new CloudFoundryCli();
  }
  async run() {
    try {
      clear();
      this.printIntro();

      const { apiRegionDomain } = await this.cfCli.chooseApiRegion();
      const chosenLoginKey = await this.getLoginKey();

      if (chosenLoginKey === SSO_LOGIN_KEY) {
        await this.loginWithSso(apiRegionDomain);
      } else {
        await this.loginWithStoredCreds(chosenLoginKey);
      }

      await this.cfCli.setTarget();
    } catch (error) {
      console.error(chalk.redBright(error));
    }
  }

  private printIntro() {
    console.log(chalk.cyanBright(figlet.textSync("SAP BTP CF", { font: "Poison" })));
  }

  private async getLoginKey() {
    return (
      await Enquirer.prompt<{ selection: string }>({
        type: "autocomplete",
        name: "selection",
        message: "Choose login user",
        choices: [
          { name: SSO_LOGIN_KEY, hint: "Single Sign On with Temporary code" },
          ...new ConfigStoreProxy().getLogins(),
        ],
      })
    ).selection;
  }

  private async loginWithSso(apiRegionDomain: string) {
    const { ssoCode } = await Enquirer.prompt<{ ssoCode: string }>({
      type: "password",
      name: "ssoCode",
      message: `Temporary Authentication Code for SSO ( Get one at https://login.cf.${apiRegionDomain}/passcode ):`,
    });
    return this.cfCli.loginWithSso(ssoCode);
  }

  private async loginWithStoredCreds(passEntry: string) {
    const passShowResult = spawnSync("pass", ["show", passEntry], {
      stdio: ["inherit", "pipe", "pipe"],
    });
    const showResultError = passShowResult.stderr.toString();
    if (showResultError) {
      throw showResultError;
    }
    const btpCredentials = passShowResult.stdout.toString().split("\n");

    return this.cfCli.login(
      this.getUsernameFromLogin(btpCredentials[1]),
      btpCredentials[0],
      this.getOriginFromLogin(btpCredentials[2]),
    );
  }

  private getOriginFromLogin(origin?: string) {
    if (origin) {
      const matchedOrigin = /^origin:\s(.+)$/.exec(origin);
      if (matchedOrigin?.length == 2) {
        return matchedOrigin[1];
      } else {
        throw new Error(`Invalid origin config detected: "${origin}".\nValid format: "origin: originkey"`);
      }
    }
  }

  private getUsernameFromLogin(username?: string) {
    if (!username) {
      throw new Error(`Invalid pass entry\nAdd user name in second line (e.g. "username: test@comp.com")`);
    }
    const matchedUsename = /^username:\s(.+)$/.exec(username);
    if (matchedUsename?.length == 2) {
      return matchedUsename[1];
    } else {
      throw new Error(`Invalid username config detected: "${username}".\nValid format: "username: test@user.com"`);
    }
  }
}
