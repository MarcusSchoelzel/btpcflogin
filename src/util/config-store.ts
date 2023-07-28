import Configstore from "configstore";

const STORE_NAME = "btpcflogin";
const PASS_LOGINS_STORE_KEY = "passLogins";
const ORIGINS_STORE_MEMBER = "origins";

export const DEFAULT_IDP = "Default IdP";
export const SSO_LOGIN_KEY = "single-sign-on";

type Logins = string[];
type Origins = string[];

class ConfigStoreProxy {
  private config: Configstore;
  constructor() {
    this.config = new Configstore(STORE_NAME);
  }
  /**
   * Retrieves stored 'pass' logins for cli configstore
   * @param includeSsoKey
   * @returns
   */
  getLogins(includeSsoKey = false): Logins {
    const storedLogins = this.config.get(PASS_LOGINS_STORE_KEY) ?? [];

    this.assertsStoreValueIsArray(storedLogins, PASS_LOGINS_STORE_KEY);

    return includeSsoKey ? [SSO_LOGIN_KEY, ...storedLogins] : storedLogins;
  }

  getOrigins(): Origins {
    const storedOrigins = this.config.get(ORIGINS_STORE_MEMBER) ?? [];

    this.assertsStoreValueIsArray(storedOrigins, ORIGINS_STORE_MEMBER);

    return storedOrigins;
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
   * Adds new origin of custom Identity Provider to store
   */
  addOrigin(origin: string) {
    const existingOrigins = this.getOrigins();

    if (existingOrigins.includes(origin)) {
      throw new Error(`Origin '${origin}' is already included in config store!`);
    }
    this.config.set(ORIGINS_STORE_MEMBER, [...existingOrigins, origin]);
  }

  private assertsStoreValueIsArray(storedProperty: any, propertyKey: string): asserts storedProperty is string[] {
    if (storedProperty !== undefined && !Array.isArray(storedProperty)) {
      throw new Error(`Property ${propertyKey} in configuration file is not of type Array. Please define an Array []!`);
    }
  }
}

export const cliConfigStore = new ConfigStoreProxy();
