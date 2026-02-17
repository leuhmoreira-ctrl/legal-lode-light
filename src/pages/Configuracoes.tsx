import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Save, Loader2, Eye, EyeOff, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { FileStructureSettings } from "@/components/configuracoes/FileStructureSettings";
import { PageHeader } from "@/components/layout/PageHeader";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

interface ProfileData {
  full_name: string;
  avatar_url: string;
  phone: string;
  oab_number: string;
  oab_uf: string;
  cpf: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

export default function Configuracoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    avatar_url: "",
    phone: "",
    oab_number: "",
    oab_uf: "",
    cpf: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
  });

  const [passwords, setPasswords] = useState({ current: "", new_pw: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, new_pw: false, confirm: false });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) {
          setProfile({
            full_name: data.full_name || "",
            avatar_url: (data as any).avatar_url || "",
            phone: (data as any).phone || "",
            oab_number: (data as any).oab_number || "",
            oab_uf: (data as any).oab_uf || "",
            cpf: (data as any).cpf || "",
            address: (data as any).address || "",
            city: (data as any).city || "",
            state: (data as any).state || "",
            zip_code: (data as any).zip_code || "",
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 2MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Apenas imagens", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user?.id}/${user?.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

      await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl } as any)
        .eq("id", user?.id);

      setProfile((p) => ({ ...p, avatar_url: urlData.publicUrl }));
      toast({ title: "Foto atualizada" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          oab_number: profile.oab_number,
          oab_uf: profile.oab_uf,
          cpf: profile.cpf,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          zip_code: profile.zip_code,
        } as any)
        .eq("id", user?.id);
      if (error) throw error;
      toast({ title: "Perfil atualizado" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new_pw !== passwords.confirm) {
      toast({ title: "Senhas não coincidem", variant: "destructive" });
      return;
    }
    if (passwords.new_pw.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email!,
        password: passwords.current,
      });
      if (signInError) throw new Error("Senha atual incorreta");

      const { error } = await supabase.auth.updateUser({ password: passwords.new_pw });
      if (error) throw error;

      toast({ title: "Senha alterada com sucesso" });
      setPasswords({ current: "", new_pw: "", confirm: "" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const upd = (field: keyof ProfileData, value: string) =>
    setProfile((p) => ({ ...p, [field]: value }));

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-shell max-w-3xl">
        <PageHeader
          eyebrow="Conta e preferências"
          title="Configurações"
          subtitle="Gerencie seu perfil, segurança e estrutura de arquivos."
        />

        <Tabs defaultValue="profile">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="profile" className="flex-1 sm:flex-none">Perfil</TabsTrigger>
            <TabsTrigger value="security" className="flex-1 sm:flex-none">Segurança</TabsTrigger>
            <TabsTrigger value="files" className="flex-1 sm:flex-none">Arquivos</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4 space-y-6">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500" onClick={() => navigate("/configuracoes/email")}>
              <div className="flex items-center gap-4 p-6">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Email e Integrações</h3>
                  <p className="text-sm text-muted-foreground">
                    Conectar contas, SMTP/IMAP e preferências de sincronização.
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações Pessoais</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="text-xl">
                        {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                          <span>
                            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            {uploading ? "Enviando..." : "Alterar Foto"}
                          </span>
                        </Button>
                      </Label>
                      <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG (máx. 2MB)</p>
                    </div>
                  </div>

                  {/* Basic info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome Completo *</Label>
                      <Input value={profile.full_name} onChange={(e) => upd("full_name", e.target.value)} required />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={user?.email || ""} disabled />
                      <p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado</p>
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input placeholder="(00) 00000-0000" value={profile.phone} onChange={(e) => upd("phone", e.target.value)} />
                    </div>
                    <div>
                      <Label>CPF</Label>
                      <Input placeholder="000.000.000-00" value={profile.cpf} onChange={(e) => upd("cpf", e.target.value)} />
                    </div>
                  </div>

                  {/* OAB */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Número da OAB</Label>
                      <Input placeholder="123456" value={profile.oab_number} onChange={(e) => upd("oab_number", e.target.value)} />
                    </div>
                    <div>
                      <Label>UF da OAB</Label>
                      <Select value={profile.oab_uf} onValueChange={(v) => upd("oab_uf", v)}>
                        <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>
                          {ESTADOS_BR.map((uf) => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-4">
                    <div>
                      <Label>Endereço</Label>
                      <Textarea placeholder="Rua, número, complemento" value={profile.address} onChange={(e) => upd("address", e.target.value)} rows={2} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Cidade</Label>
                        <Input value={profile.city} onChange={(e) => upd("city", e.target.value)} />
                      </div>
                      <div>
                        <Label>Estado</Label>
                        <Select value={profile.state} onValueChange={(v) => upd("state", v)}>
                          <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                          <SelectContent>
                            {ESTADOS_BR.map((uf) => (
                              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>CEP</Label>
                        <Input placeholder="00000-000" value={profile.zip_code} onChange={(e) => upd("zip_code", e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alterar Senha</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {(["current", "new_pw", "confirm"] as const).map((field) => (
                    <div key={field}>
                      <Label>
                        {field === "current" ? "Senha Atual" : field === "new_pw" ? "Nova Senha" : "Confirmar Nova Senha"} *
                      </Label>
                      <div className="relative">
                        <Input
                          type={showPw[field] ? "text" : "password"}
                          value={passwords[field]}
                          onChange={(e) => setPasswords((p) => ({ ...p, [field]: e.target.value }))}
                          required
                          minLength={field !== "current" ? 6 : undefined}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPw((p) => ({ ...p, [field]: !p[field] }))}
                        >
                          {showPw[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {field === "new_pw" && (
                        <p className="text-xs text-muted-foreground mt-1">Mínimo de 6 caracteres</p>
                      )}
                    </div>
                  ))}
                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {saving ? "Alterando..." : "Alterar Senha"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <FileStructureSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
