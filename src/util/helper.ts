import { dirname } from "path";
import { fileURLToPath } from "url";

/**
 * Returns directory name from file url (e.g. import.meta.url)
 */
export const getDirname = (fileUrl: string) => dirname(fileURLToPath(fileUrl));
