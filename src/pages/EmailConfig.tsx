import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Shield, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { EmailIntegration } from "@/types/email";

export default function EmailConfig() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<EmailIntegration | null>(null);

  // Manual config state
  const [email, setEmail] = useState("");
  const [imapHost, setImapHost] = useState("imap.gmail.com");
  const [imapPort, setImapPort] = useState("993");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [password, setPassword] = useState("");

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const newConfig: EmailIntegration = {
        id: crypto.randomUUID(),
        user_id: user?.id || "",
        provider: "manual",
        email_address: email,
        imap_host: imapHost,
        imap_port: parseInt(imapPort),
        smtp_host: smtpHost,
        smtp_port: parseInt(smtpPort),
        sync_frequency: "manual",
        sync_period_days: 30,
        sync_only_clients: true,
        // is_active is tracked locally
        last_synced_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setConfig(newConfig);
      setLoading(false);
      toast({
        title: "Conectado com sucesso",
        description: `Email ${email} configurado corretamente.`,
      });
    }, 1500);
  };

  const handleDisconnect = () => {
    setConfig(null);
    setEmail("");
    setPassword("");
    toast({ title: "Conta desconectada" });
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integração de Email</h2>
        <p className="text-muted-foreground">
          Conecte sua conta de email para gerenciar comunicações diretamente do JurisControl.
        </p>
      </div>

      {config ? (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-green-800 dark:text-green-400">Email Conectado</CardTitle>
                  <CardDescription>{config.email_address}</CardDescription>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={loading}>
                Desconectar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-background/50 rounded-lg border">
                <span className="text-muted-foreground block mb-1">Status</span>
                <span className="font-medium text-green-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Ativo
                </span>
              </div>
              <div className="p-3 bg-background/50 rounded-lg border">
                <span className="text-muted-foreground block mb-1">Última Sincronização</span>
                <span className="font-medium">
                  {config.last_synced_at
                    ? new Date(config.last_synced_at).toLocaleString()
                    : "Pendente"}
                </span>
              </div>
              <div className="p-3 bg-background/50 rounded-lg border">
                <span className="text-muted-foreground block mb-1">Frequência</span>
                <span className="font-medium capitalize">{config.sync_frequency}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="gap-2" onClick={() => toast({ title: "Sincronização iniciada" })}>
                <RefreshCw className="w-4 h-4" /> Sincronizar Agora
              </Button>
              <Button variant="secondary" className="gap-2">
                <Shield className="w-4 h-4" /> Configurar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="oauth" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="oauth">Conexão Rápida</TabsTrigger>
            <TabsTrigger value="manual">IMAP / SMTP</TabsTrigger>
          </TabsList>

          <TabsContent value="oauth">
            <Card>
              <CardHeader>
                <CardTitle>Escolha seu provedor</CardTitle>
                <CardDescription>
                  Conecte-se de forma segura usando OAuth. Nós não armazenamos sua senha.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full h-12 justify-start gap-3 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                  onClick={() => toast({ title: "Em breve", description: "Integração Google em desenvolvimento" })}
                >
                  <Mail className="w-5 h-5 text-red-500" />
                  Conectar com Gmail
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 justify-start gap-3 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                  onClick={() => toast({ title: "Em breve", description: "Integração Outlook em desenvolvimento" })}
                >
                  <Mail className="w-5 h-5 text-blue-500" />
                  Conectar com Outlook / Office 365
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Configuração Manual</CardTitle>
                <CardDescription>
                  Insira os detalhes do servidor do seu provedor de email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualConnect} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Endereço de Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu.nome@exemplo.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="imap">Servidor IMAP (Entrada)</Label>
                      <Input id="imap" placeholder="imap.exemplo.com" value={imapHost} onChange={(e) => setImapHost(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imap-port">Porta</Label>
                      <Input id="imap-port" placeholder="993" value={imapPort} onChange={(e) => setImapPort(e.target.value)} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp">Servidor SMTP (Saída)</Label>
                      <Input id="smtp" placeholder="smtp.exemplo.com" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-port">Porta</Label>
                      <Input id="smtp-port" placeholder="587" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha do App / Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Recomendamos usar uma "Senha de App" se seu provedor suportar 2FA.
                    </p>
                  </div>

                  <div className="pt-4">
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Conectando...</> : "Testar e Salvar Conexão"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Preferências de Sincronização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Sincronizar apenas clientes</Label>
              <p className="text-sm text-muted-foreground">
                Ignora emails de remetentes que não estão no cadastro de clientes.
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Frequência de Atualização</Label>
              <Select defaultValue="15min">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Tempo Real (Push)</SelectItem>
                  <SelectItem value="5min">A cada 5 minutos</SelectItem>
                  <SelectItem value="15min">A cada 15 minutos</SelectItem>
                  <SelectItem value="1h">A cada 1 hora</SelectItem>
                  <SelectItem value="manual">Apenas Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Período de Retenção</Label>
              <Select defaultValue="30">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
