import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function SettingsTab() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    language: "ru",
    commandPrefix: "!",
    theme: "light",
    notifications: true,
    updateChecking: true,
    telemetry: false
  });
  
  // Обработчик изменения настроек
  const handleSettingChange = (setting: string, value: any) => {
    setSettings({
      ...settings,
      [setting]: value
    });
  };
  
  // Обработчик сохранения настроек
  const handleSaveSettings = () => {
    // В реальном приложении здесь был бы API-запрос для сохранения настроек
    toast({
      title: "Успех",
      description: "Настройки успешно сохранены",
      variant: "success",
    });
  };
  
  return (
    <div className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Навигация по настройкам */}
        <div className="lg:col-span-1">
          <div className="bg-neutral-50 p-4 rounded border border-neutral-200">
            <h3 className="text-lg font-medium mb-4">Разделы настроек</h3>
            
            <div className="space-y-1">
              <Button className="w-full text-left px-3 py-2 bg-primary text-white rounded focus:outline-none">
                Общие настройки
              </Button>
              
              <Button variant="ghost" className="w-full text-left px-3 py-2 text-neutral-700 hover:bg-neutral-200 rounded focus:outline-none">
                API и подключения
              </Button>
              
              <Button variant="ghost" className="w-full text-left px-3 py-2 text-neutral-700 hover:bg-neutral-200 rounded focus:outline-none">
                Параметры клиента
              </Button>
              
              <Button variant="ghost" className="w-full text-left px-3 py-2 text-neutral-700 hover:bg-neutral-200 rounded focus:outline-none">
                Система команд
              </Button>
              
              <Button variant="ghost" className="w-full text-left px-3 py-2 text-neutral-700 hover:bg-neutral-200 rounded focus:outline-none">
                Обработка событий
              </Button>
              
              <Button variant="ghost" className="w-full text-left px-3 py-2 text-neutral-700 hover:bg-neutral-200 rounded focus:outline-none">
                Резервное копирование
              </Button>
              
              <Button variant="ghost" className="w-full text-left px-3 py-2 text-neutral-700 hover:bg-neutral-200 rounded focus:outline-none">
                Логирование
              </Button>
              
              <Button variant="ghost" className="w-full text-left px-3 py-2 text-neutral-700 hover:bg-neutral-200 rounded focus:outline-none">
                Безопасность
              </Button>
            </div>
          </div>
        </div>
        
        {/* Содержимое настроек */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-medium mb-4">Общие настройки</h3>
            
            <div className="space-y-6">
              {/* Язык системы */}
              <div>
                <h4 className="text-base font-medium mb-2">Язык системы</h4>
                <select 
                  className="w-full sm:w-64 p-2 border border-neutral-300 rounded focus:ring-primary focus:border-primary"
                  value={settings.language}
                  onChange={(e) => handleSettingChange("language", e.target.value)}
                >
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              
              {/* Префикс команд */}
              <div>
                <h4 className="text-base font-medium mb-2">Префикс команд</h4>
                <div className="flex">
                  <Input
                    value={settings.commandPrefix}
                    onChange={(e) => handleSettingChange("commandPrefix", e.target.value)}
                    className="w-full sm:w-64"
                  />
                  <Button className="ml-2" onClick={handleSaveSettings}>
                    Сохранить
                  </Button>
                </div>
                <p className="text-sm text-neutral-500 mt-1">Символ, который будет использоваться перед командами</p>
              </div>
              
              <Separator />
              
              {/* Настройки темы */}
              <div>
                <h4 className="text-base font-medium mb-2">Настройки темы</h4>
                <RadioGroup 
                  value={settings.theme} 
                  onValueChange={(value) => handleSettingChange("theme", value)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="theme-light" />
                    <Label htmlFor="theme-light">Светлая</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="theme-dark" />
                    <Label htmlFor="theme-dark">Темная</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="system" id="theme-system" />
                    <Label htmlFor="theme-system">Системная</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Separator />
              
              {/* Уведомления */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-medium">Уведомления</h4>
                  <p className="text-sm text-neutral-500">Показывать уведомления о событиях</p>
                </div>
                <Switch 
                  checked={settings.notifications} 
                  onCheckedChange={(checked) => handleSettingChange("notifications", checked)} 
                />
              </div>
              
              {/* Проверка обновлений */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-medium">Проверка обновлений</h4>
                  <p className="text-sm text-neutral-500">Автоматически проверять новые версии</p>
                </div>
                <Switch 
                  checked={settings.updateChecking} 
                  onCheckedChange={(checked) => handleSettingChange("updateChecking", checked)} 
                />
              </div>
              
              {/* Телеметрия */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-medium">Анонимная телеметрия</h4>
                  <p className="text-sm text-neutral-500">Отправлять анонимные данные об использовании</p>
                </div>
                <Switch 
                  checked={settings.telemetry} 
                  onCheckedChange={(checked) => handleSettingChange("telemetry", checked)} 
                />
              </div>
              
              <Button 
                className="bg-primary hover:bg-primary-dark text-white"
                onClick={handleSaveSettings}
              >
                Сохранить настройки
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
