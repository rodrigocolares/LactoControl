import authBgAsset from "@/assets/backgrounds/auth-bg.jpg.asset.json";

/**
 * Configuração centralizada do background das páginas públicas.
 * A imagem é servida via CDN (Lovable Assets) para não impactar o bundle.
 * Para trocar: envie novo arquivo com `lovable-assets create` e substitua o pointer.
 */
export const authBackground = {
  image: authBgAsset.url,
  overlayLight: "rgba(0, 0, 0, 0.35)",
  overlayDark: "rgba(0, 0, 0, 0.55)",
  position: "center center",
  size: "cover",
  repeat: "no-repeat",
} as const;
