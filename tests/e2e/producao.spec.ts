import { test, expect } from "./fixtures";

test.describe("Produção mensal", () => {
  test("registra produção após cadastrar vaca", async ({ authedPage: page }) => {
    const stamp = Date.now().toString(36);
    const nome = `Estrela ${stamp}`;
    const brinco = `PR-${stamp}`;

    // Cadastra vaca
    await page.goto("/vacas");
    await page
      .getByRole("button", { name: /Nova vaca|Cadastrar primeira vaca/i })
      .first()
      .click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel(/Nome/i).first().fill(nome);
    await dlg.getByLabel(/Brinco/i).fill(brinco);
    await dlg.getByRole("button", { name: /Salvar/i }).click();
    await expect(dlg).toBeHidden({ timeout: 15_000 });

    // Registra produção
    await page.goto("/producao");
    await page
      .getByRole("button", { name: /Nova|Registrar primeira produção|Registrar produção/i })
      .first()
      .click();

    const pdlg = page.getByRole("dialog");
    await expect(pdlg).toBeVisible();

    // Seleciona a vaca
    await pdlg.getByRole("combobox").first().click();
    await page.getByRole("option", { name: new RegExp(nome, "i") }).click();

    // Preenche litros (primeiro input numérico do dialog)
    const litros = pdlg.locator('input[type="number"]').first();
    await litros.fill("25");

    await pdlg.getByRole("button", { name: /Registrar|Salvar/i }).click();
    await expect(pdlg).toBeHidden({ timeout: 15_000 });

    // Deve aparecer na lista
    await expect(page.getByText(nome).first()).toBeVisible();
  });
});
