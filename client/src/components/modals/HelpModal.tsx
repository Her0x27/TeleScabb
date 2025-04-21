import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // Обработчик нажатия клавиши Escape
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);
  
  if (!mounted) return null;
  
  if (!isOpen) return null;
  
  return (
    <div id="helpModal" className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium">Справка по Telegram UserBot</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-700 focus:outline-none">
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            <div>
              <h4 className="text-base font-medium mb-2">Введение</h4>
              <p className="text-sm text-neutral-600">
                Telegram UserBot - это многофункциональное приложение для автоматизации работы с Telegram аккаунтами, использующее официальный API Telegram (не Bot API). 
                Оно позволяет управлять несколькими аккаунтами, настраивать автоматические ответы, выполнять команды и многое другое.
              </p>
            </div>
            
            <div>
              <h4 className="text-base font-medium mb-2">Основные возможности</h4>
              <ul className="list-disc pl-5 text-sm text-neutral-600 space-y-1">
                <li>Управление несколькими Telegram аккаунтами</li>
                <li>Модульная система плагинов</li>
                <li>Асинхронное выполнение задач</li>
                <li>Система команд с настраиваемым префиксом</li>
                <li>Обработка различных типов событий Telegram</li>
                <li>REST API для интеграции с другими сервисами</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-base font-medium mb-2">Начало работы</h4>
              <ol className="list-decimal pl-5 text-sm text-neutral-600 space-y-1">
                <li>Добавьте Telegram аккаунт на вкладке "Аккаунты"</li>
                <li>Подтвердите авторизацию через код, полученный в Telegram</li>
                <li>Установите необходимые плагины на вкладке "Плагины"</li>
                <li>Настройте параметры работы бота на вкладке "Настройки"</li>
                <li>Готово! Ваш UserBot запущен и работает</li>
              </ol>
            </div>
            
            <div>
              <h4 className="text-base font-medium mb-2">Разработка плагинов</h4>
              <p className="text-sm text-neutral-600">
                Вы можете разрабатывать собственные плагины, используя TypeScript и следуя нашей документации. Плагин должен экспортировать класс, реализующий интерфейс Plugin, и метаданные.
              </p>
              <pre className="bg-neutral-100 p-2 rounded text-xs overflow-x-auto mt-2">
{`import { Plugin, PluginContext } from '@telegram-userbot/core';

export default class MyPlugin implements Plugin {
  name = 'my-plugin';
  version = '1.0.0';
  
  onLoad(ctx: PluginContext): void {
    // Инициализация плагина
  }
  
  onUnload(): void {
    // Очистка ресурсов
  }
}

export const metadata = {
  name: 'My Plugin',
  description: 'Описание моего плагина',
  author: 'Ваше имя',
};`}
              </pre>
            </div>
            
            <div>
              <h4 className="text-base font-medium mb-2">Часто задаваемые вопросы</h4>
              <div className="space-y-2">
                <div>
                  <div className="font-medium text-sm">Безопасно ли использовать UserBot?</div>
                  <p className="text-sm text-neutral-600">
                    Да, UserBot использует официальный API Telegram и соблюдает все правила и ограничения. Однако, использование бота для спама, рассылки нежелательных сообщений и других нарушений правил Telegram может привести к блокировке аккаунта.
                  </p>
                </div>
                
                <div>
                  <div className="font-medium text-sm">Нужен ли мне API ключ?</div>
                  <p className="text-sm text-neutral-600">
                    Наше приложение уже содержит официальные API ID и Hash для разных клиентов Telegram. Вы можете также использовать свои собственные API ключи, если получили их через https://my.telegram.org.
                  </p>
                </div>
                
                <div>
                  <div className="font-medium text-sm">Как установить собственный плагин?</div>
                  <p className="text-sm text-neutral-600">
                    Загрузите файл плагина через интерфейс "Плагины" в разделе "Создать плагин".
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t flex justify-end">
          <Button onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}
