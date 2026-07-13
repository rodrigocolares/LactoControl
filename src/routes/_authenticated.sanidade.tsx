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
import { supabase, usePropertyId, useCowsList, usePropertyQuery, fmtDate, brl } from "@/lib/modules-shared";
import { Plus, Trash2, Pill, Package, Stethoscope, Microscope, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sanidade")({
  head: () => ({
    meta: [
      { title: "Sanidade — Lacto Control" },
      { name: "description", content: "Ocorrências clínicas, medicamentos, exames e visitas veterinárias." },
    ],
  }),
  component: SanidadePage,
});

function SanidadePage() {
  return (
    <AppLayout>
      <PageHeader title="Sanidade" description="Ocorrências clínicas, medicamentos, exames e visitas veterinárias." />
      <Tabs defaultValue="ocorrencias">
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="ocorrencias"><Stethoscope className="mr-2 size-4" />Ocorrências</TabsTrigger>
          <TabsTrigger value="medicamentos"><Pill className="mr-2 size-4" />Medicamentos</TabsTrigger>
          <TabsTrigger value="estoque"><Package className="mr-2 size-4" />Estoque</TabsTrigger>
          <TabsTrigger value="exames"><Microscope className="mr-2 size-4" />Exames</TabsTrigger>
          <TabsTrigger value="visitas"><User className="mr-2 size-4" />Visitas</TabsTrigger>
        </TabsList>
        <TabsContent value="ocorrencias"><OcorrenciasTab /></TabsContent>
        <TabsContent value="medicamentos"><MedicamentosTab /></TabsContent>
        <TabsContent value="estoque"><EstoqueTab /></TabsContent>
        <TabsContent value="exames"><ExamesTab /></TabsContent>
        <TabsContent value="visitas"><VisitasTab /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

/* ---------------- OCORRÊNCIAS CLÍNICAS ---------------- */
function OcorrenciasTab() {
  const propertyId = usePropertyId();
  const cows = useCowsList();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    cow_id: "", event_date: new Date().toISOString().slice(0, 10),
    disease: "", symptoms: "", diagnosis: "", treatment: "",
    milk_withdrawal_until: "", meat_withdrawal_until: "", responsible_person: "",
    cost: "", resolved: false, notes: "",
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const q = usePropertyQuery(
    ["clinical_events"],
    async (pid) => (await supabase.from("clinical_events").select("*").eq("property_id", pid).order("event_date", { ascending: false }).limit(500)).data ?? [],
    propertyId,
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!propertyId || !form.cow_id || !form.disease) throw new Error("Preencha vaca e doença.");
      const { error } = await supabase.from("clinical_events").insert({
        property_id: propertyId, cow_id: form.cow_id, event_date: form.event_date,
        disease: form.disease, symptoms: form.symptoms || null, diagnosis: form.diagnosis || null,
        treatment: form.treatment || null,
        milk_withdrawal_until: form.milk_withdrawal_until || null,
        meat_withdrawal_until: form.meat_withdrawal_until || null,
        responsible_person: form.responsible_person || null,
        cost: form.cost ? Number(form.cost) : null,
        resolved: !!form.resolved, notes: form.notes || null,
        created_by: (await supabase.auth.getUser()).data.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { notify.success("Ocorrência registrada"); qc.invalidateQueries({ queryKey: ["clinical_events"] }); setOpen(false); },
    onError: (e: Error) => notify.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("clinical_events").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clinical_events"] }),
  });

  const abertas = (q.data ?? []).filter((r: any) => !r.resolved).length;
  const emCarencia = (q.data ?? []).filter((r: any) => r.milk_withdrawal_until && new Date(r.milk_withdrawal_until) >= new Date()).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label="Ocorrências" value={q.data?.length ?? 0} />
        <KPI label="Em aberto" value={abertas} />
        <KPI label="Vacas em carência (leite)" value={emCarencia} />
        <KPI label="Custo total" value={brl((q.data ?? []).reduce((s: number, r: any) => s + Number(r.cost ?? 0), 0))} />
      </div>
      <Card className="p-4">
        <div className="mb-3 flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />Nova ocorrência</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-auto">
              <DialogHeader><DialogTitle>Registrar ocorrência clínica</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Vaca</Label>
                  <Select value={form.cow_id} onValueChange={(v) => set("cow_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{cows.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.brinco})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Data</Label><Input type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} /></div>
                  <div><Label>Doença</Label><Input value={form.disease} onChange={(e) => set("disease", e.target.value)} placeholder="Mastite, retenção de placenta..." /></div>
                </div>
                <div><Label>Sintomas</Label><Textarea rows={2} value={form.symptoms} onChange={(e) => set("symptoms", e.target.value)} /></div>
                <div><Label>Diagnóstico</Label><Textarea rows={2} value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} /></div>
                <div><Label>Tratamento</Label><Textarea rows={2} value={form.treatment} onChange={(e) => set("treatment", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Carência leite até</Label><Input type="date" value={form.milk_withdrawal_until} onChange={(e) => set("milk_withdrawal_until", e.target.value)} /></div>
                  <div><Label>Carência carne até</Label><Input type="date" value={form.meat_withdrawal_until} onChange={(e) => set("meat_withdrawal_until", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Responsável</Label><Input value={form.responsible_person} onChange={(e) => set("responsible_person", e.target.value)} /></div>
                  <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => set("cost", e.target.value)} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.resolved} onChange={(e) => set("resolved", e.target.checked)} />
                  Resolvida
                </label>
                <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
              </div>
              <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {q.data && q.data.length === 0 ? (
          <EmptyState icon={Stethoscope} title="Nenhuma ocorrência clínica" />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Vaca</TableHead><TableHead>Doença</TableHead><TableHead>Carência leite</TableHead><TableHead>Status</TableHead><TableHead>Custo</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {q.data?.map((r: any) => {
                const cow = cows.find((c) => c.id === r.cow_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{fmtDate(r.event_date)}</TableCell>
                    <TableCell>{cow ? `${cow.nome} (${cow.brinco})` : "—"}</TableCell>
                    <TableCell>{r.disease}</TableCell>
                    <TableCell>{fmtDate(r.milk_withdrawal_until)}</TableCell>
                    <TableCell>{r.resolved ? "Resolvida" : "Em aberto"}</TableCell>
                    <TableCell>{r.cost != null ? brl(Number(r.cost)) : "—"}</TableCell>
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

/* ---------------- MEDICAMENTOS ---------------- */
function MedicamentosTab() {
  const propertyId = usePropertyId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", active_ingredient: "", manufacturer: "", unit: "ml",
    withdrawal_milk_days: "0", withdrawal_meat_days: "0", notes: "",
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const q = usePropertyQuery(
    ["medications"],
    async (pid) => (await supabase.from("medications").select("*").eq("property_id", pid).order("name")).data ?? [],
    propertyId,
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!propertyId || !form.name) throw new Error("Informe o nome do medicamento.");
      const { error } = await supabase.from("medications").insert({
        property_id: propertyId, name: form.name,
        active_ingredient: form.active_ingredient || null, manufacturer: form.manufacturer || null,
        unit: form.unit as any,
        withdrawal_milk_days: Number(form.withdrawal_milk_days) || 0,
        withdrawal_meat_days: Number(form.withdrawal_meat_days) || 0,
        notes: form.notes || null, active: true,
        created_by: (await supabase.auth.getUser()).data.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { notify.success("Medicamento cadastrado"); qc.invalidateQueries({ queryKey: ["medications"] }); setOpen(false); },
    onError: (e: Error) => notify.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("medications").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medications"] }),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />Novo medicamento</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar medicamento</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nome comercial</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
              <div><Label>Princípio ativo</Label><Input value={form.active_ingredient} onChange={(e) => set("active_ingredient", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Fabricante</Label><Input value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} /></div>
                <div><Label>Unidade</Label>
                  <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["ml","g","mg","kg","l","dose","comprimido"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Carência leite (dias)</Label><Input type="number" value={form.withdrawal_milk_days} onChange={(e) => set("withdrawal_milk_days", e.target.value)} /></div>
                <div><Label>Carência carne (dias)</Label><Input type="number" value={form.withdrawal_meat_days} onChange={(e) => set("withdrawal_meat_days", e.target.value)} /></div>
              </div>
              <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {q.data && q.data.length === 0 ? (
        <EmptyState icon={Pill} title="Nenhum medicamento cadastrado" />
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Princípio ativo</TableHead><TableHead>Fabricante</TableHead><TableHead>Unidade</TableHead><TableHead>Car. leite</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {q.data?.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.active_ingredient ?? "—"}</TableCell>
                <TableCell>{r.manufacturer ?? "—"}</TableCell>
                <TableCell>{r.unit}</TableCell>
                <TableCell>{r.withdrawal_milk_days}d</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="size-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

/* ---------------- ESTOQUE ---------------- */
function EstoqueTab() {
  const propertyId = usePropertyId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    medication_id: "", entry_date: new Date().toISOString().slice(0, 10),
    quantity: "", unit_cost: "", batch_number: "", expiration_date: "", supplier: "", notes: "",
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const meds = usePropertyQuery(
    ["medications"],
    async (pid) => (await supabase.from("medications").select("id,name,unit").eq("property_id", pid).order("name")).data ?? [],
    propertyId,
  );
  const q = usePropertyQuery(
    ["medication_stock"],
    async (pid) => (await supabase.from("medication_stock_entries").select("*").eq("property_id", pid).order("entry_date", { ascending: false }).limit(500)).data ?? [],
    propertyId,
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!propertyId || !form.medication_id || !form.quantity) throw new Error("Preencha medicamento e quantidade.");
      const { error } = await supabase.from("medication_stock_entries").insert({
        property_id: propertyId, medication_id: form.medication_id,
        entry_date: form.entry_date, quantity: Number(form.quantity),
        unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
        batch_number: form.batch_number || null, expiration_date: form.expiration_date || null,
        supplier: form.supplier || null, notes: form.notes || null,
        created_by: (await supabase.auth.getUser()).data.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { notify.success("Entrada registrada"); qc.invalidateQueries({ queryKey: ["medication_stock"] }); setOpen(false); },
    onError: (e: Error) => notify.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("medication_stock_entries").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["medication_stock"] }),
  });

  const summary = useMemo(() => {
    const map = new Map<string, { name: string; unit: string; qty: number; cost: number }>();
    (q.data ?? []).forEach((r: any) => {
      const med = meds.data?.find((m: any) => m.id === r.medication_id);
      if (!med) return;
      const cur = map.get(r.medication_id) ?? { name: med.name, unit: med.unit, qty: 0, cost: 0 };
      cur.qty += Number(r.quantity ?? 0);
      cur.cost += Number(r.quantity ?? 0) * Number(r.unit_cost ?? 0);
      map.set(r.medication_id, cur);
    });
    return Array.from(map.values());
  }, [q.data, meds.data]);

  return (
    <div className="space-y-4">
      {summary.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Estoque consolidado</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Medicamento</TableHead><TableHead>Quantidade</TableHead><TableHead>Valor total</TableHead></TableRow></TableHeader>
            <TableBody>
              {summary.map((s) => (
                <TableRow key={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.qty.toLocaleString("pt-BR")} {s.unit}</TableCell>
                  <TableCell>{brl(s.cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <Card className="p-4">
        <div className="mb-3 flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />Nova entrada</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Entrada de estoque</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Medicamento</Label>
                  <Select value={form.medication_id} onValueChange={(v) => set("medication_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{meds.data?.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Data</Label><Input type="date" value={form.entry_date} onChange={(e) => set("entry_date", e.target.value)} /></div>
                  <div><Label>Quantidade</Label><Input type="number" step="0.001" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Custo unitário (R$)</Label><Input type="number" step="0.0001" value={form.unit_cost} onChange={(e) => set("unit_cost", e.target.value)} /></div>
                  <div><Label>Lote</Label><Input value={form.batch_number} onChange={(e) => set("batch_number", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Validade</Label><Input type="date" value={form.expiration_date} onChange={(e) => set("expiration_date", e.target.value)} /></div>
                  <div><Label>Fornecedor</Label><Input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} /></div>
                </div>
                <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
              </div>
              <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {q.data && q.data.length === 0 ? (
          <EmptyState icon={Package} title="Nenhuma entrada de estoque" />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Medicamento</TableHead><TableHead>Qtde.</TableHead><TableHead>Custo unit.</TableHead><TableHead>Lote</TableHead><TableHead>Validade</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {q.data?.map((r: any) => {
                const med = meds.data?.find((m: any) => m.id === r.medication_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{fmtDate(r.entry_date)}</TableCell>
                    <TableCell>{med?.name ?? "—"}</TableCell>
                    <TableCell>{Number(r.quantity).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{r.unit_cost != null ? brl(Number(r.unit_cost)) : "—"}</TableCell>
                    <TableCell>{r.batch_number ?? "—"}</TableCell>
                    <TableCell>{fmtDate(r.expiration_date)}</TableCell>
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

/* ---------------- EXAMES ---------------- */
function ExamesTab() {
  const propertyId = usePropertyId();
  const cows = useCowsList();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    cow_id: "", exam_date: new Date().toISOString().slice(0, 10),
    exam_type: "", result: "", ccs_value: "", laboratory: "", cost: "", notes: "",
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const q = usePropertyQuery(
    ["lab_exams"],
    async (pid) => (await supabase.from("lab_exams").select("*").eq("property_id", pid).order("exam_date", { ascending: false }).limit(500)).data ?? [],
    propertyId,
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!propertyId || !form.exam_type) throw new Error("Informe o tipo do exame.");
      const { error } = await supabase.from("lab_exams").insert({
        property_id: propertyId, cow_id: form.cow_id || null,
        exam_date: form.exam_date, exam_type: form.exam_type,
        result: form.result || null,
        ccs_value: form.ccs_value ? Number(form.ccs_value) : null,
        laboratory: form.laboratory || null,
        cost: form.cost ? Number(form.cost) : null,
        notes: form.notes || null,
        created_by: (await supabase.auth.getUser()).data.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { notify.success("Exame registrado"); qc.invalidateQueries({ queryKey: ["lab_exams"] }); setOpen(false); },
    onError: (e: Error) => notify.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("lab_exams").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab_exams"] }),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />Novo exame</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar exame</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Vaca (opcional)</Label>
                <Select value={form.cow_id} onValueChange={(v) => set("cow_id", v)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{cows.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.brinco})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={form.exam_date} onChange={(e) => set("exam_date", e.target.value)} /></div>
                <div><Label>Tipo</Label><Input value={form.exam_type} onChange={(e) => set("exam_type", e.target.value)} placeholder="Brucelose, TB, CCS..." /></div>
              </div>
              <div><Label>Resultado</Label><Textarea rows={2} value={form.result} onChange={(e) => set("result", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>CCS (x1000/mL)</Label><Input type="number" value={form.ccs_value} onChange={(e) => set("ccs_value", e.target.value)} /></div>
                <div><Label>Laboratório</Label><Input value={form.laboratory} onChange={(e) => set("laboratory", e.target.value)} /></div>
              </div>
              <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => set("cost", e.target.value)} /></div>
              <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {q.data && q.data.length === 0 ? (
        <EmptyState icon={Microscope} title="Nenhum exame registrado" />
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Vaca</TableHead><TableHead>Tipo</TableHead><TableHead>Resultado</TableHead><TableHead>CCS</TableHead><TableHead>Lab</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {q.data?.map((r: any) => {
              const cow = cows.find((c) => c.id === r.cow_id);
              return (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.exam_date)}</TableCell>
                  <TableCell>{cow ? `${cow.nome} (${cow.brinco})` : "—"}</TableCell>
                  <TableCell>{r.exam_type}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{r.result ?? "—"}</TableCell>
                  <TableCell>{r.ccs_value ?? "—"}</TableCell>
                  <TableCell>{r.laboratory ?? "—"}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="size-4 text-destructive" /></Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

/* ---------------- VISITAS ---------------- */
function VisitasTab() {
  const propertyId = usePropertyId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    visit_date: new Date().toISOString().slice(0, 10), vet_name: "",
    reason: "", cows_attended: "", cost: "", next_visit_date: "", notes: "",
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const q = usePropertyQuery(
    ["vet_visits"],
    async (pid) => (await supabase.from("vet_visits").select("*").eq("property_id", pid).order("visit_date", { ascending: false }).limit(500)).data ?? [],
    propertyId,
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!propertyId || !form.vet_name) throw new Error("Informe o veterinário.");
      const { error } = await supabase.from("vet_visits").insert({
        property_id: propertyId, visit_date: form.visit_date, vet_name: form.vet_name,
        reason: form.reason || null,
        cows_attended: form.cows_attended ? Number(form.cows_attended) : null,
        cost: form.cost ? Number(form.cost) : null,
        next_visit_date: form.next_visit_date || null,
        notes: form.notes || null,
        created_by: (await supabase.auth.getUser()).data.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { notify.success("Visita registrada"); qc.invalidateQueries({ queryKey: ["vet_visits"] }); setOpen(false); },
    onError: (e: Error) => notify.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("vet_visits").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vet_visits"] }),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />Nova visita</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar visita veterinária</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={form.visit_date} onChange={(e) => set("visit_date", e.target.value)} /></div>
                <div><Label>Veterinário</Label><Input value={form.vet_name} onChange={(e) => set("vet_name", e.target.value)} /></div>
              </div>
              <div><Label>Motivo</Label><Textarea rows={2} value={form.reason} onChange={(e) => set("reason", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Vacas atendidas</Label><Input type="number" value={form.cows_attended} onChange={(e) => set("cows_attended", e.target.value)} /></div>
                <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => set("cost", e.target.value)} /></div>
              </div>
              <div><Label>Próxima visita</Label><Input type="date" value={form.next_visit_date} onChange={(e) => set("next_visit_date", e.target.value)} /></div>
              <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {q.data && q.data.length === 0 ? (
        <EmptyState icon={User} title="Nenhuma visita registrada" />
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Veterinário</TableHead><TableHead>Motivo</TableHead><TableHead>Vacas</TableHead><TableHead>Custo</TableHead><TableHead>Próxima</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {q.data?.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{fmtDate(r.visit_date)}</TableCell>
                <TableCell className="font-medium">{r.vet_name}</TableCell>
                <TableCell className="max-w-[240px] truncate">{r.reason ?? "—"}</TableCell>
                <TableCell>{r.cows_attended ?? "—"}</TableCell>
                <TableCell>{r.cost != null ? brl(Number(r.cost)) : "—"}</TableCell>
                <TableCell>{fmtDate(r.next_visit_date)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="size-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function KPI({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}
