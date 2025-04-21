import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocket, type WebSocketMessage } from '@/hooks/use-websocket';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RotateCw, Trash } from 'lucide-react';
import { format } from 'date-fns';

type LogMessage = {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
  clientId?: number;
};

export default function LiveLogsTab() {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const { lastMessage, isConnected } = useWebSocket();
  const logIdCounter = useRef(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Преобразование сообщения WebSocket в формат лога
  const processWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'log') {
      return {
        id: ++logIdCounter.current,
        timestamp: format(new Date(), 'HH:mm:ss'),
        level: message.level || 'info',
        source: message.source || 'unknown',
        message: message.message || 'Нет сообщения',
        clientId: message.clientId
      } as LogMessage;
    }
    
    if (message.type === 'event' && message.data) {
      // Преобразование события Telegram в лог
      const eventData = message.data;
      return {
        id: ++logIdCounter.current,
        timestamp: format(new Date(), 'HH:mm:ss'),
        level: 'info',
        source: `Telegram.${eventData.type || 'Event'}`,
        message: `Событие Telegram: ${eventData.type || 'Unknown'} от клиента #${eventData.clientId || '?'}`,
        clientId: eventData.clientId
      } as LogMessage;
    }

    // Общее сообщение
    return {
      id: ++logIdCounter.current,
      timestamp: format(new Date(), 'HH:mm:ss'),
      level: 'info',
      source: message.type || 'websocket',
      message: message.message || JSON.stringify(message),
    } as LogMessage;
  }, []);

  // Обработка входящих сообщений
  useEffect(() => {
    if (lastMessage) {
      const logMessage = processWebSocketMessage(lastMessage);
      setLogs(prev => [...prev.slice(-499), logMessage]); // Держим не больше 500 строк
    }
  }, [lastMessage, processWebSocketMessage]);

  // Прокрутка до последнего сообщения
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs]);

  // Цвет бейджа в зависимости от уровня лога
  const getBadgeVariant = (level: string) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warning': return 'outline'; // Изменено с 'warning' на 'outline'
      case 'info': return 'default';
      case 'debug': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Живые логи</h2>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearLogs}
          >
            <Trash className="h-4 w-4 mr-2" />
            Очистить
          </Button>
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Подключено' : 'Отключено'}
          </Badge>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-240px)]" ref={scrollAreaRef}>
          <div className="p-4 space-y-2">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <RotateCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                <p>Ожидание логов...</p>
                <p className="text-sm mt-2">
                  {isConnected 
                    ? 'Подключено к серверу. Логи появятся здесь.' 
                    : 'Нет подключения к серверу событий.'}
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-start py-1 border-b border-gray-100 last:border-0"
                >
                  <div className="text-gray-500 text-sm mr-3 whitespace-nowrap">
                    {log.timestamp}
                  </div>
                  <Badge 
                    variant={getBadgeVariant(log.level)}
                    className="mr-3 whitespace-nowrap"
                  >
                    {log.level.toUpperCase()}
                  </Badge>
                  <div className="text-gray-600 font-medium mr-3 whitespace-nowrap">
                    {log.source}
                  </div>
                  {log.clientId && (
                    <Badge 
                      variant="outline"
                      className="mr-3 whitespace-nowrap"
                    >
                      Client #{log.clientId}
                    </Badge>
                  )}
                  <div className="flex-1 text-sm">
                    {log.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}