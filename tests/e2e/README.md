# Testes E2E — Lacto Control (Fase 1)

Suite Playwright cobrindo Autenticação, CRUD de Vacas, Produção mensal e Vacinação.

## Pré-requisitos

1. Instale os navegadores do Playwright (uma vez):
   ```bash
   bunx playwright install chromium
   ```
2. O `.env` do projeto precisa apontar para uma instância do Lovable Cloud com
   **confirmação de e-mail desativada** (senão o teste de login pós-cadastro
   não completa). Recomendado usar um projeto de staging.

## Scripts

- `bun run test:e2e` — headless, uso normal em terminal
- `bun run test:e2e:ui` — UI interativa do Playwright
- `bun run test:e2e:headed` — abre o navegador
- `bun run test:e2e:report` — abre o último relatório HTML

O `webServer` do Playwright inicia `bun run dev` em `localhost:8080` se
nenhum servidor estiver rodando. Para apontar a suíte para outra URL:

```bash
E2E_BASE_URL=https://staging.example.com bun run test:e2e
```

## Como funciona

- `fixtures.ts` cria usuários efêmeros (`e2e_<hash>@lactocontrol.test`) e
  expõe `authedPage`, que faz signup + auto-login antes de cada teste
  protegido.
- Cada teste é **isolado**: cria seus próprios dados (vaca/vacina/produção)
  com sufixos únicos e não depende de dados prévios.
- Os dados criados **permanecem** no backend após a execução. Rode
  periodicamente uma limpeza dos usuários `e2e_*@lactocontrol.test` no
  Lovable Cloud.

## Observações

- Os testes falham propositalmente rápido (`timeout: 60s`) para não travar CI.
- Screenshots, vídeos e traces de execuções que falharem ficam em
  `playwright-report/` e `test-results/`.
