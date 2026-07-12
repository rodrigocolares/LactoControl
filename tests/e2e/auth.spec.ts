import { test, expect, makeUser, signUp, signIn } from "./fixtures";

test.describe("Autenticação", () => {
  test("cadastro habilita botão apenas após aceite dos termos", async ({ page }) => {
    const user = makeUser();
    await page.goto("/auth?mode=signup");
    await page.getByRole("tab", { name: "Cadastro" }).click();
    await page.getByLabel("Nome completo").fill(user.fullName);
    await page.getByLabel("E-mail").fill(user.email);
    await page.getByLabel("Senha", { exact: true }).fill(user.password);
    await page.getByLabel("Confirmação da senha").fill(user.password);
    const btn = page.getByRole("button", { name: "Criar cadastro" });
    await expect(btn).toBeDisabled();
    await page.getByLabel(/Aceito os termos/i).check();
    await expect(btn).toBeEnabled();
  });

  test("fluxo cadastro + login + logout", async ({ page }) => {
    const user = makeUser();
    await signUp(page, user);
    // Aguarda auto-login ou volta pra aba login
    try {
      await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 6_000 });
    } catch {
      await signIn(page, user);
    }
    await expect(page).toHaveURL(/^(?!.*\/auth).*/);

    // Logout via botão "Sair" no menu lateral
    await page.getByRole("button", { name: /Sair/i }).first().click();
    await page.waitForURL(/\/auth/, { timeout: 15_000 });
  });

  test("login com senha inválida mostra erro", async ({ page }) => {
    await page.goto("/auth?mode=login");
    await page.getByLabel("E-mail").fill("nao_existe_e2e@lactocontrol.test");
    await page.getByLabel("Senha", { exact: true }).fill("SenhaErrada1!");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByText(/inválidos|inválido/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("recuperação de senha envia confirmação", async ({ page }) => {
    await page.goto("/auth?mode=forgot");
    await page.getByRole("tab", { name: "Recuperar" }).click();
    await page.getByLabel("E-mail").fill("qualquer_e2e@lactocontrol.test");
    await page.getByRole("button", { name: /Enviar link/i }).click();
    await expect(page.getByText(/receberá um link/i)).toBeVisible({ timeout: 10_000 });
  });
});
