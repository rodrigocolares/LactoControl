import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function usePropertyId() {
  return useStore((s) => s.propertyId);
}

export function useCowsList() {
  return useStore((s) => s.vacas);
}

export const brl = (n: number | null | undefined) =>
  (Number(n ?? 0)).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso + (iso.length <= 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "—";

export const monthNames = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

/** Helper to build simple useQuery for property-scoped table */
export function usePropertyQuery<T>(
  key: readonly unknown[],
  fetcher: (propertyId: string) => Promise<T>,
  propertyId: string | null,
) {
  return useQuery({
    queryKey: [...key, propertyId],
    enabled: !!propertyId,
    queryFn: () => fetcher(propertyId as string),
    staleTime: 15_000,
  });
}

export { supabase };
