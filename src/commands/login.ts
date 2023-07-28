import Enquirer from "enquirer";
import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import clui from "clui";
import { spawnSync } from "child_process";

import { setCfTarget } from "../util/target-selection.js";
import { chooseCfApiRegion } from "../util/region.js";
import { exec } from "../util/helper.js";
import { isStdError } from "../util/error.js";
import { DEFAULT_IDP, SSO_LOGIN_KEY, cliConfigStore } from "../util/config-store.js";

/**
 * Executes login process to Cloud Foundry to enable usage of its CLI
 */
export async function cfLogin() {
  try {
    clear();
    console.log(chalk.cyanBright(figlet.textSync("SAP BTP CF", { font: "Poison" })));

    const { apiRegionDomain } = await chooseCfApiRegion();

    const chosenLoginKey = (
      await Enquirer.prompt<{ selection: string }>({
        type: "select",
        name: "selection",
        message: "Choose login user",
        choices: cliConfigStore.getLogins(true)
      })
    ).selection;

    if (chosenLoginKey === SSO_LOGIN_KEY) {
      await loginWithSso(apiRegionDomain);
    } else {
      await loginWithStoredCreds(chosenLoginKey);
    }

    await setCfTarget();
  } catch (error) {
    console.error(chalk.redBright(error));
  }
}

async function loginWithSso(apiRegionDomain: string) {
  const { ssoCode } = await Enquirer.prompt<{ ssoCode: string }>({
    type: "password",
    name: "ssoCode",
    message: `Temporary Authentication Code for SSO ( Get one at https://login.cf.${apiRegionDomain}/passcode ):`
  });

  // spawnSync has to be used as 'exec' does not work properly here.
  const loginError = spawnSync("cf", ["l", "--sso-passcode", ssoCode]).stderr.toString();
  if (loginError) {
    throw loginError;
  }
}

async function loginWithStoredCreds(passEntry: string) {
  const passShowResult = spawnSync("pass", ["show", passEntry], {
    stdio: ["inherit", "pipe", "pipe"]
  });
  const showResultError = passShowResult.stderr.toString();
  if (showResultError) {
    throw showResultError;
  }
  const btpCredentials = passShowResult.stdout.toString().split("\n");

  const originOption = await selectOrigin();

  const authProgress = new clui.Spinner("Authenticating you, please wait...");
  authProgress.start();
  try {
    await exec(`cf auth "${btpCredentials[1].slice(10)}" "${btpCredentials[0].replace(/"/g, `\\$&`)}" ${originOption}`);
  } catch (error) {
    if (isStdError(error) && JSON.parse(error.stderr).error === "invalid_grant") {
      throw JSON.parse(error.stderr).error_description;
    } else {
      throw error;
    }
  } finally {
    authProgress.stop();
  }
  authProgress.stop();
}
async function selectOrigin() {
  const origins = cliConfigStore.getOrigins();
  if (origins.length === 0) {
    return "";
  }

  const chosenOrigin = (
    await Enquirer.prompt<{ selection: string }>({
      type: "select",
      name: "selection",
      message: "Choose Identity Provider for Login",
      choices: [DEFAULT_IDP, ...origins]
    })
  ).selection;

  return chosenOrigin === DEFAULT_IDP ? "" : `--origin ${chosenOrigin}`;
}
