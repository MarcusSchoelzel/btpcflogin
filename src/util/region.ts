import Enquirer from "enquirer";
import path from "path";
import fs from "fs";
import clui from "clui";

import { isStdError } from "./error.js";
import { exec, getDirname } from "./helper.js";

/**
 * Prompts for Cloud Foundry API region
 *
 * @returns information about chosen api region
 */
export async function chooseCfApiRegion(): Promise<{ apiRegionCode: string; apiRegionDomain: string }> {
  const apiRegionCode = await getRegionCode();
  const apiRegionDomain = apiRegionCode + (apiRegionCode === "cn40" ? ".platform.sapcloud.cn" : ".hana.ondemand.com");

  const apiProgress = new clui.Spinner("Switching region, please wait...");
  apiProgress.start();

  try {
    await exec("cf api api.cf." + apiRegionDomain);
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

/**
 * Triggers region selection via prompt
 * Regions are maintained in file /lib/regions-data.json
 * see https://help.sap.com/viewer/65de2977205c403bbc107264b8eccf4b/LATEST/en-US/350356d1dc314d3199dca15bd2ab9b0e.html
 *
 * @returns chosen Cloud Foundry region via prompt
 */
async function getRegionCode(): Promise<string> {
  return (
    await Enquirer.prompt<{ selection: string }>({
      type: "autocomplete",
      name: "selection",
      message: "Choose BTP Cloud Foundry region",
      initial: 7,
      choices: JSON.parse(
        fs
          .readFileSync(path.join(getDirname(import.meta.url), "data", "regions-data.json"), {
            encoding: "utf-8"
          })
          .toString()
      )
    })
  ).selection;
}
