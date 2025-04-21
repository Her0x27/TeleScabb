import { useWebSocket } from '@/hooks/use-websocket';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function WebSocketStatus() {
  const { isConnected, isConnecting, connect, disconnect } = useWebSocket();

  const handleToggleConnection = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleConnection}
            className={`w-9 h-9 rounded-full ${isConnected ? 'text-green-500' : 'text-red-500'}`}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isConnected ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isConnecting
              ? 'Подключение к серверу событий...'
              : isConnected
              ? 'Подключено к серверу событий'
              : 'Нет подключения к серверу событий. Нажмите для подключения.'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}