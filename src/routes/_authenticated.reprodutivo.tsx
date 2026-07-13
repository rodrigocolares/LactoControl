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
import { supabase, usePropertyId, useCowsList, usePropertyQuery, fmtDate } from "@/lib/modules-shared";
import { Plus, Trash2, HeartPulse, Syringe, Baby, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reprodutivo")({
  head: () => ({
    meta: [
      { title: "Reprodutivo — Lacto Control" },
      { name: "description", content: "Cios, inseminações, diagnósticos de gestação e partos." },
    ],
  }),
  component: ReprodutivoPage,
});

function ReprodutivoPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Reprodutivo"
        description="Detecção de cios, inseminações, diagnósticos de gestação e partos."
      />
      <Tabs defaultValue="cios">
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="cios"><HeartPulse className="mr-2 size-4" />Cios</TabsTrigger>
          <TabsTrigger value="ia"><Syringe className="mr-2 size-4" />Inseminações</TabsTrigger>
          <TabsTrigger value="diag"><ClipboardCheck className="mr-2 size-4" />Diagnósticos</TabsTrigger>
          <TabsTrigger value="partos"><Baby className="mr-2 size-4" />Partos</TabsTrigger>
        </TabsList>
        <TabsContent value="cios"><CiosTab /></TabsContent>
        <TabsContent value="ia"><InseminacoesTab /></TabsContent>
        <TabsContent value="diag"><DiagnosticosTab /></TabsContent>
        <TabsContent value="partos"><PartosTab /></TabsContent>
      </Tabs>
    </AppLayout>
  );
}

/* ---------------- CIOS ---------------- */
function CiosTab() {
  const propertyId = usePropertyId();
  const cows = useCowsList();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [cowId, setCowId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [intensity, setIntensity] = useState("");
  const [notes, setNotes] = useState("");

  const q = usePropertyQuery(
    ["heats"],
    async (pid) => (await supabase.from("heats").select("*").eq("property_id", pid).order("heat_date", { ascending: false }).limit(500)).data ?? [],
    propertyId,
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!propertyId || !cowId || !date) throw new Error("Preencha vaca e data.");
      const { error } = await supabase.from("heats").insert({
        property_id: propertyId, cow_id: cowId, heat_date: date,
        intensity: intensity || null, notes: notes || null, created_by: (await supabase.auth.getUser()).data.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      notify.success("Cio registrado");
      qc.invalidateQueries({ queryKey: ["heats"] });
      setOpen(false); setCowId(""); setIntensity(""); setNotes("");
    },
    onError: (e: Error) => notify.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("heats").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { notify.success("Registro excluído"); qc.invalidateQueries({ queryKey: ["heats"] }); },
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />Novo cio</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar cio</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Vaca</Label>
                <Select value={cowId} onValueChange={setCowId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{cows.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.brinco})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div><Label>Intensidade</Label>
                <Select value={intensity} onValueChange={setIntensity}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fraco">Fraco</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="forte">Forte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {q.data && q.data.length === 0 ? (
        <EmptyState icon={HeartPulse} title="Nenhum cio registrado" description="Registre o primeiro cio detectado para acompanhar o ciclo reprodutivo." />
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Vaca</TableHead><TableHead>Intensidade</TableHead><TableHead>Obs.</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {q.data?.map((r: any) => {
              const cow = cows.find((c) => c.id === r.cow_id);
              return (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.heat_date)}</TableCell>
                  <TableCell>{cow ? `${cow.nome} (${cow.brinco})` : "—"}</TableCell>
                  <TableCell className="capitalize">{r.intensity ?? "—"}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{r.notes ?? "—"}</TableCell>
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

/* ---------------- INSEMINAÇÕES ---------------- */
function InseminacoesTab() {
  const propertyId = usePropertyId();
  const cows = useCowsList();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    cow_id: "", insemination_date: new Date().toISOString().slice(0, 10),
    method: "ia", bull_or_semen: "", technician: "", batch_number: "", iatf_protocol: "", notes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const q = usePropertyQuery(
    ["inseminations"],
    async (pid) => (await supabase.from("inseminations").select("*").eq("property_id", pid).order("insemination_date", { ascending: false }).limit(500)).data ?? [],
    propertyId,
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!propertyId || !form.cow_id) throw new Error("Selecione a vaca.");
      const { error } = await supabase.from("inseminations").insert({
        property_id: propertyId, cow_id: form.cow_id,
        insemination_date: form.insemination_date, method: form.method as any,
        bull_or_semen: form.bull_or_semen || null, technician: form.technician || null,
        batch_number: form.batch_number || null, iatf_protocol: form.iatf_protocol || null,
        notes: form.notes || null, created_by: (await supabase.auth.getUser()).data.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { notify.success("Inseminação registrada"); qc.invalidateQueries({ queryKey: ["inseminations"] }); setOpen(false); },
    onError: (e: Error) => notify.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("inseminations").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inseminations"] }),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />Nova inseminação</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar inseminação</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Vaca</Label>
                <Select value={form.cow_id} onValueChange={(v) => set("cow_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{cows.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.brinco})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={form.insemination_date} onChange={(e) => set("insemination_date", e.target.value)} /></div>
                <div><Label>Método</Label>
                  <Select value={form.method} onValueChange={(v) => set("method", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ia">IA</SelectItem>
                      <SelectItem value="monta_natural">Monta natural</SelectItem>
                      <SelectItem value="iatf">IATF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Touro / sêmen</Label><Input value={form.bull_or_semen} onChange={(e) => set("bull_or_semen", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Técnico</Label><Input value={form.technician} onChange={(e) => set("technician", e.target.value)} /></div>
                <div><Label>Lote</Label><Input value={form.batch_number} onChange={(e) => set("batch_number", e.target.value)} /></div>
              </div>
              <div><Label>Protocolo IATF</Label><Input value={form.iatf_protocol} onChange={(e) => set("iatf_protocol", e.target.value)} /></div>
              <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {q.data && q.data.length === 0 ? (
        <EmptyState icon={Syringe} title="Nenhuma inseminação registrada" />
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Vaca</TableHead><TableHead>Método</TableHead><TableHead>Touro/Sêmen</TableHead><TableHead>Técnico</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {q.data?.map((r: any) => {
              const cow = cows.find((c) => c.id === r.cow_id);
              return (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.insemination_date)}</TableCell>
                  <TableCell>{cow ? `${cow.nome} (${cow.brinco})` : "—"}</TableCell>
                  <TableCell className="uppercase">{r.method}</TableCell>
                  <TableCell>{r.bull_or_semen ?? "—"}</TableCell>
                  <TableCell>{r.technician ?? "—"}</TableCell>
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

/* ---------------- DIAGNÓSTICOS ---------------- */
function DiagnosticosTab() {
  const propertyId = usePropertyId();
  const cows = useCowsList();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    cow_id: "", check_date: new Date().toISOString().slice(0, 10),
    result: "positivo", method: "", gestation_days: "", expected_calving_date: "", notes: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const q = usePropertyQuery(
    ["pregnancy_checks"],
    async (pid) => (await supabase.from("pregnancy_checks").select("*").eq("property_id", pid).order("check_date", { ascending: false }).limit(500)).data ?? [],
    propertyId,
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!propertyId || !form.cow_id) throw new Error("Selecione a vaca.");
      const { error } = await supabase.from("pregnancy_checks").insert({
        property_id: propertyId, cow_id: form.cow_id, check_date: form.check_date,
        result: form.result as any, method: form.method || null,
        gestation_days: form.gestation_days ? Number(form.gestation_days) : null,
        expected_calving_date: form.expected_calving_date || null,
        notes: form.notes || null, created_by: (await supabase.auth.getUser()).data.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { notify.success("Diagnóstico registrado"); qc.invalidateQueries({ queryKey: ["pregnancy_checks"] }); setOpen(false); },
    onError: (e: Error) => notify.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("pregnancy_checks").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pregnancy_checks"] }),
  });

  return (
    <Card className="p-4">
      <div className="mb-3 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />Novo diagnóstico</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Diagnóstico de gestação</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Vaca</Label>
                <Select value={form.cow_id} onValueChange={(v) => set("cow_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{cows.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.brinco})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={form.check_date} onChange={(e) => set("check_date", e.target.value)} /></div>
                <div><Label>Resultado</Label>
                  <Select value={form.result} onValueChange={(v) => set("result", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positivo">Positivo</SelectItem>
                      <SelectItem value="negativo">Negativo</SelectItem>
                      <SelectItem value="duvidoso">Duvidoso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Método</Label><Input value={form.method} onChange={(e) => set("method", e.target.value)} placeholder="Palpação, US..." /></div>
                <div><Label>Dias de gestação</Label><Input type="number" value={form.gestation_days} onChange={(e) => set("gestation_days", e.target.value)} /></div>
              </div>
              <div><Label>Previsão de parto</Label><Input type="date" value={form.expected_calving_date} onChange={(e) => set("expected_calving_date", e.target.value)} /></div>
              <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {q.data && q.data.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Nenhum diagnóstico registrado" />
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Vaca</TableHead><TableHead>Resultado</TableHead><TableHead>Método</TableHead><TableHead>Prev. parto</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {q.data?.map((r: any) => {
              const cow = cows.find((c) => c.id === r.cow_id);
              return (
                <TableRow key={r.id}>
                  <TableCell>{fmtDate(r.check_date)}</TableCell>
                  <TableCell>{cow ? `${cow.nome} (${cow.brinco})` : "—"}</TableCell>
                  <TableCell className="capitalize">{r.result}</TableCell>
                  <TableCell>{r.method ?? "—"}</TableCell>
                  <TableCell>{fmtDate(r.expected_calving_date)}</TableCell>
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

/* ---------------- PARTOS ---------------- */
function PartosTab() {
  const propertyId = usePropertyId();
  const cows = useCowsList();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    cow_id: "", calving_date: new Date().toISOString().slice(0, 10),
    delivery_type: "normal", calf_sex: "", calf_weight_kg: "", calf_ear_tag: "", calf_name: "", stillborn: false, notes: "",
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const q = usePropertyQuery(
    ["calvings"],
    async (pid) => (await supabase.from("calvings").select("*").eq("property_id", pid).order("calving_date", { ascending: false }).limit(500)).data ?? [],
    propertyId,
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!propertyId || !form.cow_id) throw new Error("Selecione a vaca.");
      const { error } = await supabase.from("calvings").insert({
        property_id: propertyId, cow_id: form.cow_id, calving_date: form.calving_date,
        delivery_type: form.delivery_type as any,
        calf_sex: (form.calf_sex || null) as any,
        calf_weight_kg: form.calf_weight_kg ? Number(form.calf_weight_kg) : null,
        calf_ear_tag: form.calf_ear_tag || null, calf_name: form.calf_name || null,
        stillborn: !!form.stillborn, notes: form.notes || null,
        created_by: (await supabase.auth.getUser()).data.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { notify.success("Parto registrado"); qc.invalidateQueries({ queryKey: ["calvings"] }); setOpen(false); },
    onError: (e: Error) => notify.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("calvings").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calvings"] }),
  });

  const stats = useMemo(() => {
    const rows = q.data ?? [];
    const total = rows.length;
    const machos = rows.filter((r: any) => r.calf_sex === "macho").length;
    const femeas = rows.filter((r: any) => r.calf_sex === "femea").length;
    const distocicos = rows.filter((r: any) => r.delivery_type !== "normal").length;
    const natimortos = rows.filter((r: any) => r.stillborn).length;
    return { total, machos, femeas, distocicos, natimortos };
  }, [q.data]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KPI label="Partos" value={stats.total} />
        <KPI label="Machos" value={stats.machos} />
        <KPI label="Fêmeas" value={stats.femeas} />
        <KPI label="Distócicos" value={stats.distocicos} />
        <KPI label="Natimortos" value={stats.natimortos} />
      </div>
      <Card className="p-4">
        <div className="mb-3 flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 size-4" />Novo parto</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar parto</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Vaca</Label>
                  <Select value={form.cow_id} onValueChange={(v) => set("cow_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{cows.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome} ({c.brinco})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Data</Label><Input type="date" value={form.calving_date} onChange={(e) => set("calving_date", e.target.value)} /></div>
                  <div><Label>Tipo</Label>
                    <Select value={form.delivery_type} onValueChange={(v) => set("delivery_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="distocico">Distócico</SelectItem>
                        <SelectItem value="cesariana">Cesariana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Sexo do bezerro</Label>
                    <Select value={form.calf_sex} onValueChange={(v) => set("calf_sex", v)}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="macho">Macho</SelectItem>
                        <SelectItem value="femea">Fêmea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Peso (kg)</Label><Input type="number" step="0.1" value={form.calf_weight_kg} onChange={(e) => set("calf_weight_kg", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Brinco bezerro</Label><Input value={form.calf_ear_tag} onChange={(e) => set("calf_ear_tag", e.target.value)} /></div>
                  <div><Label>Nome bezerro</Label><Input value={form.calf_name} onChange={(e) => set("calf_name", e.target.value)} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.stillborn} onChange={(e) => set("stillborn", e.target.checked)} />
                  Natimorto
                </label>
                <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
              </div>
              <DialogFooter><Button onClick={() => create.mutate()} disabled={create.isPending}>Salvar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {q.data && q.data.length === 0 ? (
          <EmptyState icon={Baby} title="Nenhum parto registrado" />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Vaca</TableHead><TableHead>Tipo</TableHead><TableHead>Sexo</TableHead><TableHead>Peso</TableHead><TableHead>Brinco</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {q.data?.map((r: any) => {
                const cow = cows.find((c) => c.id === r.cow_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{fmtDate(r.calving_date)}</TableCell>
                    <TableCell>{cow ? `${cow.nome} (${cow.brinco})` : "—"}</TableCell>
                    <TableCell className="capitalize">{r.delivery_type}{r.stillborn ? " · natimorto" : ""}</TableCell>
                    <TableCell className="capitalize">{r.calf_sex ?? "—"}</TableCell>
                    <TableCell>{r.calf_weight_kg ? `${r.calf_weight_kg} kg` : "—"}</TableCell>
                    <TableCell>{r.calf_ear_tag ?? "—"}</TableCell>
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

function KPI({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}
