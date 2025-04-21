import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Таблица пользователей
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Таблица клиентов Telegram
export const telegramClients = pgTable("telegram_clients", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  apiId: integer("api_id").notNull(),
  apiHash: text("api_hash").notNull(),
  deviceModel: text("device_model").default("Desktop"),
  systemVersion: text("system_version").default("Windows 10"),
  appVersion: text("app_version").default("1.0.0"),
  langCode: text("lang_code").default("ru"),
  systemLangCode: text("system_lang_code").default("ru"),
  sessionData: text("session_data"),
  isActive: boolean("is_active").default(false),
  status: text("status").default("disconnected"),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  settings: jsonb("settings").default({
    timeout: 10,
    requestRetries: 5,
    connectionRetries: 5,
    retryDelay: 1000,
    autoReconnect: true,
    sequentialUpdates: true,
    floodSleepThreshold: 60
  })
});

export const insertTelegramClientSchema = createInsertSchema(telegramClients)
  .omit({ id: true, sessionData: true, createdAt: true, updatedAt: true });

export type InsertTelegramClient = z.infer<typeof insertTelegramClientSchema>;
export type TelegramClient = typeof telegramClients.$inferSelect;

// Таблица плагинов
export const plugins = pgTable("plugins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  version: text("version").notNull(),
  author: text("author"),
  isActive: boolean("is_active").default(true),
  isSystem: boolean("is_system").default(false),
  code: text("code").notNull(),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPluginSchema = createInsertSchema(plugins)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type InsertPlugin = z.infer<typeof insertPluginSchema>;
export type Plugin = typeof plugins.$inferSelect;

// Таблица логов
export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => telegramClients.id), // Опциональная ссылка на клиента (для системных логов)
  level: text("level").notNull(), // info, warning, error, debug
  source: text("source").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow()
});

export const insertLogSchema = createInsertSchema(logs)
  .omit({ id: true, timestamp: true })
  .partial({ clientId: true });

export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logs.$inferSelect;

// Схемы для валидации запросов API
export const authCodeSchema = z.object({
  phoneNumber: z.string(),
  code: z.string()
});

export type AuthCodeRequest = z.infer<typeof authCodeSchema>;

export const clientSettingsSchema = z.object({
  timeout: z.number().optional(),
  requestRetries: z.number().optional(),
  connectionRetries: z.number().optional(),
  retryDelay: z.number().optional(),
  autoReconnect: z.boolean().optional(),
  sequentialUpdates: z.boolean().optional(),
  floodSleepThreshold: z.number().optional(),
  deviceModel: z.string().optional(),
  systemVersion: z.string().optional(),
  appVersion: z.string().optional(),
  langCode: z.string().optional(),
  systemLangCode: z.string().optional()
});

export type ClientSettings = z.infer<typeof clientSettingsSchema>;

export const apiClients = [
  {
    name: "Telegram для Android",
    apiId: 4,
    apiHash: "014b35b6184100b085b0d0572f9b5103"
  },
  {
    name: "Telegram для iOS",
    apiId: 3,
    apiHash: "3e0cb5efcd52300aec5994fdfc5bdc16"
  },
  {
    name: "Telegram Desktop",
    apiId: 2040,
    apiHash: "b18441a1ff607e10a989891a5462e627"
  },
  {
    name: "Telegram macOS",
    apiId: 2834,
    apiHash: "4b1488f110c6e15d8db8f8f7a58cddd7"
  },
  {
    name: "Telegram Web-K",
    apiId: 2496,
    apiHash: "8da85b0d5bfe62527e5b244c209159c3"
  },
  {
    name: "Telegram Web-Z",
    apiId: 7893,
    apiHash: "20a8f98d5edab2727394b99aae829d1a"
  }
];
