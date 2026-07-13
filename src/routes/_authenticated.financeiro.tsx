import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { notify } from "@/lib/notify";
import { supabase, usePropertyId, useCowsList, usePropertyQuery, fmtDate, brl, monthNames } from "@/lib/modules-shared";
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Lacto Control" },
      { name: "description", content: "Receitas, despesas, custo por vaca e fluxo de caixa." },
    ],
  }),
  component: FinanceiroPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  racao: "Ração",
  medicamento: "Medicamento",
  mao_de_obra: "Mão de obra",
  energia: "Energia",
  manutencao: "Manutenção",
  sanidade: "Sanidade",
  reproducao: "Reprodução",
  outros: "Outros",
};

function FinanceiroPage() {
  return (
    <AppLayout>
      <PageHeader title="Financeiro" description="Receitas da venda de leite, despesas, custo por vaca e fluxo de caixa." />
      <Tabs defaultValue="receitas">
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="receitas"><TrendingUp className="mr-2 size-4" />Receitas</TabsTrigger>
          <TabsTrigger value="despesas"><TrendingDown className="mr-2 size-4" />Despesas</TabsTrigger>
          <TabsTrigger value="custo"><DollarSign className="mr-2 size-4" />Custo por vaca</TabsTrigger>
          <TabsTrigger value="fluxo"><BarChart3 className="mr-2 size-4" />Fluxo e DRE</TabsTrigger>
        </TabsList>
        <TabsContent value="receitas"><ReceitasTab /></TabsContent>
        <TabsContent value="despesas"><DespesasTab /></TabsContent>
        <TabsContent value="custo"><CustoTab /></TabsContent>
        <TabsContent value="fluxo"><FluxoTab /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

/* ---------------- RECEITAS ---------------- */
function ReceitasTab() {
  const propertyId = usePropertyId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({
    sale_date: now.toISOString().slice(0, 10),
    reference_month: String(now.getMonth() + 1),
    reference_year: String(now.getFullYear()),
    buyer: "", liters: "", price_per_liter: "", invoice_number: "", notes: "",
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const q = usePropertyQuery(
    ["milk_sales"],
    async (pid) => (await supabase.from("milk_sales").select("*").eq("property_id", pid).order("sale_date", { ascending: false }).limit(500)).data ?? [],
    propertyId,
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!propertyId || !form.liters || !form.price_per_liter) throw new Error("Preencha litros e preço.");
      const liters = Number(form.liters);
      const price = Number(form.price_per_liter);
      const { error } = await supabase.from("milk_sales").insert({
        property_id: propertyId, sale_date: form.sale_date,
        reference_month: Number(form.reference_month),
        reference_year: Number(form.reference_year),
        buyer: form.buyer || null, liters, price_per_liter: price,
        total_amount: liters * price,
        invoice_number: form.invoice_number || null, notes: form.notes || null,
        created_by: (await supabase.auth.getUser()).data.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { notify.success("Receita registrada"); qc.invalidateQueries({ queryKey: ["milk_sales"] }); setOpen(false); },
    onError: (e: Error) => notify.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("milk_sales").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milk_sales"] }),
  });

  const totalRec = (q.data ?? []).reduce((s: number, r: any) => s + Number(r.total_amount ?? 0), 0);
  const totalLitros = (q.data ?? []).reduce((s: number, r: any) => s + Number(r.liters ?? 0), 0);
  const precoMedio = totalLitros > 0 ? totalRec / totalLitros : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KPI label="Receita total" value={brl(totalRec)} />
        <KPI label="Litros vendidos" value={totalLitros.toLocaleString("pt-BR")} />
        <KPI label="Preço médio /L" value={brl(precoMedio)} />
      </div>
      <Card className="p-4">
        <div className="mb-3 flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />Nova venda</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar venda de leite</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Data</Label><Input type="date" value={form.sale_date} onChange={(e) => set("sale_date", e.target.value)} /></div>
                  <div><Label>Mês ref.</Label>
                    <Select value={form.reference_month} onValueChange={(v) => set("reference_month", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Ano ref.</Label><Input type="number" value={form.reference_year} onChange={(e) => set("reference_year", e.target.value)} /></div>
                </div>
                <div><Label>Comprador / laticínio</Label><Input value={form.buyer} onChange={(e) => set("buyer", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Litros</Label><Input type="number" step="0.01" value={form.liters} onChange={(e) => set("liters", e.target.value)} /></div>
                  <div><Label>Preço /L (R$)</Label><Input type="number" step="0.0001" value={form.price_per_liter} onChange={(e) => set("price_per_liter", e.target.value)} /></div>
                </div>
                <div><Label>Nota fiscal</Label><Input value={form.invoice_number} onChange={(e) => set("invoice_number", e.target.value)} /></div>
                <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
              </div>
              <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {q.data && q.data.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Nenhuma receita registrada" />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Ref.</TableHead><TableHead>Comprador</TableHead><TableHead>Litros</TableHead><TableHead>Preço/L</TableHead><TableHead>Total</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {q.data?.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.sale_date)}</TableCell>
                  <TableCell>{monthNames[r.reference_month - 1]}/{r.reference_year}</TableCell>
                  <TableCell>{r.buyer ?? "—"}</TableCell>
                  <TableCell>{Number(r.liters).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{brl(Number(r.price_per_liter))}</TableCell>
                  <TableCell className="font-semibold">{brl(Number(r.total_amount))}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="size-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

/* ---------------- DESPESAS ---------------- */
function DespesasTab() {
  const propertyId = usePropertyId();
  const cows = useCowsList();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({
    expense_date: now.toISOString().slice(0, 10),
    category: "racao", description: "", amount: "", quantity: "",
    supplier: "", invoice_number: "", cow_id: "",
    reference_month: String(now.getMonth() + 1),
    reference_year: String(now.getFullYear()), notes: "",
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const q = usePropertyQuery(
    ["expenses"],
    async (pid) => (await supabase.from("expenses").select("*").eq("property_id", pid).order("expense_date", { ascending: false }).limit(1000)).data ?? [],
    propertyId,
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!propertyId || !form.description || !form.amount) throw new Error("Preencha descrição e valor.");
      const { error } = await supabase.from("expenses").insert({
        property_id: propertyId, expense_date: form.expense_date,
        category: form.category as any, description: form.description,
        amount: Number(form.amount),
        quantity: form.quantity ? Number(form.quantity) : null,
        supplier: form.supplier || null, invoice_number: form.invoice_number || null,
        cow_id: form.cow_id || null,
        reference_month: Number(form.reference_month),
        reference_year: Number(form.reference_year),
        notes: form.notes || null,
        created_by: (await supabase.auth.getUser()).data.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { notify.success("Despesa registrada"); qc.invalidateQueries({ queryKey: ["expenses"] }); setOpen(false); },
    onError: (e: Error) => notify.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("expenses").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    (q.data ?? []).forEach((r: any) => {
      map.set(r.category, (map.get(r.category) ?? 0) + Number(r.amount ?? 0));
    });
    return Array.from(map.entries()).map(([k, v]) => ({ name: CATEGORY_LABELS[k] ?? k, value: v }));
  }, [q.data]);

  const total = (q.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KPI label="Total despesas" value={brl(total)} />
        <KPI label="Registros" value={q.data?.length ?? 0} />
        <KPI label="Categorias ativas" value={byCategory.length} />
      </div>
      {byCategory.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Despesas por categoria</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v: any) => brl(Number(v))} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      <Card className="p-4">
        <div className="mb-3 flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />Nova despesa</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-auto">
              <DialogHeader><DialogTitle>Registrar despesa</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Data</Label><Input type="date" value={form.expense_date} onChange={(e) => set("expense_date", e.target.value)} /></div>
                  <div><Label>Categoria</Label>
                    <Select value={form.category} onValueChange={(v) => set("category", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></div>
                  <div><Label>Quantidade</Label><Input type="number" step="0.001" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Fornecedor</Label><Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} /></div>
                  <div><Label>Nota fiscal</Label><Input value={form.invoice_number} onChange={(e) => set("invoice_number", e.target.value)} /></div>
                </div>
                <div><Label>Alocar a uma vaca (opcional)</Label>
                  <Select value={form.cow_id} onValueChange={(v) => set("cow_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Rateio geral" /></SelectTrigger>
                    <SelectContent>{cows.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.brinco})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Mês ref.</Label>
                    <Select value={form.reference_month} onValueChange={(v) => set("reference_month", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{monthNames.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Ano ref.</Label><Input type="number" value={form.reference_year} onChange={(e) => set("reference_year", e.target.value)} /></div>
                </div>
                <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
              </div>
              <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {q.data && q.data.length === 0 ? (
          <EmptyState icon={TrendingDown} title="Nenhuma despesa registrada" />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Categoria</TableHead><TableHead>Descrição</TableHead><TableHead>Vaca</TableHead><TableHead>Valor</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {q.data?.map((r: any) => {
                const cow = cows.find((c) => c.id === r.cow_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{fmtDate(r.expense_date)}</TableCell>
                    <TableCell>{CATEGORY_LABELS[r.category] ?? r.category}</TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell>{cow ? `${cow.nome}` : <span className="text-muted-foreground">Geral</span>}</TableCell>
                    <TableCell className="font-semibold">{brl(Number(r.amount))}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="size-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

/* ---------------- CUSTO POR VACA ---------------- */
function CustoTab() {
  const propertyId = usePropertyId();
  const cows = useCowsList();

  const expenses = usePropertyQuery(
    ["expenses", "all"],
    async (pid) => (await supabase.from("expenses").select("cow_id,amount").eq("property_id", pid)).data ?? [],
    propertyId,
  );
  const sales = usePropertyQuery(
    ["milk_sales", "all"],
    async (pid) => (await supabase.from("milk_sales").select("total_amount,liters").eq("property_id", pid)).data ?? [],
    propertyId,
  );
  const productions = usePropertyQuery(
    ["milk_productions", "all"],
    async (pid) => (await supabase.from("milk_productions").select("cow_id,total_liters").eq("property_id", pid)).data ?? [],
    propertyId,
  );

  const table = useMemo(() => {
    const exp = expenses.data ?? [];
    const prod = productions.data ?? [];
    const totalGeneral = exp.filter((e: any) => !e.cow_id).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
    const directByCow = new Map<string, number>();
    exp.filter((e: any) => e.cow_id).forEach((r: any) => {
      directByCow.set(r.cow_id, (directByCow.get(r.cow_id) ?? 0) + Number(r.amount ?? 0));
    });
    const litersByCow = new Map<string, number>();
    prod.forEach((r: any) => {
      litersByCow.set(r.cow_id, (litersByCow.get(r.cow_id) ?? 0) + Number(r.total_liters ?? 0));
    });
    const totalLiters = Array.from(litersByCow.values()).reduce((s, v) => s + v, 0);

    const salesTotal = (sales.data ?? []).reduce((s: number, r: any) => s + Number(r.total_amount ?? 0), 0);
    const salesLiters = (sales.data ?? []).reduce((s: number, r: any) => s + Number(r.liters ?? 0), 0);
    const avgPrice = salesLiters > 0 ? salesTotal / salesLiters : 0;

    return cows.map((cow) => {
      const direct = directByCow.get(cow.id) ?? 0;
      const liters = litersByCow.get(cow.id) ?? 0;
      const share = totalLiters > 0 ? (liters / totalLiters) * totalGeneral : 0;
      const cost = direct + share;
      const revenue = liters * avgPrice;
      const margin = revenue - cost;
      return { cow, direct, share, liters, cost, revenue, margin };
    }).sort((a, b) => b.margin - a.margin);
  }, [cows, expenses.data, productions.data, sales.data]);

  return (
    <Card className="p-4">
      <p className="mb-3 text-sm text-muted-foreground">
        Custo direto = despesas alocadas à vaca. Rateio = despesas gerais proporcional aos litros produzidos. Receita estimada = litros × preço médio de venda.
      </p>
      {table.length === 0 ? (
        <EmptyState icon={DollarSign} title="Cadastre vacas para ver o custo individual" />
      ) : (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Vaca</TableHead><TableHead>Litros</TableHead>
            <TableHead>Custo direto</TableHead><TableHead>Rateio</TableHead>
            <TableHead>Custo total</TableHead><TableHead>Receita est.</TableHead>
            <TableHead>Margem</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {table.map((r) => (
              <TableRow key={r.cow.id}>
                <TableCell className="font-medium">{r.cow.nome} <span className="text-muted-foreground">({r.cow.brinco})</span></TableCell>
                <TableCell>{r.liters.toLocaleString("pt-BR")}</TableCell>
                <TableCell>{brl(r.direct)}</TableCell>
                <TableCell>{brl(r.share)}</TableCell>
                <TableCell className="font-semibold">{brl(r.cost)}</TableCell>
                <TableCell>{brl(r.revenue)}</TableCell>
                <TableCell className={r.margin >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-destructive"}>{brl(r.margin)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

/* ---------------- FLUXO DE CAIXA ---------------- */
function FluxoTab() {
  const propertyId = usePropertyId();
  const sales = usePropertyQuery(
    ["milk_sales", "flow"],
    async (pid) => (await supabase.from("milk_sales").select("reference_month,reference_year,total_amount").eq("property_id", pid)).data ?? [],
    propertyId,
  );
  const expenses = usePropertyQuery(
    ["expenses", "flow"],
    async (pid) => (await supabase.from("expenses").select("reference_month,reference_year,expense_date,amount,category").eq("property_id", pid)).data ?? [],
    propertyId,
  );

  const data = useMemo(() => {
    const map = new Map<string, { key: string; receitas: number; despesas: number; resultado: number; label: string }>();
    const bump = (year: number, month: number, kind: "r" | "d", value: number) => {
      if (!year || !month) return;
      const key = `${year}-${String(month).padStart(2, "0")}`;
      const cur = map.get(key) ?? { key, receitas: 0, despesas: 0, resultado: 0, label: `${monthNames[month - 1]}/${String(year).slice(2)}` };
      if (kind === "r") cur.receitas += value; else cur.despesas += value;
      cur.resultado = cur.receitas - cur.despesas;
      map.set(key, cur);
    };
    (sales.data ?? []).forEach((r: any) => bump(r.reference_year, r.reference_month, "r", Number(r.total_amount ?? 0)));
    (expenses.data ?? []).forEach((r: any) => {
      const y = r.reference_year ?? (r.expense_date ? Number(r.expense_date.slice(0, 4)) : null);
      const m = r.reference_month ?? (r.expense_date ? Number(r.expense_date.slice(5, 7)) : null);
      bump(y, m, "d", Number(r.amount ?? 0));
    });
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [sales.data, expenses.data]);

  const totRec = data.reduce((s, r) => s + r.receitas, 0);
  const totDesp = data.reduce((s, r) => s + r.despesas, 0);
  const resultado = totRec - totDesp;
  const margem = totRec > 0 ? (resultado / totRec) * 100 : 0;

  const dre = useMemo(() => {
    const byCat = new Map<string, number>();
    (expenses.data ?? []).forEach((r: any) => {
      byCat.set(r.category, (byCat.get(r.category) ?? 0) + Number(r.amount ?? 0));
    });
    return Array.from(byCat.entries()).map(([k, v]) => ({ cat: CATEGORY_LABELS[k] ?? k, value: v }))
      .sort((a, b) => b.value - a.value);
  }, [expenses.data]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label="Receitas" value={brl(totRec)} />
        <KPI label="Despesas" value={brl(totDesp)} />
        <KPI label="Resultado" value={brl(resultado)} />
        <KPI label="Margem" value={`${margem.toFixed(1)}%`} />
      </div>
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Fluxo mensal</h3>
        {data.length === 0 ? (
          <EmptyState icon={BarChart3} title="Sem movimentações registradas" description="Cadastre receitas e despesas para ver o fluxo mensal." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(v: any) => brl(Number(v))} />
                <Legend />
                <Bar dataKey="receitas" name="Receitas" fill="hsl(142 71% 45%)" />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(0 72% 51%)" />
                <Bar dataKey="resultado" name="Resultado" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">DRE simplificada</h3>
        <Table>
          <TableBody>
            <TableRow><TableCell className="font-semibold">Receita bruta</TableCell><TableCell className="text-right font-semibold text-emerald-600">{brl(totRec)}</TableCell></TableRow>
            {dre.map((d) => (
              <TableRow key={d.cat}>
                <TableCell className="pl-8 text-muted-foreground">(–) {d.cat}</TableCell>
                <TableCell className="text-right text-destructive">{brl(d.value)}</TableCell>
              </TableRow>
            ))}
            <TableRow><TableCell className="font-semibold">Total despesas</TableCell><TableCell className="text-right font-semibold text-destructive">{brl(totDesp)}</TableCell></TableRow>
            <TableRow><TableCell className="text-base font-bold">Resultado líquido</TableCell><TableCell className={`text-right text-base font-bold ${resultado >= 0 ? "text-emerald-600" : "text-destructive"}`}>{brl(resultado)}</TableCell></TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold sm:text-2xl">{value}</div>
    </Card>
  );
}
