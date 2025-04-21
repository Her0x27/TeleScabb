import { eq } from "drizzle-orm";
import { db } from "./db";
import { 
  users, type User, type InsertUser,
  telegramClients, type TelegramClient, type InsertTelegramClient,
  plugins, type Plugin, type InsertPlugin,
  logs, type Log, type InsertLog 
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Telegram client methods
  getTelegramClient(id: number): Promise<TelegramClient | undefined>;
  getTelegramClientByPhone(phoneNumber: string): Promise<TelegramClient | undefined>;
  getAllTelegramClients(): Promise<TelegramClient[]>;
  getActiveTelegramClients(): Promise<TelegramClient[]>;
  createTelegramClient(client: InsertTelegramClient): Promise<TelegramClient>;
  updateTelegramClient(id: number, data: Partial<TelegramClient>): Promise<TelegramClient | undefined>;
  deleteTelegramClient(id: number): Promise<boolean>;
  
  // Plugin methods
  getPlugin(id: number): Promise<Plugin | undefined>;
  getPluginByName(name: string): Promise<Plugin | undefined>;
  getAllPlugins(): Promise<Plugin[]>;
  getActivePlugins(): Promise<Plugin[]>;
  createPlugin(plugin: InsertPlugin): Promise<Plugin>;
  updatePlugin(id: number, data: Partial<Plugin>): Promise<Plugin | undefined>;
  deletePlugin(id: number): Promise<boolean>;
  
  // Log methods
  createLog(log: InsertLog): Promise<Log>;
  getLogs(limit?: number, offset?: number): Promise<Log[]>;
  getLogsByClientId(clientId: number, limit?: number, offset?: number): Promise<Log[]>;
  getLogsByLevel(level: string, limit?: number, offset?: number): Promise<Log[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Telegram client methods
  async getTelegramClient(id: number): Promise<TelegramClient | undefined> {
    const [client] = await db.select().from(telegramClients).where(eq(telegramClients.id, id));
    return client;
  }
  
  async getTelegramClientByPhone(phoneNumber: string): Promise<TelegramClient | undefined> {
    const [client] = await db.select().from(telegramClients).where(eq(telegramClients.phoneNumber, phoneNumber));
    return client;
  }
  
  async getAllTelegramClients(): Promise<TelegramClient[]> {
    return await db.select().from(telegramClients);
  }
  
  async getActiveTelegramClients(): Promise<TelegramClient[]> {
    return await db.select().from(telegramClients).where(eq(telegramClients.isActive, true));
  }
  
  async createTelegramClient(client: InsertTelegramClient): Promise<TelegramClient> {
    const [newClient] = await db.insert(telegramClients).values(client).returning();
    return newClient;
  }
  
  async updateTelegramClient(id: number, data: Partial<TelegramClient>): Promise<TelegramClient | undefined> {
    const [updatedClient] = await db
      .update(telegramClients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(telegramClients.id, id))
      .returning();
    return updatedClient;
  }
  
  async deleteTelegramClient(id: number): Promise<boolean> {
    const result = await db.delete(telegramClients).where(eq(telegramClients.id, id));
    return true; // Предполагаем, что удаление всегда успешно, если нет ошибки
  }
  
  // Plugin methods
  async getPlugin(id: number): Promise<Plugin | undefined> {
    const [plugin] = await db.select().from(plugins).where(eq(plugins.id, id));
    return plugin;
  }
  
  async getPluginByName(name: string): Promise<Plugin | undefined> {
    const [plugin] = await db.select().from(plugins).where(eq(plugins.name, name));
    return plugin;
  }
  
  async getAllPlugins(): Promise<Plugin[]> {
    return await db.select().from(plugins);
  }
  
  async getActivePlugins(): Promise<Plugin[]> {
    return await db.select().from(plugins).where(eq(plugins.isActive, true));
  }
  
  async createPlugin(plugin: InsertPlugin): Promise<Plugin> {
    const [newPlugin] = await db.insert(plugins).values(plugin).returning();
    return newPlugin;
  }
  
  async updatePlugin(id: number, data: Partial<Plugin>): Promise<Plugin | undefined> {
    const [updatedPlugin] = await db
      .update(plugins)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(plugins.id, id))
      .returning();
    return updatedPlugin;
  }
  
  async deletePlugin(id: number): Promise<boolean> {
    const result = await db.delete(plugins).where(eq(plugins.id, id));
    return true; // Предполагаем, что удаление всегда успешно, если нет ошибки
  }
  
  // Log methods
  async createLog(log: InsertLog): Promise<Log> {
    // Проверка, что clientId либо валидный, либо его нет (системные логи)
    if (log.clientId === 0) {
      // Если clientId = 0, то удаляем его, чтобы использовать значение NULL
      const { clientId, ...logWithoutClientId } = log;
      const [newLog] = await db.insert(logs).values(logWithoutClientId).returning();
      return newLog;
    } else {
      const [newLog] = await db.insert(logs).values(log).returning();
      return newLog;
    }
  }
  
  async getLogs(limit: number = 100, offset: number = 0): Promise<Log[]> {
    return await db.select()
      .from(logs)
      .limit(limit)
      .offset(offset)
      .orderBy(logs.timestamp, "desc");
  }
  
  async getLogsByClientId(clientId: number, limit: number = 100, offset: number = 0): Promise<Log[]> {
    return await db.select()
      .from(logs)
      .where(eq(logs.clientId, clientId))
      .limit(limit)
      .offset(offset)
      .orderBy(logs.timestamp, "desc");
  }
  
  async getLogsByLevel(level: string, limit: number = 100, offset: number = 0): Promise<Log[]> {
    return await db.select()
      .from(logs)
      .where(eq(logs.level, level))
      .limit(limit)
      .offset(offset)
      .orderBy(logs.timestamp, "desc");
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private telegramClients: Map<number, TelegramClient>;
  private plugins: Map<number, Plugin>;
  private logs: Log[];
  private currentUserId: number;
  private currentClientId: number;
  private currentPluginId: number;
  private currentLogId: number;

  constructor() {
    this.users = new Map();
    this.telegramClients = new Map();
    this.plugins = new Map();
    this.logs = [];
    this.currentUserId = 1;
    this.currentClientId = 1;
    this.currentPluginId = 1;
    this.currentLogId = 1;
    
    // Добавляем демо-данные для разработки
    const demoClient1: TelegramClient = {
      id: this.currentClientId++,
      phoneNumber: "+7 999 123-45-67",
      apiId: 4,
      apiHash: "014b35b6184100b085b0d0572f9b5103",
      deviceModel: "Android",
      systemVersion: "Android 12",
      appVersion: "8.4.2",
      langCode: "ru",
      systemLangCode: "ru",
      isActive: true,
      status: "connected",
      lastActivityAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        timeout: 10,
        requestRetries: 5,
        connectionRetries: 5,
        retryDelay: 1000,
        autoReconnect: true,
        sequentialUpdates: true,
        floodSleepThreshold: 60
      }
    };
    
    const demoClient2: TelegramClient = {
      id: this.currentClientId++,
      phoneNumber: "+7 999 765-43-21",
      apiId: 2040,
      apiHash: "b18441a1ff607e10a989891a5462e627",
      deviceModel: "Desktop",
      systemVersion: "Windows 10",
      appVersion: "3.4.8",
      langCode: "ru",
      systemLangCode: "ru",
      isActive: false,
      status: "sleeping",
      lastActivityAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        timeout: 15,
        requestRetries: 3,
        connectionRetries: 3,
        retryDelay: 2000,
        autoReconnect: true,
        sequentialUpdates: true,
        floodSleepThreshold: 60
      }
    };
    
    this.telegramClients.set(demoClient1.id, demoClient1);
    this.telegramClients.set(demoClient2.id, demoClient2);
    
    // Демо плагины
    const plugin1: Plugin = {
      id: this.currentPluginId++,
      name: "auto-reply",
      displayName: "Auto Reply",
      description: "Автоматические ответы на сообщения",
      version: "1.2.0",
      author: "UserBot Team",
      isActive: true,
      isSystem: true,
      code: "// Код плагина auto-reply",
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const plugin2: Plugin = {
      id: this.currentPluginId++,
      name: "media-downloader",
      displayName: "Media Downloader",
      description: "Загрузка медиа из различных источников",
      version: "2.1.5",
      author: "UserBot Team",
      isActive: true,
      isSystem: true,
      code: "// Код плагина media-downloader",
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const plugin3: Plugin = {
      id: this.currentPluginId++,
      name: "admin-tools",
      displayName: "Admin Tools",
      description: "Инструменты администрирования чатов",
      version: "1.0.3",
      author: "UserBot Team",
      isActive: true,
      isSystem: true,
      code: "// Код плагина admin-tools",
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const plugin4: Plugin = {
      id: this.currentPluginId++,
      name: "notes",
      displayName: "Notes",
      description: "Система заметок и напоминаний",
      version: "1.1.2",
      author: "UserBot Team",
      isActive: true,
      isSystem: true,
      code: "// Код плагина notes",
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const plugin5: Plugin = {
      id: this.currentPluginId++,
      name: "welcome-bot",
      displayName: "Welcome Bot",
      description: "Приветствие новых участников в чатах",
      version: "0.9.7",
      author: "UserBot Team",
      isActive: true,
      isSystem: true,
      code: "// Код плагина welcome-bot",
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.plugins.set(plugin1.id, plugin1);
    this.plugins.set(plugin2.id, plugin2);
    this.plugins.set(plugin3.id, plugin3);
    this.plugins.set(plugin4.id, plugin4);
    this.plugins.set(plugin5.id, plugin5);
    
    // Демо логи
    this.addDemoLog("info", "System", "Система запущена успешно");
    this.addDemoLog("info", "TelegramClient", "Клиент +7 999 123-45-67 успешно подключен");
    this.addDemoLog("warning", "PluginManager", "Плагин \"Weather\" требует обновления зависимостей");
    this.addDemoLog("info", "TelegramClient", "Клиент +7 999 765-43-21 успешно подключен");
    this.addDemoLog("debug", "CommandHandler", "Зарегистрировано 48 команд для клиента +7 999 123-45-67");
    this.addDemoLog("error", "PluginManager", "Ошибка при загрузке плагина \"Translator\": отсутствует API ключ");
    this.addDemoLog("info", "EventHandler", "Обработано 15 новых сообщений");
    this.addDemoLog("debug", "DatabaseService", "Успешное подключение к базе данных PostgreSQL");
    this.addDemoLog("warning", "TelegramClient", "Предупреждение о флуд-контроле для клиента +7 999 123-45-67");
    this.addDemoLog("info", "TaskManager", "Запущено 7 асинхронных задач");
  }
  
  private addDemoLog(level: string, source: string, message: string) {
    const log: Log = {
      id: this.currentLogId++,
      clientId: 1, // Предполагаем, что это относится к первому клиенту
      level,
      source,
      message,
      timestamp: new Date()
    };
    this.logs.push(log);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Telegram client methods
  async getTelegramClient(id: number): Promise<TelegramClient | undefined> {
    return this.telegramClients.get(id);
  }
  
  async getTelegramClientByPhone(phoneNumber: string): Promise<TelegramClient | undefined> {
    return Array.from(this.telegramClients.values()).find(
      (client) => client.phoneNumber === phoneNumber,
    );
  }
  
  async getAllTelegramClients(): Promise<TelegramClient[]> {
    return Array.from(this.telegramClients.values());
  }
  
  async getActiveTelegramClients(): Promise<TelegramClient[]> {
    return Array.from(this.telegramClients.values()).filter(
      (client) => client.isActive === true,
    );
  }
  
  async createTelegramClient(client: InsertTelegramClient): Promise<TelegramClient> {
    const id = this.currentClientId++;
    const now = new Date();
    const newClient: TelegramClient = { 
      ...client, 
      id, 
      createdAt: now, 
      updatedAt: now,
      lastActivityAt: now
    };
    this.telegramClients.set(id, newClient);
    return newClient;
  }
  
  async updateTelegramClient(id: number, data: Partial<TelegramClient>): Promise<TelegramClient | undefined> {
    const client = this.telegramClients.get(id);
    if (!client) return undefined;
    
    const updatedClient: TelegramClient = { 
      ...client, 
      ...data, 
      updatedAt: new Date() 
    };
    this.telegramClients.set(id, updatedClient);
    return updatedClient;
  }
  
  async deleteTelegramClient(id: number): Promise<boolean> {
    return this.telegramClients.delete(id);
  }
  
  // Plugin methods
  async getPlugin(id: number): Promise<Plugin | undefined> {
    return this.plugins.get(id);
  }
  
  async getPluginByName(name: string): Promise<Plugin | undefined> {
    return Array.from(this.plugins.values()).find(
      (plugin) => plugin.name === name,
    );
  }
  
  async getAllPlugins(): Promise<Plugin[]> {
    return Array.from(this.plugins.values());
  }
  
  async getActivePlugins(): Promise<Plugin[]> {
    return Array.from(this.plugins.values()).filter(
      (plugin) => plugin.isActive === true,
    );
  }
  
  async createPlugin(plugin: InsertPlugin): Promise<Plugin> {
    const id = this.currentPluginId++;
    const now = new Date();
    const newPlugin: Plugin = { 
      ...plugin, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.plugins.set(id, newPlugin);
    return newPlugin;
  }
  
  async updatePlugin(id: number, data: Partial<Plugin>): Promise<Plugin | undefined> {
    const plugin = this.plugins.get(id);
    if (!plugin) return undefined;
    
    const updatedPlugin: Plugin = { 
      ...plugin, 
      ...data, 
      updatedAt: new Date() 
    };
    this.plugins.set(id, updatedPlugin);
    return updatedPlugin;
  }
  
  async deletePlugin(id: number): Promise<boolean> {
    return this.plugins.delete(id);
  }
  
  // Log methods
  async createLog(log: InsertLog): Promise<Log> {
    const id = this.currentLogId++;
    // Проверка системного лога
    if (log.clientId === 0) {
      const { clientId, ...logWithoutClientId } = log;
      const newLog: Log = { 
        ...logWithoutClientId, 
        id, 
        timestamp: new Date(),
        clientId: null  // Для системных логов
      };
      this.logs.push(newLog);
      return newLog;
    } else {
      const newLog: Log = { 
        ...log, 
        id, 
        timestamp: new Date() 
      };
      this.logs.push(newLog);
      return newLog;
    }
  }
  
  async getLogs(limit: number = 100, offset: number = 0): Promise<Log[]> {
    return this.logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }
  
  async getLogsByClientId(clientId: number, limit: number = 100, offset: number = 0): Promise<Log[]> {
    return this.logs
      .filter(log => log.clientId === clientId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }
  
  async getLogsByLevel(level: string, limit: number = 100, offset: number = 0): Promise<Log[]> {
    return this.logs
      .filter(log => log.level === level)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }
}

// Выбираем реализацию хранилища в зависимости от наличия переменной окружения
export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
