import { dirname } from "path";
import { fileURLToPath } from "url";
import which from "which";

/**
 * Returns directory name from file url (e.g. import.meta.url)
 */
export const getDirname = (fileUrl: string) => dirname(fileURLToPath(fileUrl));

/**
 * Tests if the given executable is on the PATH
 * @param cmd name of an executable on the current PATH
 */
export async function assertCmdInPath(cmd: string, cmdLabel?: string): Promise<void> {
  try {
    await which(cmd);
  } catch (error) {
    throw new Error(`Required executable '${cmdLabel ?? cmd}' could not be found on the PATH`);
  }
}
