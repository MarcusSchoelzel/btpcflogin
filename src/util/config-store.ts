import Configstore from "configstore";
import { Favorite, favoritesSchema } from "./favorites.js";

const STORE_NAME = "btpcflogin";
const PASS_LOGINS_STORE_KEY = "passLogins";
const FAVORITE_TARGETS = "favoriteTargets";

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

  getFavorites(): Favorite[] {
    try {
      return favoritesSchema.parse(this.config.get(FAVORITE_TARGETS) ?? []) || [];
    } catch (error) {
      throw new Error(`Property ${FAVORITE_TARGETS} in configuration is invalid`);
    }
  }

  addFavorite(favorite: Favorite) {
    const favorites = this.getFavorites();

    if (favorites.findIndex((f) => f.name === favorite.name) !== -1) {
      throw new Error(`A favorite cf target with name '${favorite.name} already exists!`);
    }

    this.config.set(FAVORITE_TARGETS, [...favorites, favorite]);
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
