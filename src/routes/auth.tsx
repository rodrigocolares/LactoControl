import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Droplet, Eye, EyeOff, Loader2, Mail, Lock, User as UserIcon, Building2, Phone } from "lucide-react";
import { toast } from "sonner";
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from "@/lib/legal";


import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["login", "signup", "forgot"]).optional(),
  deleted: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>(search.mode ?? "login");

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: search.redirect ?? "/", replace: true });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate({ to: search.redirect ?? "/", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, search.redirect]);

  return (
    <AuthBackground>
      <div className="mx-auto flex w-full max-w-[480px] flex-col items-center">
        <div className="mb-6 flex items-center gap-3 text-white drop-shadow">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Droplet className="size-6" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">Lacto Control</div>
            <div className="text-xs text-white/80">Gestão leiteira</div>
          </div>
        </div>

        <Card className="w-full border-white/20 bg-white/95 shadow-2xl backdrop-blur-md supports-[backdrop-filter]:bg-white/85 dark:bg-card/90">
          <CardContent className="pt-6">
            <div className="mb-5 text-center">
              <h1 className="text-2xl font-bold tracking-tight">Bem-vindo ao Lacto Control</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Acesse sua conta para gerenciar o rebanho, a produção de leite e o controle vacinal.
              </p>
              {search.deleted === "1" && (
                <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
                  Sua conta foi encerrada e seus dados foram excluídos com sucesso.
                </div>
              )}
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastro</TabsTrigger>
                <TabsTrigger value="forgot">Recuperar</TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-5">
                <LoginForm />
              </TabsContent>
              <TabsContent value="signup" className="mt-5">
                <SignupForm onDone={() => setTab("login")} />
              </TabsContent>
              <TabsContent value="forgot" className="mt-5">
                <ForgotForm onDone={() => setTab("login")} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-white/90 drop-shadow">
          Ao continuar, você concorda com os{" "}
          <Link to="/termos-de-uso" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link to="/politica-de-privacidade" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
            Política de Privacidade
          </Link>.
        </p>
      </div>
    </AuthBackground>
  );
}


function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(translateAuthError(error.message));
      return;
    }
    toast.success("Bem-vindo!");
  };

  const onGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) toast.error("Não foi possível entrar com Google.");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="E-mail" icon={<Mail className="size-4" />}>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" />
      </Field>
      <Field label="Senha" icon={<Lock className="size-4" />}>
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
          />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
        Entrar
      </Button>
      <div className="relative py-1 text-center text-xs text-muted-foreground">
        <span className="bg-card px-2">ou</span>
        <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={onGoogle}>
        Continuar com Google
      </Button>
    </form>
  );
}

function SignupForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "", farm_name: "", phone: "" });
  const [accept, setAccept] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const passStrong = passwordRegex.test(form.password);
  const match = form.password && form.password === form.confirm;
  const nameOk = form.full_name.trim().length >= 2;
  const canSubmit = nameOk && emailValid && passStrong && match && accept && !loading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin + "/auth",
        data: {
          full_name: form.full_name.trim(),
          farm_name: form.farm_name.trim() || null,
          phone: form.phone.trim() || null,
          terms_accepted: true,
          terms_version: TERMS_VERSION,
          privacy_policy_version: PRIVACY_POLICY_VERSION,
        },
      },
    });

    setLoading(false);
    if (error) {
      toast.error(translateAuthError(error.message));
      return;
    }
    toast.success("Cadastro realizado com sucesso!");
    onDone();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Nome completo" icon={<UserIcon className="size-4" />}>
        <Input required value={form.full_name} onChange={upd("full_name")} placeholder="Seu nome" />
      </Field>
      <Field label="E-mail" icon={<Mail className="size-4" />}>
        <Input type="email" required value={form.email} onChange={upd("email")} placeholder="seu@email.com" />
      </Field>
      <Field label="Senha" icon={<Lock className="size-4" />}>
        <div className="relative">
          <Input type={show ? "text" : "password"} required value={form.password} onChange={upd("password")} placeholder="Mínimo 8 caracteres" />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {form.password && !passStrong && (
          <p className="mt-1 text-xs text-destructive">Use letra maiúscula, minúscula, número e caractere especial.</p>
        )}
      </Field>
      <Field label="Confirmação da senha" icon={<Lock className="size-4" />}>
        <Input type={show ? "text" : "password"} required value={form.confirm} onChange={upd("confirm")} />
        {form.confirm && !match && <p className="mt-1 text-xs text-destructive">As senhas não coincidem.</p>}
      </Field>
      <Field label="Propriedade / Fazenda (opcional)" icon={<Building2 className="size-4" />}>
        <Input value={form.farm_name} onChange={upd("farm_name")} />
      </Field>
      <Field label="Telefone (opcional)" icon={<Phone className="size-4" />}>
        <Input value={form.phone} onChange={upd("phone")} />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={accept} onCheckedChange={(v) => setAccept(Boolean(v))} aria-label="Aceito os termos e a política" />
        <span className="text-muted-foreground">
          Li e aceito os{" "}
          <Link
            to="/termos-de-uso"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link
            to="/politica-de-privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            Política de Privacidade
          </Link>{" "}
          do Lacto Control.
        </span>
      </label>

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
        Criar cadastro
      </Button>
    </form>
  );
}

function ForgotForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    toast.success("Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.");
    onDone();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Informe seu e-mail para receber o link de redefinição de senha.
      </p>
      <Field label="E-mail" icon={<Mail className="size-4" />}>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
      </Field>
      <Button type="submit" className="w-full" disabled={loading || !email}>
        {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
        Enviar link de recuperação
      </Button>
      <Link to="/auth" search={{ mode: "login" }} className="block text-center text-sm text-primary hover:underline">
        Voltar ao login
      </Link>
    </form>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2 text-sm">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "E-mail ou senha inválidos.";
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already")) return "Este e-mail já está cadastrado.";
  if (m.includes("email not confirmed")) return "E-mail ainda não confirmado.";
  if (m.includes("password") && m.includes("weak")) return "Senha muito fraca. Use pelo menos 8 caracteres com letra maiúscula, minúscula, número e caractere especial.";
  if (m.includes("pwned") || m.includes("compromised")) return "Esta senha aparece em vazamentos conhecidos. Escolha outra.";
  if (m.includes("network")) return "Falha de conexão. Verifique sua internet e tente novamente.";
  return "Não foi possível concluir a operação. Tente novamente.";
}
