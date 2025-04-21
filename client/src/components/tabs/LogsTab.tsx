import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Log } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function LogsTab() {
  const [logFilter, setLogFilter] = useState({
    level: "all",
    date: "",
    clientId: "",
    limit: 100,
    offset: 0
  });
  
  // Запрос на получение логов
  const { data: logs, isLoading, refetch } = useQuery<Log[]>({
    queryKey: [
      '/api/logs', 
      logFilter.level !== "all" ? logFilter.level : undefined,
      logFilter.clientId ? parseInt(logFilter.clientId) : undefined,
      logFilter.limit,
      logFilter.offset
    ],
    queryFn: async ({ queryKey }) => {
      let url = '/api/logs?';
      
      const [_, level, clientId, limit, offset] = queryKey;
      
      if (level) url += `level=${level}&`;
      if (clientId) url += `clientId=${clientId}&`;
      if (limit) url += `limit=${limit}&`;
      if (offset) url += `offset=${offset}&`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Ошибка при получении логов');
      }
      return response.json();
    }
  });
  
  // Обработчик изменения фильтра
  const handleFilterChange = (key: string, value: string | number) => {
    setLogFilter({
      ...logFilter,
      [key]: value
    });
  };
  
  // Обработчик сброса фильтров
  const handleResetFilters = () => {
    setLogFilter({
      level: "all",
      date: "",
      clientId: "",
      limit: 100,
      offset: 0
    });
  };
  
  // Форматирование даты для отображения
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  };
  
  // Получение класса стиля в зависимости от уровня лога
  const getLevelClass = (level: string) => {
    switch (level.toLowerCase()) {
      case 'info':
        return 'bg-success bg-opacity-20 text-success';
      case 'warning':
        return 'bg-warning bg-opacity-20 text-warning';
      case 'error':
        return 'bg-danger bg-opacity-20 text-danger';
      case 'debug':
        return 'bg-info bg-opacity-20 text-info';
      default:
        return 'bg-neutral-200 text-neutral-700';
    }
  };
  
  // Обработчик пагинации
  const handlePagination = (direction: 'prev' | 'next') => {
    const newOffset = direction === 'prev' 
      ? Math.max(0, logFilter.offset - logFilter.limit)
      : logFilter.offset + logFilter.limit;
    
    setLogFilter({
      ...logFilter,
      offset: newOffset
    });
  };
  
  // Обработчик выбора страницы
  const handlePageSelect = (page: number) => {
    setLogFilter({
      ...logFilter,
      offset: (page - 1) * logFilter.limit
    });
  };
  
  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
          <h3 className="text-lg font-medium">Логи системы</h3>
          
          <div className="flex flex-wrap gap-2">
            <Select 
              value={logFilter.level} 
              onValueChange={(value) => handleFilterChange('level', value)}
            >
              <SelectTrigger className="h-8 w-28 sm:w-32">
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="info">Информация</SelectItem>
                <SelectItem value="warning">Предупреждения</SelectItem>
                <SelectItem value="error">Ошибки</SelectItem>
                <SelectItem value="debug">Отладка</SelectItem>
              </SelectContent>
            </Select>
            
            <Input 
              type="date" 
              className="h-8 w-auto" 
              value={logFilter.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
            />
            
            <Input 
              type="text" 
              placeholder="ID клиента" 
              className="h-8 w-24 sm:w-32" 
              value={logFilter.clientId}
              onChange={(e) => handleFilterChange('clientId', e.target.value)}
            />
            
            <Button 
              variant="outline"
              size="sm" 
              className="h-8" 
              onClick={() => refetch()}
            >
              <span className="material-icons text-sm">refresh</span>
            </Button>
            
            <Button 
              variant="outline"
              size="sm" 
              className="h-8" 
              onClick={handleResetFilters}
            >
              <span className="material-icons text-sm">clear</span>
            </Button>
            
            <Button 
              variant="outline"
              size="sm" 
              className="h-8"
              onClick={() => {
                alert('Функция скачивания логов в разработке');
              }}
            >
              <span className="material-icons text-sm">file_download</span>
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center p-8">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent text-primary rounded-full mb-2"></div>
            <p>Загрузка логов...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-neutral-100">
                  <th className="p-2">Время</th>
                  <th className="p-2">Тип</th>
                  <th className="p-2">Источник</th>
                  <th className="p-2">Сообщение</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {logs && logs.length > 0 ? (
                  logs.map(log => (
                    <tr key={log.id}>
                      <td className="p-2 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                      <td className="p-2 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getLevelClass(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2 whitespace-nowrap">{log.source}</td>
                      <td className="p-2">{log.message}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-neutral-500">
                      Нет логов, соответствующих выбранным фильтрам
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-neutral-500">
            {logs && logs.length > 0 ? (
              `Показано ${logs.length} из ${logFilter.offset + logs.length} записей`
            ) : (
              'Нет записей'
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              disabled={logFilter.offset === 0}
              onClick={() => handlePagination('prev')}
            >
              Предыдущая
            </Button>
            
            <Button 
              variant={logFilter.offset === 0 ? 'default' : 'outline'}
              onClick={() => handlePageSelect(1)}
            >
              1
            </Button>
            
            {logFilter.offset >= logFilter.limit && (
              <Button 
                variant="outline"
                onClick={() => handlePageSelect(2)}
              >
                2
              </Button>
            )}
            
            {logFilter.offset >= logFilter.limit * 2 && (
              <Button 
                variant="outline"
                onClick={() => handlePageSelect(3)}
              >
                3
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => handlePagination('next')}
              disabled={logs && logs.length < logFilter.limit}
            >
              Следующая
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
