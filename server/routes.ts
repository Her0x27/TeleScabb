import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { TelegramSessionManager } from "./telegram/session";
import { TelegramEventManager, EventType, EventData } from "./telegram/event-manager";
import { PluginManager } from "./telegram/plugin-manager";
import { 
  insertTelegramClientSchema, 
  authCodeSchema, 
  clientSettingsSchema,
  insertPluginSchema,
  apiClients
} from "@shared/schema";
import { ZodError } from "zod";

// Инициализация менеджеров
const sessionManager = TelegramSessionManager.getInstance();
const eventManager = TelegramEventManager.getInstance();
const pluginManager = PluginManager.getInstance();

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware для обработки ошибок валидации
  const validateRequest = (schema: any) => {
    return (req: Request, res: Response, next: any) => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({ 
            message: "Ошибка валидации", 
            errors: error.errors 
          });
        }
        next(error);
      }
    };
  };

  // API для получения статистики
  app.get("/api/stats", async (req, res) => {
    try {
      const clients = await storage.getAllTelegramClients();
      const activeClients = clients.filter(c => c.isActive);
      const plugins = await storage.getAllPlugins();
      
      // В реальном приложении эти данные будут получены из базы данных
      const stats = {
        activeAccounts: activeClients.length,
        totalAccounts: clients.length,
        loadedPlugins: plugins.filter(p => p.isActive).length,
        totalPlugins: plugins.length,
        messagesLast24h: 287, // В реальном приложении это будет из метрик
        activeTasks: 7 // В реальном приложении это будет из системы задач
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: `Ошибка при получении статистики: ${(error as Error).message}` });
    }
  });

  // API для работы с клиентами Telegram
  
  // Получение списка всех клиентов
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getAllTelegramClients();
      
      // Не отправляем чувствительные данные клиенту
      const safeClients = clients.map(client => {
        const { sessionData, apiHash, ...safeClient } = client;
        return safeClient;
      });
      
      res.json(safeClients);
    } catch (error) {
      res.status(500).json({ message: `Ошибка при получении списка клиентов: ${(error as Error).message}` });
    }
  });
  
  // Получение списка предустановленных API клиентов
  app.get("/api/clients/presets", (req, res) => {
    res.json(apiClients);
  });
  
  // Создание нового клиента
  app.post("/api/clients", validateRequest(insertTelegramClientSchema), async (req, res) => {
    try {
      // Проверяем, не существует ли уже клиент с таким номером телефона
      const existingClient = await storage.getTelegramClientByPhone(req.body.phoneNumber);
      if (existingClient) {
        return res.status(400).json({ message: `Клиент с номером ${req.body.phoneNumber} уже существует` });
      }
      
      const newClient = await storage.createTelegramClient(req.body);
      
      // Не отправляем чувствительные данные клиенту
      const { sessionData, apiHash, ...safeClient } = newClient;
      
      // Логируем создание нового клиента
      await storage.createLog({
        clientId: 0, // Системный лог
        level: "info",
        source: "API",
        message: `Создан новый клиент с номером ${req.body.phoneNumber}`
      });
      
      res.status(201).json(safeClient);
    } catch (error) {
      res.status(500).json({ message: `Ошибка при создании клиента: ${(error as Error).message}` });
    }
  });
  
  // Получение информации о клиенте по ID
  app.get("/api/clients/:id", async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getTelegramClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: `Клиент с ID ${clientId} не найден` });
      }
      
      // Не отправляем чувствительные данные клиенту
      const { sessionData, apiHash, ...safeClient } = client;
      
      res.json(safeClient);
    } catch (error) {
      res.status(500).json({ message: `Ошибка при получении клиента: ${(error as Error).message}` });
    }
  });
  
  // Обновление настроек клиента
  app.patch("/api/clients/:id/settings", validateRequest(clientSettingsSchema), async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getTelegramClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: `Клиент с ID ${clientId} не найден` });
      }
      
      // Объединяем текущие настройки с новыми
      const updatedSettings = { ...client.settings, ...req.body };
      
      // Обновляем клиента в БД
      const updatedClient = await storage.updateTelegramClient(clientId, {
        settings: updatedSettings
      });
      
      if (!updatedClient) {
        return res.status(500).json({ message: "Не удалось обновить настройки клиента" });
      }
      
      // Не отправляем чувствительные данные клиенту
      const { sessionData, apiHash, ...safeClient } = updatedClient;
      
      // Логируем обновление настроек
      await storage.createLog({
        clientId,
        level: "info",
        source: "API",
        message: `Обновлены настройки клиента ${client.phoneNumber}`
      });
      
      res.json(safeClient);
    } catch (error) {
      res.status(500).json({ message: `Ошибка при обновлении настроек клиента: ${(error as Error).message}` });
    }
  });
  
  // Запуск клиента
  app.post("/api/clients/:id/start", async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getTelegramClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: `Клиент с ID ${clientId} не найден` });
      }
      
      // Если у клиента нет данных сессии, нужно сначала авторизоваться
      if (!client.sessionData) {
        return res.status(400).json({ message: "Клиент не авторизован. Сначала выполните авторизацию." });
      }
      
      const success = await sessionManager.startSession(clientId);
      
      if (!success) {
        return res.status(500).json({ message: "Не удалось запустить клиента" });
      }
      
      res.json({ message: `Клиент ${client.phoneNumber} успешно запущен` });
    } catch (error) {
      res.status(500).json({ message: `Ошибка при запуске клиента: ${(error as Error).message}` });
    }
  });
  
  // Остановка клиента
  app.post("/api/clients/:id/stop", async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getTelegramClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: `Клиент с ID ${clientId} не найден` });
      }
      
      const success = await sessionManager.stopSession(clientId);
      
      if (!success) {
        return res.status(500).json({ message: "Не удалось остановить клиента" });
      }
      
      res.json({ message: `Клиент ${client.phoneNumber} успешно остановлен` });
    } catch (error) {
      res.status(500).json({ message: `Ошибка при остановке клиента: ${(error as Error).message}` });
    }
  });
  
  // Отправка кода авторизации
  app.post("/api/clients/:id/send-code", async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getTelegramClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: `Клиент с ID ${clientId} не найден` });
      }
      
      // Создаем временную сессию, если её еще нет
      let session = sessionManager.getSession(clientId);
      if (!session) {
        session = await sessionManager.createSession(client);
      }
      
      // Отправляем код авторизации
      const result = await session.sendCode(client.phoneNumber);
      
      res.json({ 
        phoneCodeHash: result.phoneCodeHash,
        message: `Код авторизации отправлен на номер ${client.phoneNumber}`
      });
    } catch (error) {
      res.status(500).json({ message: `Ошибка при отправке кода авторизации: ${(error as Error).message}` });
    }
  });
  
  // Подтверждение кода авторизации
  app.post("/api/clients/:id/sign-in", validateRequest(authCodeSchema), async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const client = await storage.getTelegramClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: `Клиент с ID ${clientId} не найден` });
      }
      
      // Получаем сессию
      let session = sessionManager.getSession(clientId);
      if (!session) {
        return res.status(400).json({ message: "Сессия не найдена. Сначала отправьте код авторизации." });
      }
      
      // Подтверждаем код авторизации
      await session.signIn(client.phoneNumber, req.body.phoneCodeHash, req.body.code);
      
      // Обновляем статус клиента
      const updatedClient = await storage.updateTelegramClient(clientId, {
        isActive: true,
        status: "connected"
      });
      
      res.json({ message: `Клиент ${client.phoneNumber} успешно авторизован` });
    } catch (error) {
      res.status(500).json({ message: `Ошибка при авторизации: ${(error as Error).message}` });
    }
  });
  
  // Запуск всех клиентов
  app.post("/api/clients/start-all", async (req, res) => {
    try {
      const success = await sessionManager.startAllSessions();
      
      if (!success) {
        return res.status(500).json({ message: "Не удалось запустить все клиенты" });
      }
      
      res.json({ message: "Все клиенты успешно запущены" });
    } catch (error) {
      res.status(500).json({ message: `Ошибка при запуске клиентов: ${(error as Error).message}` });
    }
  });
  
  // Остановка всех клиентов
  app.post("/api/clients/stop-all", async (req, res) => {
    try {
      const success = await sessionManager.stopAllSessions();
      
      if (!success) {
        return res.status(500).json({ message: "Не удалось остановить все клиенты" });
      }
      
      res.json({ message: "Все клиенты успешно остановлены" });
    } catch (error) {
      res.status(500).json({ message: `Ошибка при остановке клиентов: ${(error as Error).message}` });
    }
  });
  
  // API для работы с плагинами
  
  // Получение списка всех плагинов
  app.get("/api/plugins", async (req, res) => {
    try {
      const plugins = await storage.getAllPlugins();
      res.json(plugins);
    } catch (error) {
      res.status(500).json({ message: `Ошибка при получении списка плагинов: ${(error as Error).message}` });
    }
  });
  
  // Создание нового плагина
  app.post("/api/plugins", validateRequest(insertPluginSchema), async (req, res) => {
    try {
      // Проверяем, не существует ли уже плагин с таким именем
      const existingPlugin = await storage.getPluginByName(req.body.name);
      if (existingPlugin) {
        return res.status(400).json({ message: `Плагин с именем ${req.body.name} уже существует` });
      }
      
      const newPlugin = await storage.createPlugin(req.body);
      
      // Логируем создание нового плагина
      await storage.createLog({
        clientId: 0, // Системный лог
        level: "info",
        source: "API",
        message: `Создан новый плагин ${req.body.displayName}`
      });
      
      res.status(201).json(newPlugin);
    } catch (error) {
      res.status(500).json({ message: `Ошибка при создании плагина: ${(error as Error).message}` });
    }
  });
  
  // Получение информации о плагине по ID
  app.get("/api/plugins/:id", async (req, res) => {
    try {
      const pluginId = parseInt(req.params.id);
      const plugin = await storage.getPlugin(pluginId);
      
      if (!plugin) {
        return res.status(404).json({ message: `Плагин с ID ${pluginId} не найден` });
      }
      
      res.json(plugin);
    } catch (error) {
      res.status(500).json({ message: `Ошибка при получении плагина: ${(error as Error).message}` });
    }
  });
  
  // Запуск плагина
  app.post("/api/plugins/:id/start", async (req, res) => {
    try {
      const pluginId = parseInt(req.params.id);
      const plugin = await storage.getPlugin(pluginId);
      
      if (!plugin) {
        return res.status(404).json({ message: `Плагин с ID ${pluginId} не найден` });
      }
      
      const success = await pluginManager.loadPlugin(plugin);
      
      if (!success) {
        return res.status(500).json({ message: "Не удалось запустить плагин" });
      }
      
      res.json({ message: `Плагин ${plugin.displayName} успешно запущен` });
    } catch (error) {
      res.status(500).json({ message: `Ошибка при запуске плагина: ${(error as Error).message}` });
    }
  });
  
  // Остановка плагина
  app.post("/api/plugins/:id/stop", async (req, res) => {
    try {
      const pluginId = parseInt(req.params.id);
      const plugin = await storage.getPlugin(pluginId);
      
      if (!plugin) {
        return res.status(404).json({ message: `Плагин с ID ${pluginId} не найден` });
      }
      
      const success = await pluginManager.unloadPlugin(pluginId);
      
      if (!success) {
        return res.status(500).json({ message: "Не удалось остановить плагин" });
      }
      
      res.json({ message: `Плагин ${plugin.displayName} успешно остановлен` });
    } catch (error) {
      res.status(500).json({ message: `Ошибка при остановке плагина: ${(error as Error).message}` });
    }
  });
  
  // Обновление плагина
  app.patch("/api/plugins/:id", async (req, res) => {
    try {
      const pluginId = parseInt(req.params.id);
      const plugin = await storage.getPlugin(pluginId);
      
      if (!plugin) {
        return res.status(404).json({ message: `Плагин с ID ${pluginId} не найден` });
      }
      
      // Проверяем, что плагин не системный
      if (plugin.isSystem) {
        return res.status(403).json({ message: "Нельзя редактировать системный плагин" });
      }
      
      // Обновляем плагин в БД
      const updatedPlugin = await storage.updatePlugin(pluginId, req.body);
      
      if (!updatedPlugin) {
        return res.status(500).json({ message: "Не удалось обновить плагин" });
      }
      
      // Если плагин активен, перезагружаем его
      if (updatedPlugin.isActive) {
        await pluginManager.unloadPlugin(pluginId);
        await pluginManager.loadPlugin(updatedPlugin);
      }
      
      // Логируем обновление плагина
      await storage.createLog({
        clientId: 0, // Системный лог
        level: "info",
        source: "API",
        message: `Обновлен плагин ${updatedPlugin.displayName}`
      });
      
      res.json(updatedPlugin);
    } catch (error) {
      res.status(500).json({ message: `Ошибка при обновлении плагина: ${(error as Error).message}` });
    }
  });
  
  // Удаление плагина
  app.delete("/api/plugins/:id", async (req, res) => {
    try {
      const pluginId = parseInt(req.params.id);
      const plugin = await storage.getPlugin(pluginId);
      
      if (!plugin) {
        return res.status(404).json({ message: `Плагин с ID ${pluginId} не найден` });
      }
      
      // Проверяем, что плагин не системный
      if (plugin.isSystem) {
        return res.status(403).json({ message: "Нельзя удалить системный плагин" });
      }
      
      // Если плагин активен, сначала выгружаем его
      if (plugin.isActive) {
        await pluginManager.unloadPlugin(pluginId);
      }
      
      // Удаляем плагин из БД
      const success = await storage.deletePlugin(pluginId);
      
      if (!success) {
        return res.status(500).json({ message: "Не удалось удалить плагин" });
      }
      
      // Логируем удаление плагина
      await storage.createLog({
        clientId: 0, // Системный лог
        level: "info",
        source: "API",
        message: `Удален плагин ${plugin.displayName}`
      });
      
      res.json({ message: `Плагин ${plugin.displayName} успешно удален` });
    } catch (error) {
      res.status(500).json({ message: `Ошибка при удалении плагина: ${(error as Error).message}` });
    }
  });
  
  // API для работы с логами
  
  // Получение списка логов
  app.get("/api/logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      const level = req.query.level as string;
      
      let logs;
      
      if (clientId) {
        logs = await storage.getLogsByClientId(clientId, limit, offset);
      } else if (level) {
        logs = await storage.getLogsByLevel(level, limit, offset);
      } else {
        logs = await storage.getLogs(limit, offset);
      }
      
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: `Ошибка при получении логов: ${(error as Error).message}` });
    }
  });

  // Инициализация системы
  try {
    // Инициализируем активные клиенты
    await sessionManager.initActiveClients();
    
    // Инициализируем активные плагины
    await pluginManager.initActivePlugins();
    
    // Логируем успешный запуск системы
    await storage.createLog({
      clientId: 0, // Системный лог
      level: "info",
      source: "System",
      message: "Telegram UserBot успешно запущен"
    });
  } catch (error) {
    console.error("Ошибка при инициализации системы:", error);
    
    // Логируем ошибку запуска
    await storage.createLog({
      clientId: 0, // Системный лог
      level: "error",
      source: "System",
      message: `Ошибка при запуске системы: ${(error as Error).message}`
    });
  }

  const httpServer = createServer(app);
  
  // Создаем WebSocket сервер на отдельном пути, чтобы избежать конфликтов с Vite HMR
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Клиенты для рассылки сообщений
  const clients = new Set<WebSocket>();
  
  // Обработка подключений WebSocket
  wss.on('connection', (ws) => {
    // Добавляем клиента в множество
    clients.add(ws);
    
    // Отправляем приветственное сообщение
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Подключение к Telegram UserBot успешно установлено'
    }));
    
    // Логируем новое подключение
    storage.createLog({
      clientId: 0, // Системный лог
      level: "info",
      source: "WebSocket",
      message: "Новое WebSocket-подключение установлено"
    });
    
    // Обработка закрытия соединения
    ws.on('close', () => {
      clients.delete(ws);
      
      // Логируем закрытие подключения
      storage.createLog({
        clientId: 0, // Системный лог
        level: "info",
        source: "WebSocket",
        message: "WebSocket-подключение закрыто"
      });
    });
    
    // Обработка сообщений от клиента (можно использовать для команд)
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Логируем полученное сообщение
        storage.createLog({
          clientId: 0, // Системный лог
          level: "info",
          source: "WebSocket",
          message: `Получено сообщение: ${JSON.stringify(data)}`
        });
        
        // Обработка различных типов сообщений
        if (data.type === 'command') {
          // Обработка команд от клиента
          // ...
        }
      } catch (error) {
        // Логируем ошибку
        storage.createLog({
          clientId: 0, // Системный лог
          level: "error",
          source: "WebSocket",
          message: `Ошибка при обработке сообщения: ${(error as Error).message}`
        });
      }
    });
  });
  
  // Подписываемся на события от TelegramEventManager
  eventManager.on('event', (eventData: EventData) => {
    // Рассылаем события всем подключенным клиентам
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(eventData));
      }
    }
  });
  
  return httpServer;
}
