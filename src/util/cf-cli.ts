import chalk from "chalk";
import { SpawnSyncReturns, spawnSync } from "child_process";
import Enquirer from "enquirer";
import ora from "ora";
import path from "path";
import fs from "fs";
import z from "zod";

import { getDirname } from "./helper.js";
import { homedir } from "os";

const NO_SPACES_FOUND = "No spaces found.";
const NO_ORGS_FOUND = "No orgs found.";
const SHELL_CANCELLED = "Process terminated!";

const cfCliConfigSchema = z.object({
  Target: z.string(),
  SpaceFields: z.object({
    Name: z.string(),
  }),
  OrganizationFields: z.object({
    Name: z.string(),
  }),
});

export type CfCliConfig = z.infer<typeof cfCliConfigSchema>;
export type CfTarget = {
  space: string;
  org: string;
};

function checkSpawnErrors(spawnResult: SpawnSyncReturns<Buffer>) {
  if (spawnResult.signal === "SIGINT") throw new Error(SHELL_CANCELLED);

  const error = spawnResult.stderr.toString();
  if (error) {
    let customErrorText = "";
    try {
      customErrorText = (JSON.parse(error) as { error_description: string }).error_description;
    } catch (parseError) {}

    if (customErrorText) throw new Error(customErrorText);
    throw new Error(error);
  }
}

export class CloudFoundryCli {
  async login(user: string, password: string, origin?: string) {
    const authProgress = ora("Authenticating you, please wait...").start();

    try {
      // cf auth username "password" [--origin idp-origin]
      if (process.platform === "win32") {
        checkSpawnErrors(
          spawnSync(
            "cf",
            // Escapes '"' character
            ["auth", user, `"${password.replace(/"/g, `"$&`)}"`, ...(origin ? ["--origin", origin] : [])],
            {
              // cmd shell seems to be easier to handle in terms of escaping meta characters
              shell: "cmd.exe",
            },
          ),
        );
      } else {
        checkSpawnErrors(
          spawnSync(
            "cf",
            [
              "auth",
              user,
              // Escapes '"' and '$' characters
              `"${password.replace(/("|\$)/g, `\\$&`)}"`,
              ...(origin ? ["--origin", origin] : []),
            ],
            // shell=true is required, otherwise quotes will be stripped from password
            { shell: true },
          ),
        );
      }
    } finally {
      authProgress.stop();
    }
    authProgress.stop();
  }

  printCurrentTarget() {
    console.log(chalk.cyanBright(this.getCurrentTarget()));
  }

  async loginWithSso(ssoCode: string) {
    checkSpawnErrors(spawnSync("cf", ["l", "--sso-passcode", ssoCode]));
  }

  async setTargetInteractively() {
    if (!(await this.setOrgInteractively())) return;
    if (!(await this.setSpaceInteractively())) return;

    // print current cf target
    this.printCurrentTarget();
  }

  async setSpaceInteractively() {
    const cfSpaces = this.getSpaces();
    if (!cfSpaces?.length) {
      console.log(chalk.yellowBright(NO_SPACES_FOUND));
      return false;
    }

    await this.selectSpace(cfSpaces);
    return true;
  }

  setSpace(cfSpace: string) {
    const spaceProgress = ora("Switching space, please wait...").start();
    try {
      checkSpawnErrors(spawnSync("cf", ["target", "-s", cfSpace]));
    } finally {
      spaceProgress.stop();
    }
    spaceProgress.stop();
  }

  async setOrgInteractively() {
    const orgs = this.getOrgs();
    if (!orgs?.length) {
      console.log(chalk.yellowBright(NO_ORGS_FOUND));
      return false;
    }

    await this.selectOrg(orgs);
    return true;
  }

  setOrg(orgName: string) {
    const orgProgress = ora("Switching organisation, please wait...").start();
    try {
      checkSpawnErrors(spawnSync("cf", ["target", "-o", orgName]));
    } finally {
      orgProgress.stop();
    }
    orgProgress.stop();
  }

  /**
   * Prompts for Cloud Foundry API region
   */
  async chooseApiRegion(region?: string): Promise<{ apiRegionCode: string; apiRegionDomain: string }> {
    const apiRegionCode = region ? region : await this.getRegionCode();
    const apiRegionDomain = apiRegionCode + (apiRegionCode === "cn40" ? ".platform.sapcloud.cn" : ".hana.ondemand.com");

    const apiProgress = ora("Switching region, please wait...").start();

    try {
      checkSpawnErrors(spawnSync("cf", ["api", `api.cf.${apiRegionDomain}`]));
    } finally {
      apiProgress.stop();
    }
    apiProgress.stop();

    return { apiRegionCode, apiRegionDomain };
  }

  getCurrentConfig() {
    const configPath = path.join(homedir(), ".cf", "config.json");
    if (!fs.existsSync(configPath)) {
      throw new Error("CF Config not found!");
    }
    return cfCliConfigSchema.parse(JSON.parse(fs.readFileSync(configPath, { encoding: "utf-8" })));
  }

  private getCurrentTarget() {
    return spawnSync("cf", ["t"]).stdout.toString();
  }

  private getSpaces() {
    const spaceFinderProgress = ora("Selecting spaces, please wait...").start();

    let cfSpaces: string[];

    try {
      const spaceResult = spawnSync("cf", ["spaces"]);
      checkSpawnErrors(spaceResult);

      cfSpaces = spaceResult.stdout.toString().split("\n");
      if (cfSpaces[2] === NO_SPACES_FOUND) {
        cfSpaces = [];
      } else {
        cfSpaces = cfSpaces.splice(3, cfSpaces.length - 4);
      }
    } finally {
      spaceFinderProgress.stop();
    }
    spaceFinderProgress.stop();

    return cfSpaces;
  }

  /**
   * Retrieves list of organisation of current region
   */
  private getOrgs() {
    const orgFinderProgress = ora("Selecting orgs, please wait...").start();

    let cfOrgs: string[];
    try {
      const getOrgsResult = spawnSync("cf", ["o"]);
      checkSpawnErrors(getOrgsResult);

      cfOrgs = getOrgsResult.stdout.toString().split("\n");

      if (cfOrgs[2] === NO_ORGS_FOUND) {
        cfOrgs = [];
      } else {
        cfOrgs = cfOrgs.splice(3, cfOrgs.length - 4);
      }
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
    let cfSpace: string;
    if (cfSpaces.length === 1) {
      cfSpace = cfSpaces[0];
      console.log(`${chalk.green("✔")} Setting only available Space ${chalk.gray("·")} ${chalk.cyan(cfSpace)}`);
    } else {
      cfSpace = (
        await Enquirer.prompt<{ selection: string }>({
          type: "select",
          name: "selection",
          message: "Choose space",
          choices: cfSpaces,
        })
      ).selection;
    }

    this.setSpace(cfSpace);
  }

  /**
   * Prompts org selection
   */
  private async selectOrg(cfOrgs: string[]) {
    let cfOrg: string;

    if (cfOrgs.length === 1) {
      cfOrg = cfOrgs[0];
      console.log(`${chalk.green("✔")} Setting only available org ${chalk.gray("·")} ${chalk.cyan(cfOrg)}`);
    } else {
      cfOrg = (
        await Enquirer.prompt<{ selection: string }>({
          type: "select",
          name: "selection",
          message: "Choose organisation",
          choices: cfOrgs,
        })
      ).selection;
    }

    this.setOrg(cfOrg);
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
