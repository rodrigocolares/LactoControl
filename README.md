# 🐄 Lacto Control

> Sistema inteligente para gerenciamento de rebanho leiteiro, controle do ciclo de lactação, acompanhamento sanitário e análise gerencial da produção de leite.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Web-orange)

---

# 📖 Sobre o projeto

O **Lacto Control** é uma plataforma desenvolvida para produtores rurais, fazendas leiteiras, cooperativas e médicos veterinários que desejam centralizar todas as informações do rebanho em um único sistema.

Além do cadastro dos animais e do acompanhamento da lactação, o sistema oferece dashboards, relatórios gerenciais, gráficos interativos e controle completo do histórico vacinal de cada vaca.

O projeto foi concebido para crescer de forma modular, permitindo futuras integrações com Inteligência Artificial, IoT, sensores de ordenha e sistemas ERP do agronegócio.

---

# 🎯 Objetivos

* Centralizar as informações do rebanho.
* Controlar todo o ciclo de lactação.
* Monitorar a produção mensal e diária.
* Identificar automaticamente o pico de produção.
* Gerenciar o histórico sanitário dos animais.
* Gerar indicadores para tomada de decisão.
* Automatizar alertas e notificações.
* Facilitar a gestão da propriedade leiteira.

---

# 🚀 Funcionalidades

## 🐄 Cadastro de Vacas

Cadastro individual contendo:

* Nome
* Número do brinco
* Raça
* Data de nascimento
* Data do último parto
* Data de início da lactação
* Status (Em lactação, Seca, Prenha ou Descartada)
* Observações

---

## 🥛 Controle do Ciclo de Lactação

Registro mensal contendo:

* Produção total de leite
* Média diária
* Observações
* Tempo de lactação
* Produção acumulada

Indicadores automáticos:

* Pico de lactação
* Melhor mês
* Menor mês
* Média geral
* Total produzido
* Evolução mensal

---

# 💉 Controle Vacinal

Cada animal possui um histórico sanitário completo.

### Cadastro de Vacinas

* Nome da vacina
* Doença
* Fabricante
* Periodicidade
* Número de doses
* Intervalo entre aplicações
* Tempo de carência
* Observações

### Aplicação

* Data
* Dose
* Responsável
* Lote
* Próxima aplicação calculada automaticamente

### Histórico

* Vacinas em dia
* Vacinas vencidas
* Vacinas pendentes
* Linha do tempo vacinal
* Alertas automáticos

---

# 📊 Dashboard Gerencial

O painel principal apresenta indicadores em tempo real:

* Total de vacas cadastradas
* Vacas em lactação
* Vacas secas
* Vacas prenhas
* Produção total do mês
* Média diária geral
* Produção acumulada
* Ranking de produção
* Animal mais produtivo
* Mês de maior produção

---

# 📈 Relatórios Inteligentes

A nova área de relatórios permite análises detalhadas da produção utilizando gráficos interativos.

## Filtros

* Período
* Mês
* Ano
* Animal
* Raça
* Status
* Lactação

Os filtros atualizam todos os indicadores e gráficos automaticamente.

---

## Indicadores

O relatório apresenta:

* Produção total do período
* Produção do mês
* Média diária do rebanho
* Média diária por vaca
* Melhor produtora
* Melhor mês
* Quantidade de animais considerados
* Ranking de produtividade

---

## Gráficos

### 📊 Produção Total por Mês

Gráfico de linha ou barras exibindo a evolução mensal da produção do rebanho.

Inclui:

* Produção mensal
* Destaque para o maior mês
* Destaque para o menor mês

---

### 🐄 Produção por Vaca

Gráfico de barras comparando todos os animais.

Exibe:

* Produção total
* Ranking automático
* Tooltip com informações detalhadas
* Acesso rápido à ficha do animal

---

### 📅 Média Diária por Vaca

Gráfico específico para comparação da produtividade diária.

Inclui:

* Média diária
* Linha de referência da média geral
* Identificação dos animais acima ou abaixo da média

---

### 📈 Evolução da Média Diária

Gráfico de linha mostrando a evolução da produtividade diária do rebanho ao longo do tempo.

---

### 📊 Produção Total × Média Diária

Gráfico combinado contendo:

* Barras para produção mensal
* Linha para média diária

Facilita a identificação da relação entre produtividade e volume produzido.

---

# 🎨 Visualização dos Gráficos

Todos os gráficos possuem identidade visual moderna.

### Melhorias implementadas

* Barras coloridas individualmente
* Cada categoria possui uma cor exclusiva
* Paleta consistente em toda aplicação
* Legendas automáticas
* Tooltips informativos
* Destaque visual ao passar o mouse
* Compatibilidade com modo claro e escuro
* Responsividade completa

A mesma vaca, mês ou categoria mantém sempre a mesma cor em qualquer gráfico do sistema.

---

# 📋 Relatórios Exportáveis

Os relatórios podem ser exportados em:

* PDF
* Excel
* CSV

As exportações incluem:

* Filtros utilizados
* Indicadores
* Gráficos
* Tabelas detalhadas
* Data e hora da geração

---

# 📱 Interface

A aplicação foi projetada para funcionar em:

* Desktop
* Notebook
* Tablet
* Smartphone

Características:

* Layout responsivo
* Dashboard moderno
* Gráficos interativos
* Filtros rápidos
* Navegação intuitiva
* Componentes reutilizáveis

---

# ⚙️ Regras de Negócio

## Lactação

* Não permitir produção negativa.
* Calcular automaticamente a média diária.
* Identificar automaticamente o pico de lactação.
* Atualizar indicadores em tempo real.

## Vacinação

* Calcular automaticamente a próxima dose.
* Evitar registros duplicados.
* Manter histórico permanente.
* Classificar automaticamente o status vacinal.

## Relatórios

* Atualização automática após qualquer alteração.
* Utilização apenas de dados válidos.
* Arredondamento das médias para duas casas decimais.
* Tratamento para ausência de dados.
* Compatibilidade com anos bissextos.

---

# 🛠️ Tecnologias

* Lovable
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Recharts
* Supabase
* PostgreSQL
* React Hook Form
* Zod

---

# 🔮 Roadmap

## Próximas funcionalidades

### Reprodução

* Controle de cio
* Inseminação artificial
* Cobertura
* Diagnóstico de gestação
* Controle de partos

### Sanidade

* Vermifugação
* Tratamentos
* Mastite
* Medicamentos
* Exames laboratoriais

### Financeiro

* Custos por animal
* Receita por produção
* Rentabilidade
* Fluxo de caixa

### Inteligência Artificial

* Previsão do pico de lactação
* Identificação precoce de queda de produção
* Recomendações de manejo
* Alertas inteligentes
* Predição de produtividade

### IoT

* Integração com sensores
* Ordenhadeiras automáticas
* Medidores de leite
* Monitoramento em tempo real

---

# 👨‍🌾 Público-alvo

* Produtores rurais
* Fazendas leiteiras
* Cooperativas
* Médicos veterinários
* Zootecnistas
* Consultores agropecuários

---

# 🌟 Diferenciais

* Gestão completa do rebanho.
* Controle integrado de lactação e vacinação.
* Dashboards com indicadores em tempo real.
* Relatórios avançados com gráficos interativos.
* Visualização moderna e intuitiva.
* Exportação de relatórios em múltiplos formatos.
* Arquitetura preparada para expansão.
* Base preparada para Inteligência Artificial e Internet das Coisas (IoT).

---

# 📄 Licença

Este projeto está licenciado sob a licença **MIT**.

---

# 👨‍💻 Autor

Desenvolvido por **Rodrigo Otavio Leão Colares**, utilizando **Lovable** para desenvolvimento full stack acelerado e **ChatGPT** como apoio na arquitetura, documentação e definição de funcionalidades, com foco na transformação digital da pecuária leiteira.
