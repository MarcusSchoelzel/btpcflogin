import { confirm, input, password } from "@inquirer/prompts";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { homedir } from "os";
import which from "which";

import { ConfigStoreProxy } from "./config-store.js";

const KEEPASSXC_CLI = "keepassxc-cli";
const KEYCHAIN_SERVICE = "btpcflogin";
// default locations of the executable that is bundled with the KeePassXC app
const WELL_KNOWN_CLI_PATHS = [
  path.join("/Applications", "KeePassXC.app", "Contents", "MacOS", KEEPASSXC_CLI),
  path.join(homedir(), "Applications", "KeePassXC.app", "Contents", "MacOS", KEEPASSXC_CLI),
];

export type KeePassXcCredentials = {
  username: string;
  password: string;
  origin?: string;
};

/**
 * Wrapper around 'keepassxc-cli' to use a KeePassXC database
 * as credential store (e.g. on macOS where 'pass' is not available)
 */
export class KeePassXcCli {
  private databasePassword?: string;
  private passwordFromKeychain = false;
  private keychainInvalidated = false;
  private keychainHandled = false;
  private cliPath?: string;

  /**
   * Determines the 'keepassxc-cli' executable to use.
   * Resolution order: PATH > config store > bundled executable of the
   * KeePassXC app (confirmed and stored) > interactive prompt (stored afterwards)
   */
  private async getCliPath(): Promise<string> {
    if (this.cliPath) return this.cliPath;

    if (await which(KEEPASSXC_CLI, { nothrow: true })) {
      return (this.cliPath = KEEPASSXC_CLI);
    }

    const configStore = new ConfigStoreProxy();
    const storedPath = configStore.getKeePassXcCliPath();
    if (storedPath) {
      if (!fs.existsSync(storedPath)) {
        throw new Error(
          `'${KEEPASSXC_CLI}' not found anymore at ${storedPath}.\nCorrect the path in the config store or add '${KEEPASSXC_CLI}' to the PATH.`,
        );
      }
      return (this.cliPath = storedPath);
    }

    const detectedPath = WELL_KNOWN_CLI_PATHS.find((cliPath) => fs.existsSync(cliPath));
    const useDetectedPath =
      !!detectedPath &&
      (await confirm({
        message: `'${KEEPASSXC_CLI}' is not on the PATH. Use the executable of the KeePassXC app at ${detectedPath}?`,
        default: true,
      }));

    const cliPath = useDetectedPath
      ? detectedPath
      : (
          await input({
            message: `Path to the '${KEEPASSXC_CLI}' executable`,
            validate: (value) => fs.existsSync(value.trim()) || "No file found at the given path",
          })
        ).trim();

    configStore.setKeePassXcCliPath(cliPath);
    console.log(chalk.green(`✔ Location of '${KEEPASSXC_CLI}' saved to the config store`));

    return (this.cliPath = cliPath);
  }

  /**
   * Determines the path to the KeePassXC database file.
   * Resolution order: env var BTPCFLOGIN_KDBX > config store > interactive prompt (stored afterwards)
   */
  async getDatabasePath(): Promise<string> {
    const envPath = process.env.BTPCFLOGIN_KDBX;
    if (envPath) {
      if (!fs.existsSync(envPath)) throw new Error(`KeePassXC database not found at ${envPath} (BTPCFLOGIN_KDBX)`);
      return envPath;
    }

    const configStore = new ConfigStoreProxy();
    const storedPath = configStore.getKeePassXcDatabase();
    if (storedPath) {
      if (!fs.existsSync(storedPath)) {
        throw new Error(
          `KeePassXC database not found at ${storedPath}.\nUpdate the path in the config store or set BTPCFLOGIN_KDBX.`,
        );
      }
      return storedPath;
    }

    const databasePath = await input({
      message: "Path to your KeePassXC database (*.kdbx)",
      validate: (value) => value.trim() !== "" || "Path must not be empty",
    });
    if (!fs.existsSync(databasePath)) throw new Error(`KeePassXC database not found at ${databasePath}`);

    configStore.setKeePassXcDatabase(databasePath);
    return databasePath;
  }

  /**
   * Lists all entries of the KeePassXC database
   */
  async listEntries(): Promise<string[]> {
    const output = await this.run("ls", ["--recursive", "--flatten"]);

    return output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.endsWith("/") && line !== "[empty]");
  }

  /**
   * Reads BTP credentials from the given KeePassXC entry.
   * UserName and Password are taken from the default entry fields,
   * the optional IdP origin from the additional attribute 'origin'.
   */
  async getCredentials(entry: string): Promise<KeePassXcCredentials> {
    const output = await this.run(
      "show",
      ["--show-protected", "--attributes", "UserName", "--attributes", "Password"],
      [entry],
    );

    const [username, password] = output.split("\n");
    if (!username) {
      throw new Error(`No user name maintained in KeePassXC entry "${entry}"`);
    }
    if (!password) {
      throw new Error(`No password maintained in KeePassXC entry "${entry}"`);
    }

    return { username, password, origin: await this.getOrigin(entry) };
  }

  /**
   * Reads the optional additional attribute 'origin' from the given entry
   */
  private async getOrigin(entry: string): Promise<string | undefined> {
    try {
      return (await this.run("show", ["--attributes", "origin"], [entry])).split("\n")[0] || undefined;
    } catch (error) {
      // additional attribute 'origin' is optional
      return undefined;
    }
  }

  /**
   * Runs a 'keepassxc-cli' command against the database and returns its stdout.
   * The database password is prompted once and reused for subsequent calls.
   */
  private async run(command: string, options: string[], positionals: string[] = []): Promise<string> {
    const cliPath = await this.getCliPath();
    const databasePath = await this.getDatabasePath();

    const execute = async () =>
      spawnSync(cliPath, [command, "--quiet", ...options, databasePath, ...positionals], {
        input: `${await this.getDatabasePassword(databasePath)}\n`,
      });

    let result = await execute();

    // with '--quiet' a failed unlock is the only error that leaves stderr empty
    // (the unlock error counts as silenced secondary output)
    const unlockFailed = result.status !== 0 && !result.error && !result.stderr.toString().trim();

    // the password stored in the keychain might be outdated -> prompt for the current one and retry
    if (unlockFailed && this.passwordFromKeychain) {
      console.log(chalk.yellowBright("The database password stored in the macOS Keychain seems to be outdated."));
      this.databasePassword = undefined;
      this.passwordFromKeychain = false;
      this.keychainInvalidated = true;
      this.keychainHandled = false;
      result = await execute();
    }

    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(result.stderr.toString().trim() || `Could not unlock ${databasePath} (wrong password?)`);
    }

    await this.offerKeychainStorage(databasePath);

    return result.stdout.toString();
  }

  private async getDatabasePassword(databasePath: string): Promise<string> {
    if (this.databasePassword !== undefined) return this.databasePassword;

    if (!this.keychainInvalidated) {
      const keychainPassword = this.readPasswordFromKeychain(databasePath);
      if (keychainPassword !== undefined) {
        this.passwordFromKeychain = true;
        this.keychainHandled = true;
        return (this.databasePassword = keychainPassword);
      }
    }

    return (this.databasePassword = await password({
      message: `Password to unlock ${databasePath}`,
      mask: true,
    }));
  }

  /**
   * Reads the database password from the macOS Keychain
   * @returns undefined if not on macOS, opted out or no entry exists
   */
  private readPasswordFromKeychain(databasePath: string): string | undefined {
    if (process.platform !== "darwin") return undefined;
    if (new ConfigStoreProxy().getKeePassXcKeychainOptIn() === false) return undefined;

    const result = spawnSync("security", ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", databasePath, "-w"]);
    if (result.error || result.status !== 0) return undefined;

    return result.stdout.toString().replace(/\n$/, "");
  }

  /**
   * Offers to remember a successfully used, manually entered database password
   * in the macOS Keychain. The choice is stored in the config store, so the
   * question is only asked once.
   */
  private async offerKeychainStorage(databasePath: string) {
    if (this.keychainHandled || process.platform !== "darwin" || this.databasePassword === undefined) return;
    this.keychainHandled = true;

    const configStore = new ConfigStoreProxy();
    let optIn = configStore.getKeePassXcKeychainOptIn();
    if (optIn === undefined) {
      optIn = await confirm({
        message: `Remember the database password in the macOS Keychain? ( Remove it anytime with: security delete-generic-password -s ${KEYCHAIN_SERVICE} )`,
        default: true,
      });
      configStore.setKeePassXcKeychainOptIn(optIn);
    }

    if (optIn) this.storePasswordInKeychain(databasePath, this.databasePassword);
  }

  private storePasswordInKeychain(databasePath: string, dbPassword: string) {
    // '-U' updates an existing entry. The password is passed via argv, which is only
    // visible to processes of the same user - and those could read the keychain item anyway.
    const result = spawnSync("security", [
      "add-generic-password",
      "-U",
      "-s",
      KEYCHAIN_SERVICE,
      "-a",
      databasePath,
      "-l",
      `${KEYCHAIN_SERVICE} (KeePassXC database)`,
      "-w",
      dbPassword,
    ]);

    if (result.error || result.status !== 0) {
      console.log(chalk.yellowBright("Database password could not be saved to the macOS Keychain"));
    } else {
      console.log(chalk.green("✔ Database password saved to the macOS Keychain"));
    }
  }
}
