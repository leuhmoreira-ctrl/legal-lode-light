import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings, CheckCircle2, Mail } from "lucide-react";

export function CommunicationSettings() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle>Configurações de Comunicações</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Notifications */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Notificações</h4>
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Chat Interno</p>
                <SettingToggle label="Som para novas mensagens" defaultChecked />
                <SettingToggle label="Push notification" defaultChecked />
                <SettingToggle label="Badge no menu" defaultChecked />
              </div>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</p>
                <SettingToggle label="Notificar novos emails" defaultChecked />
                <SettingToggle label="Som diferenciado" defaultChecked={false} />
                <SettingToggle label="Badge no menu" defaultChecked />
              </div>
            </div>
          </div>

          <Separator />

          {/* Email Integration */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Integração de Email</h4>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <div className="p-1.5 rounded-full bg-success/10">
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Conectado</p>
                <p className="text-xs text-muted-foreground truncate">advogado@juriscontrol.com</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setOpen(false)}>
                Gerenciar
              </Button>
            </div>
          </div>

          <Separator />

          {/* Appearance */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Aparência</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Ordenação</Label>
                <Select defaultValue="recent">
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais recentes primeiro</SelectItem>
                    <SelectItem value="unread">Não lidos primeiro</SelectItem>
                    <SelectItem value="alpha">Alfabética</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Densidade</Label>
                <Select defaultValue="comfortable">
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compacta</SelectItem>
                    <SelectItem value="comfortable">Confortável</SelectItem>
                    <SelectItem value="spacious">Espaçada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SettingToggle({ label, defaultChecked }: { label: string; defaultChecked: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs font-normal">{label}</Label>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
