import { useState } from "react";
import { TabId } from "@/types";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import StatisticsCards from "@/components/StatisticsCards";
import OverviewTab from "@/components/tabs/OverviewTab";
import AccountsTab from "@/components/tabs/AccountsTab";
import PluginsTab from "@/components/tabs/PluginsTab";
import SettingsTab from "@/components/tabs/SettingsTab";
import LogsTab from "@/components/tabs/LogsTab";
import HelpModal from "@/components/modals/HelpModal";
import { SidebarProvider } from "@/context/SidebarContext";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header activeTab={activeTab} />
          
          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto bg-neutral-100 p-4">
            <div className="container mx-auto">
              {/* Statistics Cards */}
              <StatisticsCards />
              
              {/* Tabs Container */}
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="border-b border-neutral-200">
                  <div className="flex overflow-x-auto">
                    <button 
                      onClick={() => setActiveTab("overview")}
                      className={`px-4 py-3 font-medium ${
                        activeTab === "overview" 
                          ? "bg-primary-light text-white" 
                          : "text-neutral-600 hover:bg-neutral-100"
                      } focus:outline-none`}
                    >
                      Обзор
                    </button>
                    <button 
                      onClick={() => setActiveTab("accounts")}
                      className={`px-4 py-3 font-medium ${
                        activeTab === "accounts" 
                          ? "bg-primary-light text-white" 
                          : "text-neutral-600 hover:bg-neutral-100"
                      } focus:outline-none`}
                    >
                      Аккаунты
                    </button>
                    <button 
                      onClick={() => setActiveTab("plugins")}
                      className={`px-4 py-3 font-medium ${
                        activeTab === "plugins" 
                          ? "bg-primary-light text-white" 
                          : "text-neutral-600 hover:bg-neutral-100"
                      } focus:outline-none`}
                    >
                      Плагины
                    </button>
                    <button 
                      onClick={() => setActiveTab("settings")}
                      className={`px-4 py-3 font-medium ${
                        activeTab === "settings" 
                          ? "bg-primary-light text-white" 
                          : "text-neutral-600 hover:bg-neutral-100"
                      } focus:outline-none`}
                    >
                      Настройки
                    </button>
                    <button 
                      onClick={() => setActiveTab("logs")}
                      className={`px-4 py-3 font-medium ${
                        activeTab === "logs" 
                          ? "bg-primary-light text-white" 
                          : "text-neutral-600 hover:bg-neutral-100"
                      } focus:outline-none`}
                    >
                      Логи
                    </button>
                  </div>
                </div>
                
                {/* Tab Content */}
                {activeTab === "overview" && <OverviewTab />}
                {activeTab === "accounts" && <AccountsTab />}
                {activeTab === "plugins" && <PluginsTab />}
                {activeTab === "settings" && <SettingsTab />}
                {activeTab === "logs" && <LogsTab />}
              </div>
            </div>
          </main>
        </div>
        
        {/* Help Modal */}
        <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
        
        {/* Hidden Help Modal for direct DOM access */}
        <div id="helpModal" className="hidden" onClick={() => setHelpModalOpen(true)}>
          <HelpModal isOpen={true} onClose={() => document.getElementById("helpModal")?.classList.add("hidden")} />
        </div>
      </div>
    </SidebarProvider>
  );
}