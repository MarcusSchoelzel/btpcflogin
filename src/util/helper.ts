import util from "util";
import child_process from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";

/**
 * Promisified exec function
 */
export const exec = util.promisify(child_process.exec);

/**
 * Returns directory name from file url (e.g. import.meta.url)
 */
export const getDirname = (fileUrl: string) => dirname(fileURLToPath(fileUrl));
