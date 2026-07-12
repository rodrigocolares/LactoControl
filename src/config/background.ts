import authBgUrl from "@/assets/backgrounds/auth-bg.jpg";

/**
 * Configuração centralizada do background das páginas públicas.
 * Trocar a imagem oficial = substituir o arquivo em src/assets/backgrounds/auth-bg.jpg
 * ou alterar o import abaixo.
 */
export const authBackground = {
  image: authBgUrl,
  // Overlay escuro sobre a imagem para garantir contraste com o formulário.
  overlayLight: "rgba(0, 0, 0, 0.35)",
  overlayDark: "rgba(0, 0, 0, 0.55)",
  position: "center center",
  size: "cover",
  repeat: "no-repeat",
} as const;
