import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plugin } from "@/types";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Схема для формы создания плагина
const pluginFormSchema = z.object({
  name: z.string().min(1, "Введите имя плагина").regex(/^[a-z0-9\-]+$/, "Имя должно содержать только латинские буквы, цифры и тире"),
  displayName: z.string().min(1, "Введите отображаемое имя"),
  description: z.string().optional(),
  version: z.string().min(1, "Введите версию"),
  author: z.string().optional(),
  code: z.string().min(1, "Введите код плагина"),
  isActive: z.boolean().default(true),
});

type PluginFormValues = z.infer<typeof pluginFormSchema>;

export default function PluginsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Запрос на получение списка плагинов
  const { data: plugins, isLoading: isPluginsLoading } = useQuery<Plugin[]>({
    queryKey: ['/api/plugins'],
  });
  
  // Форма для создания плагина
  const form = useForm<PluginFormValues>({
    resolver: zodResolver(pluginFormSchema),
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      version: "1.0.0",
      author: "",
      code: `// Пример плагина для Telegram UserBot
module.exports = function() {
  return {
    async onLoad(context) {
      // Регистрируем обработчик для новых сообщений
      context.registerEventHandler('newMessage', async (data, clientId) => {
        // Получаем содержимое сообщения
        const message = data.message;
        
        // Проверяем, является ли сообщение командой
        if (message.text && message.text.startsWith('!hello')) {
          // Отправляем ответное сообщение
          await context.sendMessage(clientId, message.chatId, 'Привет! Я твой UserBot.');
          
          // Логируем событие
          await context.log('info', 'Ответили на команду !hello', clientId);
        }
      });
      
      // Логируем загрузку плагина
      await context.log('info', 'Плагин успешно загружен');
    },
    
    async onUnload() {
      // Освобождаем ресурсы при выгрузке плагина
      return Promise.resolve();
    }
  };
}`,
      isActive: true,
    }
  });
  
  // Мутация для создания плагина
  const createPluginMutation = useMutation({
    mutationFn: async (data: PluginFormValues) => {
      const response = await apiRequest("POST", "/api/plugins", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успех",
        description: "Плагин успешно создан",
        variant: "success",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось создать плагин: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });
  
  // Мутация для запуска плагина
  const startPluginMutation = useMutation({
    mutationFn: async (pluginId: number) => {
      const response = await apiRequest("POST", `/api/plugins/${pluginId}/start`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успех",
        description: "Плагин успешно запущен",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось запустить плагин: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });
  
  // Мутация для остановки плагина
  const stopPluginMutation = useMutation({
    mutationFn: async (pluginId: number) => {
      const response = await apiRequest("POST", `/api/plugins/${pluginId}/stop`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успех",
        description: "Плагин успешно остановлен",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось остановить плагин: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });
  
  // Мутация для удаления плагина
  const deletePluginMutation = useMutation({
    mutationFn: async (pluginId: number) => {
      const response = await apiRequest("DELETE", `/api/plugins/${pluginId}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успех",
        description: "Плагин успешно удален",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось удалить плагин: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });
  
  // Обработка отправки формы
  const onSubmit = (data: PluginFormValues) => {
    createPluginMutation.mutate(data);
  };
  
  // Обработка удаления плагина
  const handleDeletePlugin = (plugin: Plugin) => {
    if (window.confirm(`Вы уверены, что хотите удалить плагин "${plugin.displayName}"?`)) {
      deletePluginMutation.mutate(plugin.id);
    }
  };
  
  // Примеры плагинов из репозитория
  const repositoryPlugins = [
    {
      id: "translator",
      name: "Translator",
      description: "Перевод сообщений на разные языки",
      version: "1.3.0",
      author: "TelegramDevs",
      downloads: "2.3K",
      isNew: true
    },
    {
      id: "scheduler",
      name: "Scheduler",
      description: "Планировщик сообщений и действий",
      version: "2.1.0",
      author: "ScheduleTeam",
      downloads: "5.7K",
      isPopular: true
    },
    {
      id: "weather",
      name: "Weather",
      description: "Прогноз погоды в чате",
      version: "1.0.5",
      author: "WeatherBot",
      downloads: "1.2K"
    },
    {
      id: "sticker-converter",
      name: "Sticker Converter",
      description: "Конвертация изображений в стикеры",
      version: "2.0.1",
      author: "StickerLab",
      downloads: "3.8K"
    }
  ];
  
  return (
    <div className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Установленные плагины */}
        <div className="lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Установленные плагины</h3>
            <Button 
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <span className="material-icons text-sm mr-1">add</span>
              Создать
            </Button>
          </div>
          
          <div className="bg-neutral-50 p-4 rounded border border-neutral-200">
            {isPluginsLoading ? (
              <div className="text-center p-4">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent text-primary rounded-full mb-2"></div>
                <p>Загрузка плагинов...</p>
              </div>
            ) : plugins && plugins.length > 0 ? (
              <div className="space-y-3">
                {plugins.map(plugin => (
                  <div key={plugin.id} className="plugin-item bg-white p-3 rounded border border-neutral-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{plugin.displayName}</h4>
                        <p className="text-sm text-neutral-600">{plugin.description || "Нет описания"}</p>
                        <div className="text-xs text-neutral-500 mt-1">
                          v{plugin.version} • {plugin.isActive ? "Активен" : "Неактивен"}
                        </div>
                      </div>
                      <div className="flex">
                        {plugin.isActive ? (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-neutral-500 hover:text-neutral-700 mr-2"
                            onClick={() => stopPluginMutation.mutate(plugin.id)}
                            disabled={stopPluginMutation.isPending}
                          >
                            <span className="material-icons text-sm">pause</span>
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-neutral-500 hover:text-neutral-700 mr-2"
                            onClick={() => startPluginMutation.mutate(plugin.id)}
                            disabled={startPluginMutation.isPending}
                          >
                            <span className="material-icons text-sm">play_arrow</span>
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-neutral-500 hover:text-neutral-700 mr-2"
                          onClick={() => {
                            toast({
                              title: "Информация",
                              description: "Функция настройки плагина в разработке",
                            });
                          }}
                        >
                          <span className="material-icons text-sm">settings</span>
                        </Button>
                        {!plugin.isSystem && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-danger hover:text-red-700"
                            onClick={() => handleDeletePlugin(plugin)}
                            disabled={deletePluginMutation.isPending}
                          >
                            <span className="material-icons text-sm">delete</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 text-neutral-500">
                <p>Нет установленных плагинов</p>
                <p className="text-sm mt-2">Установите плагины из репозитория или создайте свой</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Репозиторий плагинов */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Репозиторий плагинов</h3>
            <div className="relative">
              <Input type="text" className="pl-8 pr-4 py-1" placeholder="Поиск плагинов..." />
              <span className="material-icons absolute left-2 top-1/2 transform -translate-y-1/2 text-neutral-400" style={{ fontSize: "18px" }}>search</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repositoryPlugins.map(plugin => (
              <div key={plugin.id} className="plugin-card bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium">{plugin.name}</h4>
                    <div className="text-sm text-neutral-600">{plugin.description}</div>
                  </div>
                  {plugin.isNew && (
                    <div className="bg-accent-light bg-opacity-20 text-accent text-xs px-2 py-0.5 rounded-full">
                      Новинка
                    </div>
                  )}
                  {plugin.isPopular && (
                    <div className="bg-neutral-200 text-neutral-600 text-xs px-2 py-0.5 rounded-full">
                      Популярный
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-neutral-600 mb-3">
                  {plugin.description} Поддерживает множество функций и настроек.
                </div>
                
                <div className="flex items-center text-xs text-neutral-500 mb-4">
                  <div className="flex items-center mr-3">
                    <span className="material-icons text-sm mr-1">code</span>
                    <span>v{plugin.version}</span>
                  </div>
                  <div className="flex items-center mr-3">
                    <span className="material-icons text-sm mr-1">person</span>
                    <span>{plugin.author}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="material-icons text-sm mr-1">download</span>
                    <span>{plugin.downloads}</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-primary hover:bg-primary-dark text-white"
                  onClick={() => {
                    toast({
                      title: "Информация",
                      description: `Установка плагина ${plugin.name} в разработке`,
                      variant: "default"
                    });
                  }}
                >
                  Установить
                </Button>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex justify-center">
            <Button variant="outline">
              Загрузить еще
            </Button>
          </div>
        </div>
      </div>
      
      {/* Диалог создания плагина */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Создать плагин</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Системное имя</FormLabel>
                      <FormControl>
                        <Input placeholder="my-plugin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Отображаемое имя</FormLabel>
                      <FormControl>
                        <Input placeholder="Мой плагин" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Версия</FormLabel>
                      <FormControl>
                        <Input placeholder="1.0.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Автор</FormLabel>
                      <FormControl>
                        <Input placeholder="Ваше имя" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Описание плагина" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Код плагина</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="// Код плагина" 
                        {...field} 
                        className="font-mono h-64"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPluginMutation.isPending}
                >
                  {createPluginMutation.isPending ? "Создание..." : "Создать плагин"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
