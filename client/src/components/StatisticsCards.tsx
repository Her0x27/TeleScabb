import { useQuery } from "@tanstack/react-query";
import { Stats } from "@/types";

export default function StatisticsCards() {
  // Запрос на получение статистики
  const { data: stats, isLoading, error } = useQuery<Stats>({
    queryKey: ['/api/stats'],
    refetchInterval: 60000, // Обновляем каждую минуту
  });
  
  // Запрос на получение клиентов для подсчета активных/неактивных
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    refetchInterval: 60000,
  });
  
  // Запрос на получение плагинов
  const { data: plugins } = useQuery({
    queryKey: ['/api/plugins'],
    refetchInterval: 60000,
  });
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-4">
            <div className="animate-pulse flex items-center">
              <div className="w-12 h-12 bg-neutral-200 rounded-full flex items-center justify-center mr-4"></div>
              <div className="flex-1">
                <div className="h-2 bg-neutral-200 rounded w-24 mb-3"></div>
                <div className="h-5 bg-neutral-200 rounded w-10"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
        Ошибка при загрузке статистики: {(error as Error).message}
      </div>
    );
  }
  
  // Количество активных аккаунтов
  const activeAccounts = stats?.activeAccounts || 0;
  
  // Количество загруженных плагинов
  const loadedPlugins = stats?.loadedPlugins || 0;
  
  // Получаем реальное количество сообщений
  const messagesCount = stats?.messagesLast24h || 0;
  
  // Получаем реальное количество активных задач
  const activeTasks = stats?.activeTasks || 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-primary-light bg-opacity-20 rounded-full flex items-center justify-center mr-4">
            <span className="material-icons text-primary">people</span>
          </div>
          <div>
            <h3 className="text-neutral-500 text-sm">Активные аккаунты</h3>
            <div className="text-2xl font-medium">{activeAccounts}</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-secondary-light bg-opacity-20 rounded-full flex items-center justify-center mr-4">
            <span className="material-icons text-secondary">extension</span>
          </div>
          <div>
            <h3 className="text-neutral-500 text-sm">Загруженные плагины</h3>
            <div className="text-2xl font-medium">{loadedPlugins}</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-success bg-opacity-20 rounded-full flex items-center justify-center mr-4">
            <span className="material-icons text-success">chat</span>
          </div>
          <div>
            <h3 className="text-neutral-500 text-sm">Сообщения (24ч)</h3>
            <div className="text-2xl font-medium">{messagesCount}</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-warning bg-opacity-20 rounded-full flex items-center justify-center mr-4">
            <span className="material-icons text-warning">memory</span>
          </div>
          <div>
            <h3 className="text-neutral-500 text-sm">Активные задачи</h3>
            <div className="text-2xl font-medium">{activeTasks}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
