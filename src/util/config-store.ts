import Configstore from "configstore";
import { Favorite, favoritesSchema } from "./favorites.js";

const STORE_NAME = "btpcflogin";
const PASS_LOGINS_STORE_KEY = "passLogins";
const FAVORITE_TARGETS = "favoriteTargets";
const KEEPASSXC_DATABASE_KEY = "keePassXcDatabase";
const KEEPASSXC_CLI_PATH_KEY = "keePassXcCli";
const KEEPASSXC_KEYCHAIN_KEY = "keePassXcKeychain";

export const DEFAULT_IDP = "Default IdP";
export const SSO_LOGIN_KEY = "single-sign-on";

type Logins = string[];

export class ConfigStoreProxy {
  private config: Configstore;
  constructor() {
    this.config = new Configstore(STORE_NAME);
  }
  /**
   * Retrieves stored 'pass' logins for cli configstore
   */
  getLogins(): Logins {
    const storedLogins = this.config.get(PASS_LOGINS_STORE_KEY) ?? [];

    this.assertsStoreValueIsArray(storedLogins, PASS_LOGINS_STORE_KEY);

    return storedLogins;
  }

  /**
   * Writes the given logins array into configstore
   */
  setLogins(logins: string[]) {
    this.config.set(PASS_LOGINS_STORE_KEY, logins);
  }

  /**
   * Adds new login to cli configstore
   */
  addLogin(loginId: string) {
    const existingLogins = this.getLogins();

    if (existingLogins.includes(loginId)) {
      throw new Error(`Pass Login '${loginId}' is already included in config store!`);
    }

    this.config.set(PASS_LOGINS_STORE_KEY, [...existingLogins, loginId]);
  }

  /**
   * Removes pass login from cli configstore
   */
  removeLogin(loginId: string) {
    const existingLogins = this.getLogins();

    const indexToRm = existingLogins.indexOf(loginId);
    if (indexToRm >= 0) {
      existingLogins.splice(indexToRm, 1);
      this.config.set(PASS_LOGINS_STORE_KEY, existingLogins);
    } else {
      throw new Error(`Pass Login "${loginId}" not found in Config store`);
    }
  }

  /**
   * Retrieves stored path to the KeePassXC database file
   */
  getKeePassXcDatabase(): string | undefined {
    return this.config.get(KEEPASSXC_DATABASE_KEY);
  }

  /**
   * Stores the path to the KeePassXC database file
   */
  setKeePassXcDatabase(databasePath: string) {
    this.config.set(KEEPASSXC_DATABASE_KEY, databasePath);
  }

  /**
   * Retrieves stored path to the 'keepassxc-cli' executable
   */
  getKeePassXcCliPath(): string | undefined {
    return this.config.get(KEEPASSXC_CLI_PATH_KEY);
  }

  /**
   * Stores the path to the 'keepassxc-cli' executable
   */
  setKeePassXcCliPath(cliPath: string) {
    this.config.set(KEEPASSXC_CLI_PATH_KEY, cliPath);
  }

  /**
   * Retrieves whether the KeePassXC database password may be stored
   * in the macOS Keychain (undefined = user was not asked yet)
   */
  getKeePassXcKeychainOptIn(): boolean | undefined {
    return this.config.get(KEEPASSXC_KEYCHAIN_KEY);
  }

  /**
   * Stores whether the KeePassXC database password may be stored in the macOS Keychain
   */
  setKeePassXcKeychainOptIn(optIn: boolean) {
    this.config.set(KEEPASSXC_KEYCHAIN_KEY, optIn);
  }

  getFavorites(): Favorite[] {
    try {
      return favoritesSchema.parse(this.config.get(FAVORITE_TARGETS) ?? []) || [];
    } catch (error) {
      throw new Error(`Property ${FAVORITE_TARGETS} in configuration is invalid`);
    }
  }

  addFavorite(favorite: Favorite, overwrite = false) {
    const favorites = this.getFavorites();

    const existingIndex = favorites.findIndex((f) => f.name === favorite.name);
    if (existingIndex !== -1) {
      if (overwrite) {
        favorites[existingIndex] = favorite;
      } else {
        throw new Error(`A favorite cf target with name '${favorite.name} already exists!`);
      }
    } else {
      favorites.push(favorite);
    }

    this.config.set(FAVORITE_TARGETS, favorites);
  }

  setFavorites(favorites: Favorite[]) {
    this.config.set(FAVORITE_TARGETS, favorites);
  }

  private assertsStoreValueIsArray(storedProperty: any, propertyKey: string): asserts storedProperty is string[] {
    if (storedProperty !== undefined && !Array.isArray(storedProperty)) {
      throw new Error(`Property ${propertyKey} in configuration file is not of type Array. Please define an Array []!`);
    }
  }
}
