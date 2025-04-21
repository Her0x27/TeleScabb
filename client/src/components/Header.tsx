import { useAppSidebar } from "@/context/SidebarContext";
import { TabId } from "@/types";

interface HeaderProps {
  activeTab: TabId;
}

export default function Header({ activeTab }: HeaderProps) {
  const { toggleSidebar } = useAppSidebar();
  
  // Названия вкладок
  const tabNames: Record<TabId, string> = {
    'overview': 'Панель управления',
    'accounts': 'Аккаунты',
    'plugins': 'Плагины',
    'settings': 'Настройки',
    'logs': 'Логи'
  };
  
  return (
    <header className="bg-white shadow-sm z-20">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={toggleSidebar}
            className="lg:hidden mr-4 text-neutral-600 focus:outline-none"
          >
            <span className="material-icons">menu</span>
          </button>
          <h2 className="text-lg font-medium">{tabNames[activeTab]}</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button className="p-2 text-neutral-600 hover:text-neutral-900 focus:outline-none relative">
              <span className="material-icons">notifications</span>
              <span className="absolute top-1 right-1 w-4 h-4 bg-danger rounded-full text-white text-xs flex items-center justify-center">3</span>
            </button>
          </div>
          
          <div className="relative">
            <button className="flex items-center text-neutral-600 hover:text-neutral-900 focus:outline-none">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white mr-2">
                <span className="text-xs font-medium">A</span>
              </div>
              <span>Админ</span>
              <span className="material-icons ml-1">arrow_drop_down</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
