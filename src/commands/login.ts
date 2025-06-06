import Enquirer from "enquirer";
import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import { spawnSync } from "child_process";

import { SSO_LOGIN_KEY, ConfigStoreProxy } from "../util/config-store.js";
import { CloudFoundryCli } from "../util/cf-cli.js";
import { assertCmdInPath } from "../util/helper.js";
import { mapToPromptChoices } from "../util/favorites.js";

export class LoginFlow {
  private cfCli: CloudFoundryCli;
  private storeAsFavorite: boolean;
  private useFavForLogin: boolean;

  constructor(storeAsFavorite: boolean, useFavForLogin: boolean) {
    this.cfCli = new CloudFoundryCli();
    this.storeAsFavorite = storeAsFavorite;
    this.useFavForLogin = useFavForLogin;
  }
  async run() {
    try {
      await assertCmdInPath("cf");

      clear();
      this.printIntro();

      if (this.useFavForLogin) {
        await this.loginWithFavorite();
      } else {
        await this.loginInteractively();
      }
    } catch (error) {
      console.error(chalk.redBright(error));
    }
  }

  private printIntro() {
    console.log(chalk.cyanBright(figlet.textSync("SAP BTP CF", { font: "Poison" })));
  }

  private async getLoginKey() {
    const storedLogins = new ConfigStoreProxy().getLogins();

    return (
      await Enquirer.prompt<{ selection: string }>({
        type: "autocomplete",
        name: "selection",
        message: "Choose login user",
        initial: storedLogins.length ? 1 : 0,
        choices: [
          {
            name: SSO_LOGIN_KEY,
            hint: "Single Sign On with Temporary code",
          },
          // separator sso from stored pass logins
          ...(storedLogins.length
            ? [
                {
                  name: "sep1",
                  role: "separator",
                },
              ]
            : []),
          ...storedLogins,
        ],
      })
    ).selection;
  }

  private async loginInteractively() {
    const { apiRegionDomain } = await this.cfCli.chooseApiRegion();
    const chosenLoginKey = await this.getLoginKey();

    if (chosenLoginKey === SSO_LOGIN_KEY) {
      await this.loginWithSso(apiRegionDomain);
    } else {
      await this.loginWithStoredCreds(chosenLoginKey);
    }

    await this.cfCli.setTargetInteractively();

    if (this.storeAsFavorite) {
      await this.addTargetToFavorites(chosenLoginKey);
    }
  }

  private async loginWithFavorite() {
    const favorites = new ConfigStoreProxy().getFavorites();
    if (favorites.length === 0) {
      console.log(chalk.yellowBright("No Favorites found. Running guided login..."));
      this.storeAsFavorite = true;
      return this.loginInteractively();
    }

    const { favoriteName } = await Enquirer.prompt<{ favoriteName: string }>({
      type: "autocomplete",
      name: "favoriteName",
      message: "Choose Favorite for SAP BTP CF Login",
      choices: mapToPromptChoices(favorites),
    });

    const favorite = favorites.find((f) => f.name === favoriteName)!;
    const { apiRegionDomain } = await this.cfCli.chooseApiRegion(favorite?.region);

    if (favorite.sso) {
      await this.loginWithSso(apiRegionDomain);
    } else {
      await this.loginWithStoredCreds(favorite?.passLogin!);
    }
    this.cfCli.setOrg(favorite.org);
    this.cfCli.setSpace(favorite.space);

    this.cfCli.printCurrentTarget();
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
    const passExecName = process.platform === "linux" ? "pass" : "gopass";

    await assertCmdInPath(passExecName);

    const passShowResult = spawnSync(passExecName, ["show", passEntry], {
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

  private async addTargetToFavorites(chosenLoginKey: string) {
    const currentConfig = this.cfCli.getCurrentConfig();
    if (
      currentConfig.OrganizationFields.Name === "" ||
      currentConfig.SpaceFields.Name === "" ||
      currentConfig.Target === ""
    ) {
      console.log(chalk.yellowBright("CF Target not fully set. No Favorite will be added!"));
      return;
    }

    const configstore = new ConfigStoreProxy();
    const { favName, overwrite } = await this.promptForFavName(configstore.getFavorites().map((f) => f.name));
    configstore.addFavorite(
      {
        name: favName,
        org: currentConfig.OrganizationFields.Name,
        space: currentConfig.SpaceFields.Name,
        sso: chosenLoginKey === SSO_LOGIN_KEY,
        passLogin: chosenLoginKey!,
        region: currentConfig.Target.match(/https:\/\/api\.cf\.(\w+-?\d{1,4}?)\./)?.[1]!,
      },
      overwrite,
    );
  }

  /**
   * Prompts for favorite name until a new one is chosen or the user
   * confirmed that an existing will favorite will be overwritten
   */
  private async promptForFavName(existingFavorites: string[]) {
    let overwrite = false;

    const promptName = async () => {
      const { favoriteName } = await Enquirer.prompt<{ favoriteName: string }>({
        type: "input",
        name: "favoriteName",
        required: true,
        message: "Name for new Favorite",
      });

      // check if favorite should be overwritten or not
      if (existingFavorites.includes(favoriteName)) {
        const answer = await Enquirer.prompt<{ overwrite: boolean }>({
          type: "confirm",
          name: "overwrite",
          message: "Favorite already exists. Do you wish to overwrite it?",
        });
        overwrite = answer.overwrite;
        if (overwrite) {
          return favoriteName;
        } else {
          return undefined;
        }
      }
      return favoriteName;
    };

    let favName: string | undefined;
    do {
      favName = await promptName();
    } while (!favName);

    return { favName, overwrite };
  }
}
