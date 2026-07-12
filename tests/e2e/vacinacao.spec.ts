import { test, expect } from "./fixtures";

test.describe("Vacinação", () => {
  test("cadastra vacina e registra aplicação em uma vaca", async ({ authedPage: page }) => {
    const stamp = Date.now().toString(36);
    const nomeVaca = `Malhada ${stamp}`;
    const brinco = `VC-${stamp}`;
    const nomeVacina = `Aftosa ${stamp}`;

    // Vaca
    await page.goto("/vacas");
    await page
      .getByRole("button", { name: /Nova vaca|Cadastrar primeira vaca/i })
      .first()
      .click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel(/Nome/i).first().fill(nomeVaca);
    await dlg.getByLabel(/Brinco/i).fill(brinco);
    await dlg.getByRole("button", { name: /Salvar/i }).click();
    await expect(dlg).toBeHidden({ timeout: 15_000 });

    // Vacina no catálogo
    await page.goto("/vacinas");
    await page
      .getByRole("button", { name: /Nova vacina|Cadastrar primeira vacina/i })
      .first()
      .click();
    const vdlg = page.getByRole("dialog");
    await vdlg.getByLabel(/Nome/i).first().fill(nomeVacina);
    // Doença ou fabricante (opcional). Preenche se existir
    const doenca = vdlg.getByLabel(/Doença/i);
    if (await doenca.count()) await doenca.first().fill("Febre Aftosa");
    await vdlg.getByRole("button", { name: /Salvar/i }).click();
    await expect(vdlg).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(nomeVacina).first()).toBeVisible();

    // Aplicação
    await page.goto("/vacinacao");
    await page
      .getByRole("button", { name: /Nova aplicação|Registrar aplicação|Registrar primeira aplicação/i })
      .first()
      .click();
    const adlg = page.getByRole("dialog");
    await expect(adlg).toBeVisible();

    const combos = adlg.getByRole("combobox");
    await combos.nth(0).click();
    await page.getByRole("option", { name: new RegExp(nomeVaca, "i") }).click();
    await combos.nth(1).click();
    await page.getByRole("option", { name: new RegExp(nomeVacina, "i") }).click();

    await adlg.getByRole("button", { name: /Registrar|Salvar/i }).click();
    await expect(adlg).toBeHidden({ timeout: 15_000 });

    await expect(page.getByText(nomeVaca).first()).toBeVisible();
  });
});
