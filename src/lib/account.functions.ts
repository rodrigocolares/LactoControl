import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const inputSchema = z.object({
  password: z.string().min(1, "Senha obrigatória"),
  reason: z.string().max(500).optional(),
});

/**
 * Encerra definitivamente a conta do usuário autenticado.
 * - Reautentica com a senha atual
 * - Exclui dados dependentes da propriedade
 * - Exclui perfil, propriedade e usuário do auth
 * Retorna erro genérico em caso de falha.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as { email?: string } | null)?.email;

    if (!email) {
      throw new Error("Sessão inválida.");
    }

    // 1) Reautenticação: valida a senha atual sem afetar a sessão do usuário.
    const verifier = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
    );
    const { error: authError } = await verifier.auth.signInWithPassword({ email, password: data.password });
    if (authError) {
      throw new Error("Senha incorreta.");
    }
    await verifier.auth.signOut().catch(() => {});

    // 2) Localiza a propriedade do usuário (via RLS, então já é a própria).
    const { data: props, error: propErr } = await supabase
      .from("properties")
      .select("id")
      .eq("owner_id", userId);
    if (propErr) {
      console.error("[deleteMyAccount] property lookup failed", propErr);
      throw new Error("Falha ao localizar propriedade.");
    }
    const propertyIds = (props ?? []).map((p) => p.id);

    // 3) Admin client — apenas dentro do handler.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const step = async (label: string, thenable: PromiseLike<{ error: unknown }>) => {
      try {
        const r = await thenable;
        if (r.error) {
          console.error(`[deleteMyAccount] ${label} error`, r.error);
          throw new Error(`Falha ao excluir: ${label}`);
        }
      } catch (e) {
        console.error(`[deleteMyAccount] ${label} threw`, e);
        throw new Error(`Falha ao excluir: ${label}`);
      }
    };

    if (propertyIds.length > 0) {
      await step(
        "aplicações vacinais",
        supabaseAdmin.from("vaccination_records").delete().in("property_id", propertyIds),
      );
      await step(
        "produções de leite",
        supabaseAdmin.from("milk_productions").delete().in("property_id", propertyIds),
      );
      await step("vacinas", supabaseAdmin.from("vaccines").delete().in("property_id", propertyIds));
      await step("vacas", supabaseAdmin.from("cows").delete().in("property_id", propertyIds));
      await step(
        "migrações",
        supabaseAdmin.from("data_migrations").delete().in("property_id", propertyIds),
      );
    }

    // Perfil (FK -> auth.users) — antes de excluir a propriedade para não bloquear vínculo.
    await step("perfil", supabaseAdmin.from("profiles").delete().eq("id", userId));

    if (propertyIds.length > 0) {
      await step("propriedade", supabaseAdmin.from("properties").delete().in("id", propertyIds));
    }

    // Registro final de encerramento (sem dados pessoais)
    try {
      await supabaseAdmin.from("audit_logs").insert({
        property_id: propertyIds[0] ?? null,
        user_id: null,
        action: "account_deleted",
        entity_type: "auth.users",
        entity_id: null,
        old_data: null,
        new_data: {
          reason: data.reason ?? null,
          deleted_at: new Date().toISOString(),
        },
      });
    } catch (e) {
      console.error("[deleteMyAccount] final audit log failed", e);
    }

    // Limpa logs anteriores vinculados ao usuário e/ou propriedade
    if (propertyIds.length > 0) {
      await step(
        "logs de auditoria",
        supabaseAdmin
          .from("audit_logs")
          .delete()
          .or(`user_id.eq.${userId},property_id.in.(${propertyIds.join(",")})`),
      );
    } else {
      await step("logs de auditoria", supabaseAdmin.from("audit_logs").delete().eq("user_id", userId));
    }

    // Exclui o usuário do Auth
    const { error: delUserErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delUserErr) {
      console.error("[deleteMyAccount] auth deleteUser error", delUserErr);
      throw new Error("Falha ao excluir usuário.");
    }

    return { ok: true };
  });
