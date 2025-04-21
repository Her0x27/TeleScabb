import { TelegramSessionManager } from "./session";
import { storage } from "../storage";
import { EventEmitter } from "events";

// Типы обрабатываемых событий
export enum EventType {
  NEW_MESSAGE = "newMessage",
  EDITED_MESSAGE = "editedMessage",
  DELETED_MESSAGES = "deletedMessages",
  USER_UPDATE = "userUpdate",
  USER_STATUS = "userStatus",
  CHAT_ACTION = "chatAction",
  LOG = "log" // Новый тип для логов
}

// Структура данных события
export interface EventData {
  type: EventType;
  clientId: number;
  data: any;
}

// Интерфейс обработчика событий
export interface EventHandler {
  type: EventType | string;
  handler: (data: any, clientId: number) => Promise<void>;
  priority?: number; // Приоритет для определения порядка выполнения
}

// Класс для управления событиями Telegram
export class TelegramEventManager extends EventEmitter {
  private static instance: TelegramEventManager;
  private sessionManager: TelegramSessionManager;
  private handlers: EventHandler[] = [];
  
  private constructor() {
    super();
    this.sessionManager = TelegramSessionManager.getInstance();
    this.setupListeners();
  }
  
  public static getInstance(): TelegramEventManager {
    if (!TelegramEventManager.instance) {
      TelegramEventManager.instance = new TelegramEventManager();
    }
    return TelegramEventManager.instance;
  }
  
  private setupListeners() {
    this.sessionManager.on('update', async ({ clientId, update }) => {
      try {
        // Обработка различных типов обновлений
        if (update.className === 'UpdateNewMessage') {
          const eventData: EventData = {
            type: EventType.NEW_MESSAGE,
            clientId,
            data: update.message
          };
          
          this.emit(EventType.NEW_MESSAGE, eventData);
          await this.processEvent(eventData);
          
          // Логируем новое сообщение
          storage.createLog({
            clientId,
            level: "debug",
            source: "EventManager",
            message: `Получено новое сообщение от ${update.message.senderId || 'неизвестного отправителя'}`
          });
        }
        else if (update.className === 'UpdateEditMessage') {
          const eventData: EventData = {
            type: EventType.EDITED_MESSAGE,
            clientId,
            data: update.message
          };
          
          this.emit(EventType.EDITED_MESSAGE, eventData);
          await this.processEvent(eventData);
        }
        else if (update.className === 'UpdateDeleteMessages') {
          const eventData: EventData = {
            type: EventType.DELETED_MESSAGES,
            clientId,
            data: update.messages
          };
          
          this.emit(EventType.DELETED_MESSAGES, eventData);
          await this.processEvent(eventData);
        }
        else if (update.className === 'UpdateUserStatus') {
          const eventData: EventData = {
            type: EventType.USER_STATUS,
            clientId,
            data: {
              userId: update.userId,
              status: update.status
            }
          };
          
          this.emit(EventType.USER_STATUS, eventData);
          await this.processEvent(eventData);
        }
        // Добавьте другие типы обновлений по мере необходимости
      } catch (error) {
        storage.createLog({
          clientId,
          level: "error",
          source: "EventManager",
          message: `Ошибка при обработке события: ${(error as Error).message}`
        });
      }
    });
  }
  
  // Добавление нового обработчика событий
  public registerHandler(handler: EventHandler): void {
    this.handlers.push(handler);
    
    // Сортируем обработчики по приоритету (если указан)
    this.handlers.sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      return priorityB - priorityA; // Высший приоритет выполняется первым
    });
    
    storage.createLog({
      clientId: 0, // Системный лог
      level: "debug",
      source: "EventManager",
      message: `Зарегистрирован обработчик для события ${handler.type}`
    });
  }
  
  // Удаление обработчика событий
  public unregisterHandler(type: string, handler: Function): void {
    this.handlers = this.handlers.filter(h => 
      !(h.type === type && h.handler === handler)
    );
    
    storage.createLog({
      clientId: 0, // Системный лог
      level: "debug",
      source: "EventManager",
      message: `Удален обработчик для события ${type}`
    });
  }
  
  // Обработка события
  private async processEvent(eventData: EventData): Promise<void> {
    // Выбираем все обработчики для данного типа событий
    const relevantHandlers = this.handlers.filter(
      h => h.type === eventData.type || h.type === '*' // '*' для обработчиков всех событий
    );
    
    if (relevantHandlers.length === 0) return;
    
    // Запускаем все обработчики последовательно
    for (const handler of relevantHandlers) {
      try {
        await handler.handler(eventData.data, eventData.clientId);
      } catch (error) {
        storage.createLog({
          clientId: eventData.clientId,
          level: "error",
          source: "EventManager",
          message: `Ошибка в обработчике события ${eventData.type}: ${(error as Error).message}`
        });
      }
    }
  }
  
  // Отправка события вручную (для тестирования или специальных случаев)
  public async sendEvent(eventData: EventData): Promise<void> {
    this.emit(eventData.type, eventData);
    await this.processEvent(eventData);
  }
}
