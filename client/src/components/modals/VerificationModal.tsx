import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (code: string) => void;
  phoneNumber: string;
}

export default function VerificationModal({ isOpen, onClose, onConfirm, phoneNumber }: VerificationModalProps) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = () => {
    if (code.trim().length === 0) return;
    
    setIsLoading(true);
    onConfirm(code);
    // Мы не сбрасываем isLoading здесь, это будет сделано в родительском компоненте при закрытии модального окна
  };

  const handleClose = () => {
    setCode("");
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Подтверждение авторизации</DialogTitle>
          <DialogDescription>
            Введите код авторизации, отправленный на номер {phoneNumber}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-code">Код подтверждения</Label>
              <Input
                id="verification-code"
                placeholder="Введите код"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                disabled={isLoading}
              />
            </div>
            
            <div className="text-sm text-neutral-500">
              <p>Код был отправлен в приложение Telegram или в виде SMS.</p>
              <p>Если вы не получили код, убедитесь, что указали правильный номер телефона и повторите попытку.</p>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Отмена
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || code.trim().length === 0}>
            {isLoading ? "Подтверждение..." : "Подтвердить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}