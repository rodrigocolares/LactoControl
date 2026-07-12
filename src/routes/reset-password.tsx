import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Droplet, Eye, EyeOff, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AuthBackground } from "@/components/AuthBackground";


export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkValid, setLinkValid] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase places recovery tokens in the URL hash and fires PASSWORD_RECOVERY
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setLinkValid(true);
        setReady(true);
      }
    });
    // Fallback: after a short moment, check if we have a session (link consumed)
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setReady(true);
      if (!data.session && !window.location.hash.includes("type=recovery")) {
        setLinkValid(false);
      }
    }, 800);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const strong = passwordRegex.test(password);
  const match = password && password === confirm;
  const canSubmit = strong && match && !loading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível atualizar a senha. O link pode ter expirado.");
      setLinkValid(false);
      return;
    }
    await supabase.auth.signOut();
    toast.success("Senha atualizada. Faça login novamente.");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <AuthBackground>
      <div className="mx-auto flex w-full max-w-[480px] flex-col items-center">
        <div className="mb-6 flex items-center gap-3 text-white drop-shadow">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Droplet className="size-6" />
          </div>
          <div className="text-xl font-bold tracking-tight">Lacto Control</div>
        </div>
        <Card className="w-full border-white/20 bg-white/95 shadow-2xl backdrop-blur-md supports-[backdrop-filter]:bg-white/85 dark:bg-card/90">
          <CardContent className="pt-6">
            <h1 className="text-xl font-bold">Redefinir senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">Escolha uma nova senha segura para sua conta.</p>

            {!ready ? (
              <div className="mt-6 flex items-center justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : !linkValid ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-destructive">Este link de recuperação é inválido ou expirou.</p>
                <Button className="w-full" onClick={() => navigate({ to: "/auth", search: { mode: "forgot" } })}>
                  Solicitar novo link
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-sm"><Lock className="size-4" />Nova senha</Label>
                  <div className="relative">
                    <Input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <StrengthBar password={password} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-sm"><Lock className="size-4" />Confirmar nova senha</Label>
                  <Input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                  {confirm && !match && <p className="text-xs text-destructive">As senhas não coincidem.</p>}
                </div>
                <Button type="submit" className="w-full" disabled={!canSubmit}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Atualizar senha
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthBackground>
  );
}


function StrengthBar({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
  const colors = ["bg-destructive", "bg-destructive", "bg-yellow-500", "bg-primary", "bg-primary"];
  return (
    <div className="mt-1 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded ${i < score ? colors[score] : "bg-muted"}`} />
        ))}
      </div>
      {password && <p className="text-xs text-muted-foreground">Força: {labels[score]}</p>}
    </div>
  );
}
