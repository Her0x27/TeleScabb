import { TelegramClient as TelegramApi } from "telegram";
import { sessions } from "telegram";
import { Api } from "telegram";
import { TelegramClient as ClientType, ClientSettings } from "@shared/schema";
import { storage } from "../storage";
import { EventEmitter } from "events";

// Создаем класс StringSession из библиотеки telegram
const StringSession = sessions.StringSession;

interface TelegramClientOptions {
  clientData: ClientType;
  onUpdate?: (update: any) => void;
  onError?: (error: Error) => void;
}

export class TelegramUserClient extends EventEmitter {
  private client: TelegramApi;
  private clientData: ClientType;
  private connected: boolean = false;
  private updateHandler?: (update: any) => void;
  private errorHandler?: (error: Error) => void;
  // Для хранения результата запроса кода авторизации
  private phoneCodeData: { phoneCodeHash: string } | null = null;
  
  constructor(options: TelegramClientOptions) {
    super();
    this.clientData = options.clientData;
    this.updateHandler = options.onUpdate;
    this.errorHandler = options.onError;
    
    // Создаем клиент с необходимыми параметрами
    const session = new StringSession(this.clientData.sessionData || "");
    const settings = this.clientData.settings as ClientSettings;
    
    this.client = new TelegramApi(
      session,
      this.clientData.apiId,
      this.clientData.apiHash,
      {
        connectionRetries: settings.connectionRetries || 5,
        deviceModel: this.clientData.deviceModel || "Desktop",
        systemVersion: this.clientData.systemVersion || "Windows 10",
        appVersion: this.clientData.appVersion || "1.0.0",
        useWSS: true,
        langCode: this.clientData.langCode || "ru",
        systemLangCode: this.clientData.systemLangCode || "ru",
      }
    );
    
    // Настройка обработчиков событий
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    // Обработчик обновлений
    this.client.addEventHandler((update) => {
      if (this.updateHandler) {
        this.updateHandler(update);
      }
      this.emit('update', update);
    });
  }
  
  async connect(): Promise<boolean> {
    try {
      await this.client.connect();
      this.connected = true;
      
      // Сохраняем сессию и обновляем в БД
      const sessionString = this.client.session.save() as string;
      
      // Обновляем данные клиента в БД
      await storage.updateTelegramClient(this.clientData.id, {
        status: "connected",
        sessionData: sessionString,
        lastActivityAt: new Date()
      });
      
      // Обновляем локальные данные
      this.clientData.status = "connected";
      this.clientData.sessionData = sessionString;
      
      // Логируем успешное подключение
      await storage.createLog({
        clientId: this.clientData.id,
        level: "info",
        source: "TelegramClient",
        message: `Клиент ${this.clientData.phoneNumber} успешно подключен`
      });
      
      this.emit('connected');
      return true;
    } catch (error) {
      this.connected = false;
      
      // Логируем ошибку подключения
      await storage.createLog({
        clientId: 0, // Системный лог
        level: "error",
        source: "TelegramClient",
        message: `Ошибка подключения: ${(error as Error).message}`
      });
      
      this.emit('error', error);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.connected = false;
      
      // Обновляем статус в БД
      await storage.updateTelegramClient(this.clientData.id, {
        status: "disconnected",
        lastActivityAt: new Date()
      });
      
      // Обновляем локальные данные
      this.clientData.status = "disconnected";
      
      // Логируем отключение
      await storage.createLog({
        clientId: this.clientData.id,
        level: "info",
        source: "TelegramClient",
        message: `Клиент ${this.clientData.phoneNumber} отключен`
      });
      
      this.emit('disconnected');
    } catch (error) {
      // Логируем ошибку отключения
      await storage.createLog({
        clientId: 0, // Системный лог
        level: "error",
        source: "TelegramClient",
        message: `Ошибка при отключении: ${(error as Error).message}`
      });
      
      this.emit('error', error);
      throw error;
    }
  }
  
  async sendMessage(chatId: string | number, message: string): Promise<any> {
    try {
      if (!this.connected) {
        await this.connect();
      }
      
      // Преобразуем chatId в правильный формат InputPeer
      let peer;
      if (typeof chatId === 'string') {
        // Если это username, добавим @ если его нет
        if (!chatId.startsWith('@')) {
          chatId = '@' + chatId;
        }
        peer = chatId;
      } else {
        // Если это числовой ID, создаем InputPeerUser
        peer = new Api.InputPeerUser({
          userId: chatId,
          accessHash: 0 // В идеале нужно получить правильный access_hash
        });
      }
      
      // В библиотеке telegram нужно передавать параметры как объект
      const result = await this.client.sendMessage({
        peer: peer,
        message: message
      });
      
      // Логируем отправку сообщения
      await storage.createLog({
        clientId: this.clientData.id,
        level: "info",
        source: "TelegramClient",
        message: `Отправлено сообщение в чат ${chatId}`
      });
      
      return result;
    } catch (error) {
      // Логируем ошибку отправки
      await storage.createLog({
        clientId: this.clientData.id,
        level: "error",
        source: "TelegramClient",
        message: `Ошибка при отправке сообщения: ${(error as Error).message}`
      });
      
      this.emit('error', error);
      throw error;
    }
  }
  
  async requestAuthCode(phoneNumber: string): Promise<any> {
    try {
      // В библиотеке telegram метод sendCode принимает одну apiCredentials, которая содержит phoneNumber
      const result = await this.client.sendCode({
        apiId: this.clientData.apiId,
        apiHash: this.clientData.apiHash,
        phoneNumber: phoneNumber
      });
      
      // Логируем отправку кода
      await storage.createLog({
        clientId: this.clientData.id,
        level: "info",
        source: "TelegramClient",
        message: `Код авторизации отправлен на номер ${phoneNumber}`
      });
      
      return result;
    } catch (error) {
      // Логируем ошибку отправки кода
      await storage.createLog({
        clientId: 0, // Системный лог
        level: "error",
        source: "TelegramClient",
        message: `Ошибка при отправке кода авторизации: ${(error as Error).message}`
      });
      
      this.emit('error', error);
      throw error;
    }
  }
  
  async loginWithCode(phoneNumber: string, phoneCodeHash: string, phoneCode: string): Promise<any> {
    try {
      // В более новой версии библиотеки есть прямой метод для входа по коду
      const result = await this.client.invoke(new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode
      }));
      
      // Сохраняем сессию и обновляем в БД
      const sessionString = this.client.session.save() as string;
      
      await storage.updateTelegramClient(this.clientData.id, {
        status: "connected",
        sessionData: sessionString,
        lastActivityAt: new Date()
      });
      
      // Обновляем локальные данные
      this.clientData.status = "connected";
      this.clientData.sessionData = sessionString;
      
      // Логируем успешную авторизацию
      await storage.createLog({
        clientId: this.clientData.id,
        level: "info",
        source: "TelegramClient",
        message: `Клиент ${phoneNumber} успешно авторизован`
      });
      
      return result;
    } catch (error) {
      // Логируем ошибку авторизации
      await storage.createLog({
        clientId: 0, // Системный лог
        level: "error",
        source: "TelegramClient",
        message: `Ошибка при авторизации: ${(error as Error).message}`
      });
      
      this.emit('error', error);
      throw error;
    }
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  getClientData(): ClientType {
    return this.clientData;
  }
  
  getRawClient(): TelegramApi {
    return this.client;
  }
  
  // Дополнительные методы для работы с API Telegram
  async getMe(): Promise<any> {
    try {
      if (!this.connected) {
        await this.connect();
      }
      return await this.client.getMe();
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  async getDialogs(limit: number = 100): Promise<any[]> {
    try {
      if (!this.connected) {
        await this.connect();
      }
      // Параметр limit в объекте, а не как числовое значение
      return await this.client.getDialogs({limit});
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // Метод для отправки кода авторизации (используется в routes.ts)
  async sendCode(phoneNumber: string): Promise<{phoneCodeHash: string}> {
    try {
      const result = await this.requestAuthCode(phoneNumber);
      this.phoneCodeData = { phoneCodeHash: result.phoneCodeHash };
      return this.phoneCodeData;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // Метод для авторизации по коду (используется в routes.ts)
  async signIn(phoneNumber: string, phoneCodeHash: string, code: string): Promise<any> {
    try {
      const result = await this.loginWithCode(phoneNumber, phoneCodeHash, code);
      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
}