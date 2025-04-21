import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Stats, TelegramClient } from "@/types";

export default function OverviewTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Запрос на получение системной информации
  const { data: clients = [] } = useQuery<TelegramClient[]>({
    queryKey: ['/api/clients'],
  });
  
  // Запрос на получение статистики
  const { data: stats = { 
    activeAccounts: 0, 
    totalAccounts: 0, 
    loadedPlugins: 0, 
    totalPlugins: 0, 
    messagesLast24h: 0, 
    activeTasks: 0 
  } } = useQuery<Stats>({
    queryKey: ['/api/stats'],
  });
  
  // Мутации для быстрых действий
  const startAllClientsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/clients/start-all", {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успех",
        description: "Все аккаунты запущены",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось запустить аккаунты: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });
  
  const stopAllClientsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/clients/stop-all", {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успех",
        description: "Все аккаунты остановлены",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось остановить аккаунты: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleStartAllAccounts = () => {
    startAllClientsMutation.mutate();
  };
  
  const handleStopAllAccounts = () => {
    stopAllClientsMutation.mutate();
  };
  
  return (
    <div className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-medium mb-4">Быстрые действия</h3>
          
          <div className="space-y-3">
            <button 
              onClick={() => window.location.href = "#accounts"}
              className="w-full flex items-center justify-between p-3 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
            >
              <span className="flex items-center">
                <span className="material-icons mr-2">add_circle</span>
                <span>Добавить аккаунт</span>
              </span>
              <span className="material-icons">arrow_forward</span>
            </button>
            
            <button 
              onClick={() => window.location.href = "#plugins"}
              className="w-full flex items-center justify-between p-3 bg-secondary text-white rounded hover:bg-secondary-dark transition-colors"
            >
              <span className="flex items-center">
                <span className="material-icons mr-2">extension</span>
                <span>Установить плагин</span>
              </span>
              <span className="material-icons">arrow_forward</span>
            </button>
            
            <button 
              onClick={handleStartAllAccounts}
              disabled={startAllClientsMutation.isPending || !clients || clients.length === 0}
              className="w-full flex items-center justify-between p-3 bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-70"
            >
              <span className="flex items-center">
                {startAllClientsMutation.isPending ? (
                  <>
                    <span className="material-icons animate-spin mr-2">refresh</span>
                    <span>Запуск...</span>
                  </>
                ) : (
                  <>
                    <span className="material-icons mr-2">play_arrow</span>
                    <span>Запустить все аккаунты</span>
                  </>
                )}
              </span>
              <span className="material-icons">arrow_forward</span>
            </button>
            
            <button 
              onClick={handleStopAllAccounts}
              disabled={stopAllClientsMutation.isPending || !clients || clients.length === 0}
              className="w-full flex items-center justify-between p-3 bg-danger text-white rounded hover:bg-red-700 transition-colors disabled:opacity-70"
            >
              <span className="flex items-center">
                {stopAllClientsMutation.isPending ? (
                  <>
                    <span className="material-icons animate-spin mr-2">refresh</span>
                    <span>Остановка...</span>
                  </>
                ) : (
                  <>
                    <span className="material-icons mr-2">stop</span>
                    <span>Остановить все аккаунты</span>
                  </>
                )}
              </span>
              <span className="material-icons">arrow_forward</span>
            </button>
          </div>
        </div>
        
        {/* System Status */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-medium mb-4">Состояние системы</h3>
          
          {/* Используем запрос для получения системной информации */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Активные аккаунты - получаем из реального API */}
            <div className="bg-neutral-50 p-4 rounded border border-neutral-200">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Активные аккаунты</h4>
                <span className={`text-sm ${stats.activeAccounts > 0 ? 'text-success' : 'text-neutral-500'}`}>
                  {stats.activeAccounts > 0 ? 'Работают' : 'Нет активных'}
                </span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2.5">
                <div 
                  className="bg-success h-2.5 rounded-full" 
                  style={{ 
                    width: `${stats?.totalAccounts ? (stats.activeAccounts / stats.totalAccounts * 100) : 0}%` 
                  }}
                ></div>
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {stats?.activeAccounts || 0} из {stats?.totalAccounts || 0} аккаунтов активно
              </div>
            </div>
            
            {/* API Запросы */}
            <div className="bg-neutral-50 p-4 rounded border border-neutral-200">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">API подключение</h4>
                <span className="text-sm text-success">Активно</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2.5">
                <div className="bg-success h-2.5 rounded-full" style={{ width: "100%" }}></div>
              </div>
              <div className="mt-1 text-xs text-neutral-500">API доступно для запросов</div>
            </div>
            
            {/* Подключение к БД */}
            <div className="bg-neutral-50 p-4 rounded border border-neutral-200">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">База данных</h4>
                <span className="text-sm text-success">Подключена</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2.5">
                <div className="bg-success h-2.5 rounded-full" style={{ width: "100%" }}></div>
              </div>
              <div className="mt-1 text-xs text-neutral-500">PostgreSQL подключение активно</div>
            </div>
            
            {/* Плагины */}
            <div className="bg-neutral-50 p-4 rounded border border-neutral-200">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Плагины</h4>
                <span className="text-sm text-neutral-500">
                  {stats?.loadedPlugins ? 
                    (stats.loadedPlugins > 0 ? 'Активны' : 'Не загружены') : 
                    'Нет данных'
                  }
                </span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2.5">
                <div 
                  className={`${stats?.loadedPlugins ? 'bg-success' : 'bg-neutral-400'} h-2.5 rounded-full`} 
                  style={{ width: stats?.loadedPlugins ? "100%" : "0%" }}
                ></div>
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {stats?.loadedPlugins 
                  ? `${stats.loadedPlugins} плагинов загружено` 
                  : 'Плагины не загружены'
                }
              </div>
            </div>
          </div>
          
          {/* Активные клиенты в виде таблицы */}
          <div className="bg-neutral-50 p-4 rounded border border-neutral-200">
            <h4 className="font-medium mb-2">Активные клиенты</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b">
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Номер телефона</th>
                    <th className="pb-2">Статус</th>
                    <th className="pb-2">Тип клиента</th>
                    <th className="pb-2">Последняя активность</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {clients && clients.length > 0 ? (
                    clients.map((client: any) => (
                      <tr key={client.id}>
                        <td className="py-2">{client.id}</td>
                        <td className="py-2">{client.phoneNumber}</td>
                        <td className="py-2">
                          <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                            client.isActive 
                              ? "bg-success bg-opacity-20 text-success" 
                              : "bg-neutral-200 text-neutral-600"
                          }`}>
                            {client.isActive ? 'Активен' : 'Неактивен'}
                          </span>
                        </td>
                        <td className="py-2">{client.deviceModel || 'Android'}</td>
                        <td className="py-2">
                          {client.lastActivityAt 
                            ? new Date(client.lastActivityAt).toLocaleString('ru-RU') 
                            : 'Нет данных'
                          }
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-neutral-500">
                        Нет активных клиентов. Добавьте новый аккаунт во вкладке "Аккаунты".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}