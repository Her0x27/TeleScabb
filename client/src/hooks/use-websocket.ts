import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [messageHistory, setMessageHistory] = useState<WebSocketMessage[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // Подключение к WebSocket серверу
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);

    try {
      // Определяем правильный протокол и адрес
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      // Создаем новое подключение
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      // Обработчик успешного подключения
      socket.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        toast({
          title: 'Соединение установлено',
          description: 'Подключение к серверу событий Telegram успешно установлено',
        });
      };

      // Обработчик сообщений
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          setLastMessage(data);
          setMessageHistory((prev) => [...prev, data]);

          // Отображаем уведомление в зависимости от типа сообщения
          if (data.type === 'event' && data.data?.type === 'newMessage') {
            toast({
              title: 'Новое сообщение',
              description: `От: ${data.data.data?.sender?.firstName || 'Неизвестный'}\nТекст: ${data.data.data?.message?.substring(0, 50) || 'Медиа'}`,
            });
          }
        } catch (error) {
          console.error('Ошибка при обработке сообщения WebSocket:', error);
        }
      };

      // Обработчик закрытия соединения
      socket.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        toast({
          title: 'Соединение разорвано',
          description: 'Подключение к серверу событий Telegram было закрыто',
          variant: 'destructive',
        });

        // Пытаемся переподключиться через 5 секунд
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            connect();
          }
        }, 5000);
      };

      // Обработчик ошибок
      socket.onerror = (error) => {
        console.error('Ошибка WebSocket:', error);
        setIsConnecting(false);
        toast({
          title: 'Ошибка соединения',
          description: 'Не удалось установить соединение с сервером',
          variant: 'destructive',
        });
      };
    } catch (error) {
      console.error('Ошибка при создании WebSocket:', error);
      setIsConnecting(false);
      toast({
        title: 'Ошибка соединения',
        description: 'Не удалось установить соединение с сервером',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Отключение от WebSocket сервера
  const disconnect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }
  }, []);

  // Отправка сообщения на сервер
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    
    toast({
      title: 'Ошибка отправки',
      description: 'Нет активного соединения с сервером',
      variant: 'destructive',
    });
    
    return false;
  }, [toast]);

  // Автоматическое подключение при монтировании компонента
  useEffect(() => {
    connect();

    // Переподключение при возвращении пользователя на страницу
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 
          (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Очистка при размонтировании
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    lastMessage,
    messageHistory,
    connect,
    disconnect,
    sendMessage,
  };
}