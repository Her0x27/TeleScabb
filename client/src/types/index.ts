// Типы для клиентов Telegram
export interface TelegramClientSettings {
  timeout: number;
  requestRetries: number;
  connectionRetries: number;
  retryDelay: number;
  autoReconnect: boolean;
  sequentialUpdates: boolean;
  floodSleepThreshold: number;
}

export interface TelegramClient {
  id: number;
  phoneNumber: string;
  apiId: number;
  deviceModel: string;
  systemVersion: string;
  appVersion: string;
  langCode: string;
  systemLangCode: string;
  isActive: boolean;
  status: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  settings: TelegramClientSettings;
}

// Типы для плагинов
export interface Plugin {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  version: string;
  author: string | null;
  isActive: boolean;
  isSystem: boolean;
  code: string;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Типы для логов
export interface Log {
  id: number;
  clientId: number | null;
  level: string;
  source: string;
  message: string;
  timestamp: string;
}

// Типы для статистики
export interface Stats {
  activeAccounts: number;
  totalAccounts: number;
  loadedPlugins: number;
  totalPlugins: number;
  messagesLast24h: number;
  activeTasks: number;
}

// Типы для API-клиентов Telegram
export interface ApiClient {
  name: string;
  apiId: number;
  apiHash: string;
}

// Типы для аутентификации
export interface AuthCodeRequest {
  phoneNumber: string;
  code: string;
}

// Типы для форм
export interface AccountFormValues {
  phoneNumber: string;
  apiId: number;
  apiHash: string;
  deviceModel: string;
  systemVersion: string;
  appVersion: string;
  langCode: string;
  systemLangCode: string;
  timeout: number;
  requestRetries: number;
  connectionRetries: number;
  retryDelay: number;
  autoReconnect: boolean;
  sequentialUpdates: boolean;
  floodSleepThreshold: number;
}

export interface PluginFormValues {
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: string;
  code: string;
  isActive: boolean;
  settings: Record<string, any>;
}

// Тип для вкладок
export type TabId = 'overview' | 'accounts' | 'plugins' | 'settings' | 'logs';
