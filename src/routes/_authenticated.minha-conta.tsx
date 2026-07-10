import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppLayout, PageHeader } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/minha-conta")({
  component: MinhaContaPage,
});

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function MinhaContaPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ full_name: "", farm_name: "", phone: "", created_at: "" });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, farm_name, phone, created_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile({
            full_name: data.full_name ?? "",
            farm_name: data.farm_name ?? "",
            phone: data.phone ?? "",
            created_at: data.created_at ?? "",
          });
        }
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: profile.full_name.trim(),
      farm_name: profile.farm_name.trim() || null,
      phone: profile.phone.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar as alterações.");
    toast.success("Perfil atualizado.");
  };

  return (
    <AppLayout>
      <PageHeader title="Minha conta" description="Gerencie seus dados e credenciais." />
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Dados pessoais</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={user?.email ?? ""} disabled />
                <p className="text-xs text-muted-foreground">A alteração de e-mail requer confirmação e não está disponível aqui.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Propriedade / Fazenda</Label>
                <Input value={profile.farm_name} onChange={(e) => setProfile({ ...profile, farm_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
              {profile.created_at && (
                <p className="text-xs text-muted-foreground">Conta criada em {new Date(profile.created_at).toLocaleDateString("pt-BR")}</p>
              )}
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Salvar alterações
              </Button>
            </CardContent>
          </Card>

          <ChangePasswordCard />
        </div>
      )}
    </AppLayout>
  );
}

function ChangePasswordCard() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const strong = passwordRegex.test(password);
  const match = password && password === confirm;

  const submit = async () => {
    if (!strong || !match) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error("Não foi possível alterar a senha.");
    setPassword("");
    setConfirm("");
    toast.success("Senha atualizada.");
  };

  return (
    <Card>
      <CardHeader><CardTitle>Alterar senha</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nova senha</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
          {password && !strong && <p className="text-xs text-destructive">Use letra maiúscula, minúscula, número e caractere especial.</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Confirmar nova senha</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {confirm && !match && <p className="text-xs text-destructive">As senhas não coincidem.</p>}
        </div>
        <Button onClick={submit} disabled={!strong || !match || saving}>
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          Alterar senha
        </Button>
      </CardContent>
    </Card>
  );
}
