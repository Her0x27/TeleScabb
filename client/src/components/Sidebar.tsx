import { useAppSidebar } from "@/context/SidebarContext";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { TabId, TelegramClient } from "@/types";

export default function Sidebar({ activeTab, setActiveTab }: { activeTab: TabId, setActiveTab: (tab: TabId) => void }) {
  const { isSidebarOpen } = useAppSidebar();
  const [location] = useLocation();
  
  // Запрос на получение списка клиентов
  const { data: clients = [] } = useQuery<TelegramClient[]>({
    queryKey: ['/api/clients'],
    staleTime: 30000, // Обновляем каждые 30 секунд
  });
  
  return (
    <aside 
      className={`bg-neutral-800 text-white w-64 fixed h-full lg:static transform transition-transform duration-300 lg:translate-x-0 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      } z-30`}
    >
      <div className="p-4 border-b border-neutral-700 flex items-center">
        <span className="material-icons text-primary mr-2">account_circle</span>
        <h1 className="text-xl font-medium">Telegram UserBot</h1>
      </div>
      
      <div className="overflow-y-auto h-full pb-20">
        <nav className="mt-4">
          <div className="px-4 py-2 text-neutral-400 text-xs uppercase font-medium">Навигация</div>
          
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center px-4 py-3 w-full text-left ${
              activeTab === 'overview' 
                ? "text-white bg-primary-dark" 
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <span className="material-icons mr-3">dashboard</span>
            <span>Панель управления</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center px-4 py-3 w-full text-left ${
              activeTab === 'accounts' 
                ? "text-white bg-primary-dark" 
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <span className="material-icons mr-3">account_circle</span>
            <span>Аккаунты</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('plugins')}
            className={`flex items-center px-4 py-3 w-full text-left ${
              activeTab === 'plugins' 
                ? "text-white bg-primary-dark" 
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <span className="material-icons mr-3">extension</span>
            <span>Плагины</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center px-4 py-3 w-full text-left ${
              activeTab === 'settings' 
                ? "text-white bg-primary-dark" 
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <span className="material-icons mr-3">settings</span>
            <span>Настройки</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex items-center px-4 py-3 w-full text-left ${
              activeTab === 'logs' 
                ? "text-white bg-primary-dark" 
                : "text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            <span className="material-icons mr-3">history</span>
            <span>Логи</span>
          </button>
          
          <div className="px-4 py-2 mt-4 text-neutral-400 text-xs uppercase font-medium">Активные аккаунты</div>
          
          {clients && clients.length > 0 ? (
            clients
              .filter((client: any) => client.isActive)
              .map((client: any) => (
                <div key={client.id} className="px-4 py-3 flex items-center text-neutral-300">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
                    <span className="text-xs font-medium">
                      {client.phoneNumber.substring(0, 2)}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{client.phoneNumber}</div>
                    <div className="text-xs text-neutral-400">
                      {client.status === 'connected' ? 'Онлайн' : 
                       client.status === 'sleeping' ? 'Спящий режим' : 'Отключен'}
                    </div>
                  </div>
                  <span className={`ml-auto w-2 h-2 rounded-full ${
                    client.status === 'connected' ? 'bg-success' : 
                    client.status === 'sleeping' ? 'bg-warning' : 'bg-danger'
                  }`}></span>
                </div>
              ))
          ) : (
            <div className="px-4 py-3 text-neutral-500 text-sm">
              Нет активных аккаунтов
            </div>
          )}
          
          <div className="px-4 py-2 mt-4 text-neutral-400 text-xs uppercase font-medium">Операции</div>
          
          <button 
            onClick={() => setActiveTab('accounts')}
            className="flex items-center px-4 py-3 w-full text-left text-neutral-300 hover:bg-neutral-700"
          >
            <span className="material-icons mr-3">add_circle</span>
            <span>Добавить аккаунт</span>
          </button>
          
          <button 
            onClick={() => document.getElementById("helpModal")?.classList.remove("hidden")}
            className="flex items-center px-4 py-3 w-full text-left text-neutral-300 hover:bg-neutral-700"
          >
            <span className="material-icons mr-3">help</span>
            <span>Справка</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}
