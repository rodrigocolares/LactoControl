import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AppLayout, PageHeader } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteMyAccount } from "@/lib/account.functions";

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

          <div className="md:col-span-2">
            <DangerZoneCard />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function DangerZoneCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteMyAccount);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState<string>("");
  const [reasonNote, setReasonNote] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);

  const PHRASE = "ENCERRAR MINHA CONTA";
  const canDelete = confirmPhrase.trim() === PHRASE && password.length > 0 && !processing;

  const reset = () => {
    setStep(1);
    setReason("");
    setReasonNote("");
    setConfirmPhrase("");
    setPassword("");
    setProcessing(false);
  };

  const downloadMyData = async () => {
    if (!user) return;
    try {
      const [profileRes, propsRes, cowsRes, milkRes, vaxRes, vaxRecRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("properties").select("*"),
        supabase.from("cows").select("*"),
        supabase.from("milk_productions").select("*"),
        supabase.from("vaccines").select("*"),
        supabase.from("vaccination_records").select("*"),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        user: { id: user.id, email: user.email },
        profile: profileRes.data ?? null,
        properties: propsRes.data ?? [],
        cows: cowsRes.data ?? [],
        milk_productions: milkRes.data ?? [],
        vaccines: vaxRes.data ?? [],
        vaccination_records: vaxRecRes.data ?? [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lactocontrol-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup baixado.");
    } catch {
      toast.error("Não foi possível gerar o backup.");
    }
  };

  const confirmDelete = async () => {
    if (!canDelete) return;
    setProcessing(true);
    try {
      await deleteFn({ data: { password, reason: [reason, reasonNote].filter(Boolean).join(" | ") || undefined } });
      // Limpa store local do Lacto Control
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("lactocontrol-v1"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {}
      queryClient.clear();
      await supabase.auth.signOut().catch(() => {});
      toast.success("Conta encerrada.");
      navigate({ to: "/auth", search: { deleted: "1" }, replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha desconhecida.";
      if (msg.toLowerCase().includes("senha")) {
        toast.error("Senha incorreta.");
      } else {
        toast.error(
          "Não foi possível concluir o encerramento da conta. Nenhuma nova tentativa será realizada automaticamente. Entre novamente e tente outra vez.",
        );
      }
      setProcessing(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" />
          Zona de perigo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Esta ação excluirá permanentemente sua conta e todos os dados associados. Essa
          operação não poderá ser desfeita.
        </p>
        <Button
          variant="destructive"
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <Trash2 className="mr-2 size-4" />
          Encerrar minha conta
        </Button>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (processing) return;
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-w-lg">
          {step === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle>Tem certeza de que deseja encerrar sua conta?</DialogTitle>
                <DialogDescription>
                  Todos os dados vinculados à sua conta serão excluídos permanentemente,
                  incluindo vacas, produções de leite, vacinas, aplicações vacinais,
                  relatórios, dados da fazenda e informações do perfil. Essa ação não
                  poderá ser desfeita.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Por que você está encerrando sua conta? (opcional)</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao_uso_mais">Não utilizo mais o sistema</SelectItem>
                      <SelectItem value="dificil">Dificuldade de uso</SelectItem>
                      <SelectItem value="outra_conta">Criei outra conta</SelectItem>
                      <SelectItem value="privacidade">Preocupação com privacidade</SelectItem>
                      <SelectItem value="faltam_recursos">Faltam funcionalidades</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Comentário opcional"
                    value={reasonNote}
                    onChange={(e) => setReasonNote(e.target.value.slice(0, 500))}
                  />
                </div>

                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  Antes de continuar, você pode{" "}
                  <button
                    type="button"
                    className="font-medium text-primary underline"
                    onClick={downloadMyData}
                  >
                    baixar meus dados
                  </button>{" "}
                  em JSON.
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={() => setStep(2)}>
                  Continuar com encerramento
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-destructive">Confirmação final</DialogTitle>
                <DialogDescription>
                  Para confirmar, digite <span className="font-mono font-semibold">{PHRASE}</span>{" "}
                  e informe sua senha atual.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Digite a frase de confirmação</Label>
                  <Input
                    value={confirmPhrase}
                    onChange={(e) => setConfirmPhrase(e.target.value)}
                    placeholder={PHRASE}
                    autoComplete="off"
                    disabled={processing}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha atual</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={processing}
                  />
                </div>
                {processing && (
                  <p className="text-sm text-muted-foreground">
                    Estamos encerrando sua conta e removendo seus dados com segurança.
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={processing}
                >
                  Voltar
                </Button>
                <Button variant="destructive" onClick={confirmDelete} disabled={!canDelete}>
                  {processing && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Sim, excluir permanentemente
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
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
