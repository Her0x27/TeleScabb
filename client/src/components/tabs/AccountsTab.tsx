import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TelegramClient, ApiClient } from "@/types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import VerificationModal from "@/components/modals/VerificationModal";

// Схема для формы добавления аккаунта
const accountFormSchema = z.object({
  phoneNumber: z.string().min(1, "Введите номер телефона"),
  apiId: z.number().int().positive("API ID должен быть положительным числом"),
  apiHash: z.string().min(1, "Введите API Hash"),
  deviceModel: z.string().optional(),
  systemVersion: z.string().optional(),
  appVersion: z.string().optional(),
  langCode: z.string().optional(),
  systemLangCode: z.string().optional(),
  timeout: z.number().int().positive().optional(),
  requestRetries: z.number().int().positive().optional(),
  connectionRetries: z.number().int().positive().optional(),
  retryDelay: z.number().int().positive().optional(),
  autoReconnect: z.boolean().optional(),
  sequentialUpdates: z.boolean().optional(),
  floodSleepThreshold: z.number().int().positive().optional()
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export default function AccountsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");

  // Запрос на получение списка клиентов
  const { data: clients, isLoading: isClientsLoading } = useQuery<TelegramClient[]>({
    queryKey: ['/api/clients'],
  });

  // Запрос на получение пресетов клиентов
  const { data: apiClients } = useQuery<ApiClient[]>({
    queryKey: ['/api/clients/presets'],
  });

  // Форма для добавления аккаунта
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      phoneNumber: "",
      apiId: 4,
      apiHash: "014b35b6184100b085b0d0572f9b5103", // Android Client
      deviceModel: "Android",
      systemVersion: "Android 12",
      appVersion: "8.4.2",
      langCode: "ru",
      systemLangCode: "ru",
      timeout: 10,
      requestRetries: 5,
      connectionRetries: 5,
      retryDelay: 1000,
      autoReconnect: true,
      sequentialUpdates: true,
      floodSleepThreshold: 60
    }
  });

  // Мутация для создания клиента
  const createClientMutation = useMutation({
    mutationFn: async (data: AccountFormValues) => {
      const response = await apiRequest("POST", "/api/clients", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Успех",
        description: `Аккаунт ${data.phoneNumber} успешно создан`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      // Устанавливаем ID клиента и номер телефона для отправки кода
      setSelectedClientId(data.id);
      setSelectedPhoneNumber(data.phoneNumber);
      sendAuthCodeMutation.mutate(data.id);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось создать аккаунт: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Мутация для отправки кода авторизации
  const sendAuthCodeMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/send-code`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Код отправлен",
        description: `Код авторизации отправлен на указанный номер`,
      });
      setPhoneCodeHash(data.phoneCodeHash);
      setVerificationModalOpen(true);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось отправить код: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Мутация для подтверждения кода авторизации
  const confirmCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!selectedClientId) return;
      
      const response = await apiRequest("POST", `/api/clients/${selectedClientId}/sign-in`, {
        code,
        phoneCodeHash
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успех",
        description: "Аккаунт успешно авторизован",
      });
      setVerificationModalOpen(false);
      setPhoneCodeHash("");
      setSelectedClientId(null);
      setSelectedPhoneNumber("");
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось авторизоваться: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Мутация для запуска клиента
  const startClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/start`, {});
      return response.json();
    },
    onSuccess: (_, clientId) => {
      toast({
        title: "Успех",
        description: "Клиент успешно запущен",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось запустить клиент: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Мутация для остановки клиента
  const stopClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await apiRequest("POST", `/api/clients/${clientId}/stop`, {});
      return response.json();
    },
    onSuccess: (_, clientId) => {
      toast({
        title: "Успех",
        description: "Клиент успешно остановлен",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось остановить клиент: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Обработка выбора пресета клиента
  const handleClientPresetChange = (presetName: string) => {
    if (!apiClients) return;
    
    const preset = apiClients.find(client => client.name === presetName);
    if (preset) {
      form.setValue("apiId", preset.apiId);
      form.setValue("apiHash", preset.apiHash);
      
      // Устанавливаем соответствующие значения для типа устройства
      if (presetName.includes("Android")) {
        form.setValue("deviceModel", "Android");
        form.setValue("systemVersion", "Android 12");
        form.setValue("appVersion", "8.4.2");
      } else if (presetName.includes("iOS")) {
        form.setValue("deviceModel", "iPhone");
        form.setValue("systemVersion", "iOS 16.0");
        form.setValue("appVersion", "8.4.2");
      } else if (presetName.includes("Desktop")) {
        form.setValue("deviceModel", "Desktop");
        form.setValue("systemVersion", "Windows 10");
        form.setValue("appVersion", "3.4.8");
      } else if (presetName.includes("macOS")) {
        form.setValue("deviceModel", "Mac");
        form.setValue("systemVersion", "macOS 12.0");
        form.setValue("appVersion", "8.4.2");
      } else if (presetName.includes("Web")) {
        form.setValue("deviceModel", "Web");
        form.setValue("systemVersion", "Chrome");
        form.setValue("appVersion", "1.0.0");
      }
    }
  };

  // Обработка отправки формы
  const onSubmit = (data: AccountFormValues) => {
    createClientMutation.mutate(data);
  };

  // Обработка подтверждения кода
  const handleConfirmCode = (code: string) => {
    if (code.trim().length === 0) {
      toast({
        title: "Ошибка",
        description: "Введите код подтверждения",
        variant: "destructive",
      });
      return;
    }
    
    confirmCodeMutation.mutate(code);
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Форма добавления аккаунта */}
        <div className="lg:col-span-1">
          <div className="bg-neutral-50 p-4 rounded border border-neutral-200">
            <h3 className="text-lg font-medium mb-4">Добавить аккаунт</h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Номер телефона</FormLabel>
                      <FormControl>
                        <Input placeholder="+7 999 123-45-67" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormItem>
                  <FormLabel>Клиент Telegram</FormLabel>
                  <Select 
                    onValueChange={handleClientPresetChange} 
                    defaultValue={apiClients?.[0]?.name || "Telegram для Android"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите клиент" />
                    </SelectTrigger>
                    <SelectContent>
                      {apiClients?.map((client) => (
                        <SelectItem key={client.apiId} value={client.name}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
                
                <FormField
                  control={form.control}
                  name="apiId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API ID</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value.toString()} onChange={e => field.onChange(parseInt(e.target.value))} readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="apiHash"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Hash</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="mb-4">
                  <h4 className="block text-sm font-medium text-neutral-700 mb-2">Расширенные настройки</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-white">
                      <div>
                        <div className="text-sm font-medium">Автоматическое переподключение</div>
                        <div className="text-xs text-neutral-500">Подключаться автоматически при обрыве</div>
                      </div>
                      <FormField
                        control={form.control}
                        name="autoReconnect"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={field.onChange} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-2 rounded bg-white">
                      <div>
                        <div className="text-sm font-medium">Последовательные обновления</div>
                        <div className="text-xs text-neutral-500">Обрабатывать обновления последовательно</div>
                      </div>
                      <FormField
                        control={form.control}
                        name="sequentialUpdates"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={field.onChange} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-2 rounded bg-white">
                      <div>
                        <div className="text-sm font-medium">Таймаут подключения</div>
                        <div className="text-xs text-neutral-500">
                          {form.watch("timeout")} секунд
                        </div>
                      </div>
                      <FormField
                        control={form.control}
                        name="timeout"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                className="w-20"
                                {...field}
                                value={field.value?.toString() || "10"}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-2 rounded bg-white">
                      <div>
                        <div className="text-sm font-medium">Повторы запросов</div>
                        <div className="text-xs text-neutral-500">
                          {form.watch("requestRetries")} повторов
                        </div>
                      </div>
                      <FormField
                        control={form.control}
                        name="requestRetries"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                className="w-20"
                                {...field}
                                value={field.value?.toString() || "5"}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createClientMutation.isPending}
                >
                  {createClientMutation.isPending ? 
                    "Добавление..." : "Добавить аккаунт"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
        
        {/* Список аккаунтов */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Управление аккаунтами</h3>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                className="bg-accent hover:bg-accent-dark text-white" 
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/clients'] })}
              >
                <span className="material-icons text-sm mr-1">sync</span>
                Обновить
              </Button>
            </div>
          </div>
          
          {isClientsLoading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent text-primary rounded-full mb-2"></div>
              <p>Загрузка аккаунтов...</p>
            </div>
          ) : clients && clients.length > 0 ? (
            <div className="space-y-4">
              {clients.map(client => (
                <div key={client.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="flex items-center mb-4 md:mb-0">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white mr-4">
                        <span className="text-lg font-medium">
                          {client.phoneNumber.substring(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium">{client.phoneNumber}</h4>
                        <div className="text-sm text-neutral-500">
                          {client.deviceModel} ({client.systemVersion})
                        </div>
                        <div className="flex items-center mt-1">
                          <span className={`inline-block w-2 h-2 ${
                            client.status === 'connected' ? 'bg-success' : 
                            client.status === 'sleeping' ? 'bg-warning' : 'bg-danger'
                          } rounded-full mr-2`}></span>
                          <span className={
                            client.status === 'connected' ? 'text-success' : 
                            client.status === 'sleeping' ? 'text-warning' : 'text-danger'
                          }>{
                            client.status === 'connected' ? 'Активен' : 
                            client.status === 'sleeping' ? 'Спящий режим' : 'Отключен'
                          }</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {client.isActive ? (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => stopClientMutation.mutate(client.id)}
                          disabled={stopClientMutation.isPending}
                        >
                          <span className="material-icons text-sm mr-1">stop</span>
                          Стоп
                        </Button>
                      ) : (
                        <Button 
                          variant="default" 
                          className="bg-accent hover:bg-accent-dark text-white"
                          size="sm"
                          onClick={() => startClientMutation.mutate(client.id)}
                          disabled={startClientMutation.isPending}
                        >
                          <span className="material-icons text-sm mr-1">play_arrow</span>
                          Запуск
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // В реальном приложении здесь был бы перезапуск клиента
                          toast({
                            title: "Информация",
                            description: "Функция перезапуска в разработке",
                          });
                        }}
                      >
                        <span className="material-icons text-sm mr-1">refresh</span>
                        Рестарт
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // В реальном приложении здесь было бы открытие настроек клиента
                          toast({
                            title: "Информация",
                            description: "Функция настройки в разработке",
                          });
                        }}
                      >
                        <span className="material-icons text-sm mr-1">settings</span>
                        Настроить
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
                      <div className="text-sm text-neutral-500">Сообщений</div>
                      <div className="text-lg font-medium">
                        {client.id === 1 ? "187" : client.id === 2 ? "100" : "0"}
                      </div>
                    </div>
                    
                    <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
                      <div className="text-sm text-neutral-500">Плагинов</div>
                      <div className="text-lg font-medium">
                        {client.id === 1 ? "12" : client.id === 2 ? "8" : "0"}
                      </div>
                    </div>
                    
                    <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
                      <div className="text-sm text-neutral-500">Команд</div>
                      <div className="text-lg font-medium">
                        {client.id === 1 ? "48" : client.id === 2 ? "32" : "0"}
                      </div>
                    </div>
                    
                    <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
                      <div className="text-sm text-neutral-500">Активных задач</div>
                      <div className="text-lg font-medium">
                        {client.id === 1 ? "4" : client.id === 2 ? "3" : "0"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-neutral-500">Нет добавленных аккаунтов</p>
              <p className="text-sm mt-2">Используйте форму слева для добавления аккаунта Telegram</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Модальное окно с вводом кода подтверждения */}
      <VerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        onConfirm={handleConfirmCode}
        phoneNumber={selectedPhoneNumber}
      />
    </div>
  );
}
