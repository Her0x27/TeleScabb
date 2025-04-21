import { Plugin } from "@shared/schema";
import { storage } from "../storage";
import { TelegramSessionManager } from "./session";
import { TelegramEventManager, EventType, EventHandler } from "./event-manager";
import { EventEmitter } from "events";
import { VM } from "vm2";

// Интерфейс для плагина, который будет встраиваться в систему
interface PluginInterface {
  onLoad: (context: PluginContext) => Promise<void>;
  onUnload: () => Promise<void>;
}

// Контекст, который передается плагину
export class PluginContext {
  private pluginData: Plugin;
  private sessionManager: TelegramSessionManager;
  private eventManager: TelegramEventManager;
  private registeredHandlers: EventHandler[] = [];
  
  constructor(pluginData: Plugin) {
    this.pluginData = pluginData;
    this.sessionManager = TelegramSessionManager.getInstance();
    this.eventManager = TelegramEventManager.getInstance();
  }
  
  // Получение данных плагина
  public getPluginData(): Plugin {
    return this.pluginData;
  }
  
  // Регистрация обработчика событий
  public registerEventHandler(type: EventType | string, handler: (data: any, clientId: number) => Promise<void>, priority?: number): void {
    const eventHandler: EventHandler = {
      type,
      handler,
      priority
    };
    
    this.eventManager.registerHandler(eventHandler);
    this.registeredHandlers.push(eventHandler);
  }
  
  // Отправка сообщения через клиент Telegram
  public async sendMessage(clientId: number, chatId: string | number, message: string): Promise<any> {
    const client = this.sessionManager.getSession(clientId);
    if (!client) {
      throw new Error(`Клиент с ID ${clientId} не найден`);
    }
    
    return await client.sendMessage(chatId, message);
  }
  
  // Получение диалогов клиента
  public async getDialogs(clientId: number, limit?: number): Promise<any[]> {
    const client = this.sessionManager.getSession(clientId);
    if (!client) {
      throw new Error(`Клиент с ID ${clientId} не найден`);
    }
    
    return await client.getDialogs(limit);
  }
  
  // Получение информации о текущем пользователе
  public async getMe(clientId: number): Promise<any> {
    const client = this.sessionManager.getSession(clientId);
    if (!client) {
      throw new Error(`Клиент с ID ${clientId} не найден`);
    }
    
    return await client.getMe();
  }
  
  // Получение всех активных клиентов
  public getActiveClients(): number[] {
    const sessions = this.sessionManager.getAllSessions();
    return Array.from(sessions.keys());
  }
  
  // Добавление записи в лог
  public async log(level: string, message: string, clientId?: number): Promise<void> {
    await storage.createLog({
      clientId: clientId || 0,
      level,
      source: `Plugin:${this.pluginData.name}`,
      message
    });
  }
  
  // Получение настроек плагина
  public getSettings(): any {
    return this.pluginData.settings;
  }
  
  // Обновление настроек плагина
  public async updateSettings(settings: any): Promise<void> {
    await storage.updatePlugin(this.pluginData.id, {
      settings: { ...this.pluginData.settings, ...settings }
    });
    
    // Обновляем локальные данные
    this.pluginData.settings = { ...this.pluginData.settings, ...settings };
  }
  
  // Очистка всех ресурсов плагина
  public cleanup(): void {
    // Удаляем все зарегистрированные обработчики событий
    for (const handler of this.registeredHandlers) {
      this.eventManager.unregisterHandler(handler.type, handler.handler);
    }
    this.registeredHandlers = [];
  }
}

// Класс для управления плагинами
export class PluginManager extends EventEmitter {
  private static instance: PluginManager;
  private loadedPlugins: Map<number, { instance: PluginInterface, context: PluginContext }> = new Map();
  
  private constructor() {
    super();
  }
  
  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }
  
  // Инициализация активных плагинов из базы данных
  public async initActivePlugins(): Promise<void> {
    try {
      const activePlugins = await storage.getActivePlugins();
      
      for (const pluginData of activePlugins) {
        await this.loadPlugin(pluginData);
      }
      
      storage.createLog({
        clientId: 0, // Системный лог
        level: "info",
        source: "PluginManager",
        message: `Инициализировано ${this.loadedPlugins.size} активных плагинов`
      });
    } catch (error) {
      storage.createLog({
        clientId: 0, // Системный лог
        level: "error",
        source: "PluginManager",
        message: `Ошибка при инициализации плагинов: ${(error as Error).message}`
      });
      throw error;
    }
  }
  
  // Загрузка плагина
  public async loadPlugin(pluginData: Plugin): Promise<boolean> {
    try {
      // Если плагин уже загружен, сначала выгружаем его
      if (this.loadedPlugins.has(pluginData.id)) {
        await this.unloadPlugin(pluginData.id);
      }
      
      // Создаем контекст для плагина
      const context = new PluginContext(pluginData);
      
      // Создаем песочницу для выполнения кода плагина
      const sandbox = {
        console: {
          log: (...args: any[]) => {
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            
            storage.createLog({
              clientId: 0,
              level: "debug",
              source: `Plugin:${pluginData.name}`,
              message
            });
          },
          error: (...args: any[]) => {
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            
            storage.createLog({
              clientId: 0,
              level: "error",
              source: `Plugin:${pluginData.name}`,
              message
            });
          }
        },
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        EventType,
        context
      };
      
      // Создаем виртуальную машину
      const vm = new VM({
        timeout: 5000, // 5 секунд таймаут для инициализации
        sandbox
      });
      
      // Выполняем код плагина
      const pluginInstance = vm.run(`(${pluginData.code})()`);
      
      // Проверяем, что плагин реализует необходимый интерфейс
      if (!pluginInstance.onLoad || !pluginInstance.onUnload) {
        throw new Error("Плагин не реализует требуемый интерфейс");
      }
      
      // Вызываем метод инициализации плагина
      await pluginInstance.onLoad(context);
      
      // Сохраняем экземпляр плагина
      this.loadedPlugins.set(pluginData.id, { instance: pluginInstance, context });
      
      // Логируем успешную загрузку
      storage.createLog({
        clientId: 0,
        level: "info",
        source: "PluginManager",
        message: `Плагин ${pluginData.name} успешно загружен`
      });
      
      // Обновляем статус плагина в БД
      await storage.updatePlugin(pluginData.id, { isActive: true });
      
      this.emit('plugin_loaded', pluginData.id);
      return true;
    } catch (error) {
      // Логируем ошибку загрузки
      storage.createLog({
        clientId: 0,
        level: "error",
        source: "PluginManager",
        message: `Ошибка при загрузке плагина ${pluginData.name}: ${(error as Error).message}`
      });
      
      // Обновляем статус плагина в БД
      await storage.updatePlugin(pluginData.id, { isActive: false });
      
      this.emit('plugin_error', { pluginId: pluginData.id, error });
      return false;
    }
  }
  
  // Выгрузка плагина
  public async unloadPlugin(pluginId: number): Promise<boolean> {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) return false;
    
    try {
      // Вызываем метод выгрузки плагина
      await plugin.instance.onUnload();
      
      // Очищаем ресурсы плагина
      plugin.context.cleanup();
      
      // Удаляем плагин из списка загруженных
      this.loadedPlugins.delete(pluginId);
      
      // Обновляем статус плагина в БД
      const pluginData = plugin.context.getPluginData();
      await storage.updatePlugin(pluginId, { isActive: false });
      
      // Логируем успешную выгрузку
      storage.createLog({
        clientId: 0,
        level: "info",
        source: "PluginManager",
        message: `Плагин ${pluginData.name} успешно выгружен`
      });
      
      this.emit('plugin_unloaded', pluginId);
      return true;
    } catch (error) {
      // Логируем ошибку выгрузки
      const pluginData = plugin.context.getPluginData();
      storage.createLog({
        clientId: 0,
        level: "error",
        source: "PluginManager",
        message: `Ошибка при выгрузке плагина ${pluginData.name}: ${(error as Error).message}`
      });
      
      this.emit('plugin_error', { pluginId, error });
      return false;
    }
  }
  
  // Получение загруженного плагина
  public getLoadedPlugin(pluginId: number): { instance: PluginInterface, context: PluginContext } | undefined {
    return this.loadedPlugins.get(pluginId);
  }
  
  // Получение всех загруженных плагинов
  public getAllLoadedPlugins(): Map<number, { instance: PluginInterface, context: PluginContext }> {
    return this.loadedPlugins;
  }
}
