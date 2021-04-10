import { CredoConfiguration, getConfig } from './configuration';

/**
 * A singleton class interface that holds the extension's configuration.
 */
export default class ConfigurationProvider {
  private static singletonInstance: ConfigurationProvider | null;

  public static get instance(): ConfigurationProvider {
    if (!ConfigurationProvider.singletonInstance) {
      ConfigurationProvider.singletonInstance = new ConfigurationProvider();
    }

    return ConfigurationProvider.singletonInstance;
  }

  public static destroy(): void {
    ConfigurationProvider.singletonInstance = null;
  }

  public config: CredoConfiguration;

  private constructor() {
    this.config = getConfig();
  }

  public reloadConfig(): void {
    this.config = getConfig();
  }
}
