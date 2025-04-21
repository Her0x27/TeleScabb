import { TelegramUserClient } from "./client";
import { TelegramClient } from "@shared/schema";
import { storage } from "../storage";
import { EventEmitter } from "events";

// Класс для управления сессиями Telegram
export class TelegramSessionManager extends EventEmitter {
  private sessions: Map<number, TelegramUserClient> = new Map();
  private static instance: TelegramSessionManager;
  
  private constructor() {
    super();
  }
  
  public static getInstance(): TelegramSessionManager {
    if (!TelegramSessionManager.instance) {
      TelegramSessionManager.instance = new TelegramSessionManager();
    }
    return TelegramSessionManager.instance;
  }
  
  // Инициализация активных клиентов из базы данных
  public async initActiveClients(): Promise<void> {
    try {
      const activeClients = await storage.getActiveTelegramClients();
      
      for (const clientData of activeClients) {
        // Пропускаем клиенты без данных сессии
        if (!clientData.sessionData) continue;
        
        await this.createSession(clientData);
      }
      
      storage.createLog({
        clientId: 0, // Системный лог
        level: "info",
        source: "SessionManager",
        message: `Инициализировано ${this.sessions.size} активных клиентов`
      });
    } catch (error) {
      storage.createLog({
        clientId: 0, // Системный лог
        level: "error",
        source: "SessionManager",
        message: `Ошибка при инициализации активных клиентов: ${(error as Error).message}`
      });
      throw error;
    }
  }
  
  // Создание новой сессии
  public async createSession(clientData: TelegramClient): Promise<TelegramUserClient> {
    const client = new TelegramUserClient({
      clientData,
      onUpdate: (update) => {
        this.emit('update', { clientId: clientData.id, update });
      },
      onError: (error) => {
        this.emit('error', { clientId: clientData.id, error });
      }
    });
    
    this.sessions.set(clientData.id, client);
    
    client.on('connected', () => {
      this.emit('client_connected', clientData.id);
    });
    
    client.on('disconnected', () => {
      this.emit('client_disconnected', clientData.id);
    });
    
    // Если клиент помечен как активный, подключаем его
    if (clientData.isActive && clientData.sessionData) {
      try {
        await client.connect();
      } catch (error) {
        storage.createLog({
          clientId: clientData.id,
          level: "error",
          source: "SessionManager",
          message: `Не удалось подключить клиента ${clientData.phoneNumber}: ${(error as Error).message}`
        });
      }
    }
    
    return client;
  }
  
  // Получение сессии по ID клиента
  public getSession(clientId: number): TelegramUserClient | undefined {
    return this.sessions.get(clientId);
  }
  
  // Остановка сессии
  public async stopSession(clientId: number): Promise<boolean> {
    const session = this.sessions.get(clientId);
    if (!session) return false;
    
    try {
      await session.disconnect();
      this.sessions.delete(clientId);
      
      // Обновляем статус в БД
      await storage.updateTelegramClient(clientId, {
        isActive: false,
        status: "disconnected"
      });
      
      return true;
    } catch (error) {
      storage.createLog({
        clientId,
        level: "error",
        source: "SessionManager",
        message: `Ошибка при остановке сессии: ${(error as Error).message}`
      });
      return false;
    }
  }
  
  // Запуск сессии
  public async startSession(clientId: number): Promise<boolean> {
    let session = this.sessions.get(clientId);
    
    // Если сессия не существует, создаем ее
    if (!session) {
      const clientData = await storage.getTelegramClient(clientId);
      if (!clientData) return false;
      
      session = await this.createSession(clientData);
    }
    
    try {
      if (!session.isConnected()) {
        await session.connect();
      }
      
      // Обновляем статус в БД
      await storage.updateTelegramClient(clientId, {
        isActive: true,
        status: "connected"
      });
      
      return true;
    } catch (error) {
      storage.createLog({
        clientId,
        level: "error",
        source: "SessionManager",
        message: `Ошибка при запуске сессии: ${(error as Error).message}`
      });
      return false;
    }
  }
  
  // Получение всех активных сессий
  public getAllSessions(): Map<number, TelegramUserClient> {
    return this.sessions;
  }
  
  // Остановка всех сессий
  public async stopAllSessions(): Promise<boolean> {
    try {
      const promises = Array.from(this.sessions.keys()).map(clientId => 
        this.stopSession(clientId)
      );
      
      await Promise.all(promises);
      
      storage.createLog({
        clientId: 0, // Системный лог
        level: "info",
        source: "SessionManager",
        message: "Все сессии успешно остановлены"
      });
      
      return true;
    } catch (error) {
      storage.createLog({
        clientId: 0, // Системный лог
        level: "error",
        source: "SessionManager",
        message: `Ошибка при остановке всех сессий: ${(error as Error).message}`
      });
      return false;
    }
  }
  
  // Запуск всех сессий
  public async startAllSessions(): Promise<boolean> {
    try {
      const clients = await storage.getAllTelegramClients();
      
      const promises = clients.map(client => 
        this.startSession(client.id)
      );
      
      await Promise.all(promises);
      
      storage.createLog({
        clientId: 0, // Системный лог
        level: "info",
        source: "SessionManager",
        message: "Все сессии успешно запущены"
      });
      
      return true;
    } catch (error) {
      storage.createLog({
        clientId: 0, // Системный лог
        level: "error",
        source: "SessionManager",
        message: `Ошибка при запуске всех сессий: ${(error as Error).message}`
      });
      return false;
    }
  }
}
