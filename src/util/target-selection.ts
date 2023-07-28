import Enquirer from "enquirer";
import chalk from "chalk";
import clui from "clui";
import util from "util";
import child_process from "child_process";

const exec = util.promisify(child_process.exec);

/**
 * Changes the current target of the Cloud Foundry CLI via
 * prompting the user for 'org' and 'space'
 */
export async function setCfTarget() {
  try {
    let cfOrgs = await getOrgs();

    if (cfOrgs[2] === "No orgs found.") {
      console.log(chalk.yellowBright(cfOrgs[2]));
    } else {
      cfOrgs = cfOrgs.splice(3, cfOrgs.length - 4);

      await selectOrg(cfOrgs);

      let cfSpaces = (await exec("cf spaces")).stdout.split("\n");
      if (cfSpaces[2] === "No spaces found.") {
        console.log(chalk.yellowBright(cfSpaces[2]));
      } else {
        cfSpaces = cfSpaces.splice(3, cfSpaces.length - 4);
        await selectSpace(cfSpaces);
      }
    }
    console.log(chalk.cyanBright((await exec("cf t")).stdout));
  } catch (error) {
    console.error(chalk.redBright(error));
  }
}

/**
 * Retrieves list of organisation of current region
 *
 * @returns list of found orgs
 */
async function getOrgs() {
  const orgFinderProgress = new clui.Spinner("Selecting orgs, please wait...");
  orgFinderProgress.start();
  let cfOrgs: string[];
  try {
    cfOrgs = (await exec("cf orgs")).stdout.split("\n");
  } finally {
    orgFinderProgress.stop();
  }
  orgFinderProgress.stop();
  return cfOrgs;
}

/**
 * Prompts space selection
 *
 * @param cfSpaces list of spaces
 */
async function selectSpace(cfSpaces: string[]) {
  const cfSpace = (
    await Enquirer.prompt<{ selection: string }>({
      type: "select",
      name: "selection",
      message: "Choose space",
      choices: cfSpaces
    })
  ).selection;

  const spaceProgress = new clui.Spinner("Switching space, please wait...");
  spaceProgress.start();
  try {
    await exec('cf target -s "' + cfSpace + '"');
  } finally {
    spaceProgress.stop();
  }
  spaceProgress.stop();
}

/**
 * Prompts org selection
 *
 * @param cfOrgs list of organisations
 */
async function selectOrg(cfOrgs: string[]) {
  const cfOrg = (
    await Enquirer.prompt<{ selection: string }>({
      type: "select",
      name: "selection",
      message: "Choose organisation",
      choices: cfOrgs
    })
  ).selection;

  const orgProgress = new clui.Spinner("Switching organisation, please wait...");
  orgProgress.start();
  try {
    await exec('cf target -o "' + cfOrg + '"');
  } finally {
    orgProgress.stop();
  }
  orgProgress.stop();
}