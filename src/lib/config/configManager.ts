
import { ClassificationConfig } from '@/lib/types/unified';
import { logger } from '@/lib/logging/logger';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Record<string, any> = {};
  private context = 'CONFIG_MANAGER';

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Get default classification configuration
   */
  getDefaultClassificationConfig(): ClassificationConfig {
    return {
      useAI: true,
      aiProvider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 1000,
      enableKeywordExclusion: true,
      enableSICCodes: true,
      timeout: 30000,
      retryAttempts: 3
    };
  }

  /**
   * Get configuration value with fallback
   */
  get<T>(key: string, defaultValue?: T): T {
    const value = this.config[key];
    if (value === undefined) {
      logger.debug(`Config key '${key}' not found, using default`, { defaultValue }, this.context);
      return defaultValue as T;
    }
    return value as T;
  }

  /**
   * Set configuration value
   */
  set(key: string, value: any): void {
    const oldValue = this.config[key];
    this.config[key] = value;
    logger.debug(`Config updated: ${key}`, { oldValue, newValue: value }, this.context);
  }

  /**
   * Set multiple configuration values
   */
  setMultiple(values: Record<string, any>): void {
    Object.entries(values).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  /**
   * Get all configuration
   */
  getAll(): Record<string, any> {
    return { ...this.config };
  }

  /**
   * Clear all configuration
   */
  clear(): void {
    this.config = {};
    logger.info('Configuration cleared', undefined, this.context);
  }

  /**
   * Load configuration from environment or storage
   */
  async loadConfig(): Promise<void> {
    try {
      // Load from localStorage if available
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('app-config');
        if (stored) {
          const parsedConfig = JSON.parse(stored);
          this.setMultiple(parsedConfig);
          logger.info('Configuration loaded from localStorage', { keys: Object.keys(parsedConfig) }, this.context);
        }
      }
    } catch (error) {
      logger.error('Failed to load configuration', { error }, this.context);
    }
  }

  /**
   * Save configuration to storage
   */
  async saveConfig(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('app-config', JSON.stringify(this.config));
        logger.info('Configuration saved to localStorage', undefined, this.context);
      }
    } catch (error) {
      logger.error('Failed to save configuration', { error }, this.context);
    }
  }
}

// Singleton instance
export const configManager = ConfigManager.getInstance();

// Convenience functions
export const getConfig = <T>(key: string, defaultValue?: T) => configManager.get(key, defaultValue);
export const setConfig = (key: string, value: any) => configManager.set(key, value);
