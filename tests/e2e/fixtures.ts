import { test as base, expect, type Page } from "@playwright/test";

export type TestUser = {
  email: string;
  password: string;
  fullName: string;
  farmName: string;
};

export function makeUser(): TestUser {
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    email: `e2e_${stamp}@lactocontrol.test`,
    password: "Test1234!aA",
    fullName: `E2E ${stamp}`,
    farmName: `Fazenda ${stamp}`,
  };
}

export async function signUp(page: Page, user: TestUser) {
  await page.goto("/auth?mode=signup");
  await page.getByRole("tab", { name: "Cadastro" }).click();
  await page.getByLabel("Nome completo").fill(user.fullName);
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(user.password);
  await page.getByLabel("Confirmação da senha").fill(user.password);
  await page.getByLabel("Propriedade / Fazenda (opcional)").fill(user.farmName);
  await page.getByLabel(/Aceito os termos/i).check();
  await page.getByRole("button", { name: "Criar cadastro" }).click();
}

export async function signIn(page: Page, user: TestUser) {
  await page.goto("/auth?mode=login");
  await page.getByRole("tab", { name: "Entrar" }).click();
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20_000 });
}

type Fixtures = {
  user: TestUser;
  authedPage: Page;
};

export const test = base.extend<Fixtures>({
  user: async ({}, use) => {
    await use(makeUser());
  },
  authedPage: async ({ page, user }, use) => {
    await signUp(page, user);
    // After signup Supabase may auto-sign-in (if email confirm disabled) or return to login tab.
    // Try login as a fallback.
    try {
      await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 6_000 });
    } catch {
      await signIn(page, user);
    }
    await use(page);
  },
});

export { expect };
