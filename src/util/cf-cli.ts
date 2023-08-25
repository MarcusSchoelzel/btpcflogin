import chalk from "chalk";
import { spawnSync } from "child_process";
import Enquirer from "enquirer";
import ora from "ora";
import path from "path";
import fs from "fs";

import { getDirname } from "./helper.js";

function isStdError(error: any): error is { stderr: string } {
  return !!error.stderr;
}

export class CloudFoundryCli {
  async login(user: string, password: string, origin?: string) {
    const authProgress = ora("Authenticating you, please wait...").start();
    try {
      // cf auth username "password" [--origin idp-origin]
      const error = spawnSync(
        "cf",
        ["auth", user, `"${password.replace(/"/g, `\\$&`)}"`, ...(origin ? ["--origin", origin] : [])],
        // shell: true is required, otherwise quotes will be stripped from password
        { shell: true },
      ).stderr?.toString();
      if (error) throw error;
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
  async loginWithSso(ssoCode: string) {
    const loginError = spawnSync("cf", ["l", "--sso-passcode", ssoCode]).stderr.toString();
    if (loginError) {
      throw loginError;
    }
  }
  async setTarget() {
    await this.setOrg();
    await this.setSpace();
    // print current cf target
    console.log(chalk.cyanBright(this.getCurrentTarget()));
  }
  async setSpace() {
    let cfSpaces = spawnSync("cf", ["spaces"]).stdout?.toString().split("\n");
    if (cfSpaces[2] === "No spaces found.") {
      console.log(chalk.yellowBright(cfSpaces[2]));
    } else {
      cfSpaces = cfSpaces.splice(3, cfSpaces.length - 4);
      await this.selectSpace(cfSpaces);
    }
  }
  async setOrg() {
    let cfOrgs = await this.getOrgs();
    if (cfOrgs[2] === "No orgs found.") {
      console.log(chalk.yellowBright(cfOrgs[2]));
      return false;
    } else {
      cfOrgs = cfOrgs.splice(3, cfOrgs.length - 4);
      await this.selectOrg(cfOrgs);
      return true;
    }
  }

  /**
   * Prompts for Cloud Foundry API region
   */
  async chooseApiRegion(): Promise<{ apiRegionCode: string; apiRegionDomain: string }> {
    const apiRegionCode = await this.getRegionCode();
    const apiRegionDomain = apiRegionCode + (apiRegionCode === "cn40" ? ".platform.sapcloud.cn" : ".hana.ondemand.com");

    const apiProgress = ora("Switching region, please wait...").start();

    try {
      const error = spawnSync("cf", ["api", `api.cf.${apiRegionDomain}`]).stderr?.toString();
      if (error) throw error;
    } catch (error) {
      if (isStdError(error)) {
        throw error.stderr;
      } else {
        throw error;
      }
    } finally {
      apiProgress.stop();
    }
    apiProgress.stop();

    return { apiRegionCode, apiRegionDomain };
  }

  private getCurrentTarget() {
    return spawnSync("cf", ["t"]).stdout.toString();
  }

  /**
   * Retrieves list of organisation of current region
   */
  private async getOrgs() {
    const orgFinderProgress = ora("Selecting orgs, please wait...").start();

    let cfOrgs: string[];
    try {
      cfOrgs = spawnSync("cf", ["o"]).stdout.toString().split("\n");
    } finally {
      orgFinderProgress.stop();
    }
    orgFinderProgress.stop();
    return cfOrgs;
  }

  /**
   * Prompts space selection
   */
  private async selectSpace(cfSpaces: string[]) {
    const cfSpace = (
      await Enquirer.prompt<{ selection: string }>({
        type: "select",
        name: "selection",
        message: "Choose space",
        choices: cfSpaces,
      })
    ).selection;

    const spaceProgress = ora("Switching space, please wait...").start();
    try {
      spawnSync("cf", ["target", "-s", cfSpace]);
    } finally {
      spaceProgress.stop();
    }
    spaceProgress.stop();
  }

  /**
   * Prompts org selection
   */
  private async selectOrg(cfOrgs: string[]) {
    const cfOrg = (
      await Enquirer.prompt<{ selection: string }>({
        type: "select",
        name: "selection",
        message: "Choose organisation",
        choices: cfOrgs,
      })
    ).selection;

    const orgProgress = ora("Switching organisation, please wait...").start();
    try {
      spawnSync("cf", ["target", "-o", cfOrg]);
    } finally {
      orgProgress.stop();
    }
    orgProgress.stop();
  }

  /**
   * Triggers region selection via prompt
   * Regions are maintained in file /data/regions-data.json
   * see https://help.sap.com/viewer/65de2977205c403bbc107264b8eccf4b/LATEST/en-US/350356d1dc314d3199dca15bd2ab9b0e.html
   *
   * @returns chosen Cloud Foundry region via prompt
   */
  private async getRegionCode(): Promise<string> {
    return (
      await Enquirer.prompt<{ selection: string }>({
        type: "autocomplete",
        name: "selection",
        message: "Choose BTP Cloud Foundry region",
        initial: 7,
        choices: JSON.parse(
          fs
            .readFileSync(path.join(getDirname(import.meta.url), "../../data/regions-data.json"), {
              encoding: "utf-8",
            })
            .toString(),
        ),
      })
    ).selection;
  }
}
