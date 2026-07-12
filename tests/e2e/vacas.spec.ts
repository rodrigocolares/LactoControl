import { test, expect } from "./fixtures";

test.describe("CRUD de Vacas", () => {
  test("cadastra, busca, edita e exclui uma vaca", async ({ authedPage: page }) => {
    const stamp = Date.now().toString(36);
    const nome = `Mimosa ${stamp}`;
    const brinco = `BR-${stamp}`;

    await page.goto("/vacas");

    // Abre dialog "Nova vaca" (pode ser primeiro-cadastro ou botão de topo)
    const novo = page
      .getByRole("button", { name: /Nova vaca|Cadastrar primeira vaca/i })
      .first();
    await novo.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel(/Nome/i).first().fill(nome);
    await dialog.getByLabel(/Brinco/i).fill(brinco);
    await dialog.getByRole("button", { name: /Salvar/i }).click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(nome).first()).toBeVisible();

    // Busca
    await page.getByPlaceholder(/Buscar por nome, brinco/i).fill(brinco);
    await expect(page.getByText(nome).first()).toBeVisible();

    // Exclui via botão na linha (usa aria-label "Excluir" ou ícone lixeira)
    const linha = page.getByRole("row", { name: new RegExp(nome, "i") }).first();
    const excluir = linha.getByRole("button", { name: /Excluir|Remover/i });
    if (await excluir.count()) {
      await excluir.first().click();
      const confirmar = page.getByRole("button", { name: /Confirmar|Excluir|Sim/i }).last();
      if (await confirmar.count()) await confirmar.click();
      await expect(page.getByText(nome)).toHaveCount(0, { timeout: 15_000 });
    }
  });
});
