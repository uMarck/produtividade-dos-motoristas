# Plano de implementação — Produtividade Alencar Log

## Objetivo e decisões de implementação

Manter o painel diário sem login e os registros no banco MySQL persistente existente. Cada motorista terá três horários editáveis: **ENTRADA NA BASE** (chegada à empresa), **SAÍDA DA BASE** (início do trabalho) e **ENCERRAMENTO DA OPERAÇÃO** (fim do trabalho). O tempo de trabalho, usado somente no cálculo, é o intervalo entre saída e encerramento, incluindo cruzamento da meia-noite. `TOTAL DE PERNAS` é a soma de perna inteira e meia perna; a **MÉDIA DE CONTAINER/HORA** divide esse total pelas horas de trabalho.

A migração de `base_arrival` deve ser aditiva e idempotente. Os lançamentos existentes são preservados: como nunca se armazenou a chegada à base, esse campo ficará vazio nos registros antigos, sem inferência. A edição dos lançamentos permite preencher a informação. Os três horários deverão aparecer claramente no formulário e na tabela; PDF/JPEG os capturam integralmente.

A planilha Excel contém os dados persistidos para a data exportada, em abas de painel e dados completos. A aba de dados exibe as colunas na ordem operacional solicitada — ENTRADA NA BASE, SAÍDA DA BASE, ENCERRAMENTO DA OPERAÇÃO, MÉDIA DE CONTAINER — e também duração calculada, totais e metadados. Horários e dados de entrada são células editáveis; média, total de pernas, duração, percentuais e ranking são fórmulas de Excel com valores em cache e recálculo automático. A identidade azul-marinho, ciano e verde-lima permanece.

O deploy externo Vercel foi solicitado anteriormente, mas a criação de projeto na equipe conectada retornou 403; não copiar credenciais de desenvolvimento nem divulgar API privada. Requer permissão apropriada e solução aprovada para um backend persistente publicamente acessível.

## Design

- **Movimento de design:** painel industrial-operacional inspirado pelo material de marca do Grupo Alencar Log.
- **Princípios:** leitura rápida de produção; hierarquia forte de totais e ranking; todos os horários visíveis; identidade consistente em tela e exportações.
- **Filosofia de cor:** azul-marinho cria contraste e foco operacional; ciano conduz navegação e contornos; verde-lima destaca produtividade e bons resultados.
- **Paradigma de layout:** cabeçalho de referência e total, faixa de indicadores, coluna de gráficos/ranking ao lado da tabela; em telas estreitas, fluxo vertical com tabela rolável.
- **Assinaturas visuais:** cartões com brilho ciano/lima; barras graduais por tipo de movimento; marca gráfica compacta AL.
- **Interação:** cadastro de três horários; média atualizada enquanto se preenche; edição de registros e retorno claro ao salvar/exportar.
- **Animação:** transições curtas em foco/hover e indicadores de carregamento discretos; movimento decorativo não interfere nas capturas.
- **Tipografia:** Inter para dados e microtexto; Barlow Condensed para títulos e valores; Excel usa Arial compatível.
- **Essência da marca:** painel diário para coordenação logística, direto, preciso e enérgico.
- **Voz da marca:** títulos objetivos e CTAs verbais; exemplos: “Cada movimento conta.” e “Dados do dia — referência selecionada”.
- **Marca:** monograma AL com traço de movimento, ao lado do nome Grupo Alencar Log.
- **Cor de assinatura:** verde-lima `#91ED1D`, equilibrada por azul-marinho `#061733` e ciano `#13C6F5`.

## Estrutura principal

- `src/main.tsx`: painel React, formulário, CRUD diário, ranking, gráficos e PDF/JPEG.
- `src/styles.css` e `src/mobile-tweaks.css`: identidade visual, layout responsivo e regras de exportação.
- `server/index.js`: API Express, migração MySQL aditiva, validação dos horários, duração/média e Excel completo/editável.
- `public/`: marca vetorial e manifesto de rotas.
- `vite.config.ts`, `package.json`, `pnpm-lock.yaml`: build Vite e dependências fixadas.
- `Dockerfile`: execução de produção do projeto Manus.
- `README.md`: uso, persistência e configuração.
- `TODO.md`: critérios de aceite e progresso.
