# Produtividade Alencar Log

Dashboard diário de produtividade de motoristas. Cada lançamento reúne motorista, perna inteira, meia perna, `ENTRADA NA BASE` (chegada à empresa), `SAÍDA DA BASE` (início do trabalho) e `ENCERRAMENTO DA OPERAÇÃO`. `TOTAL DE PERNAS` é calculado por perna inteira + meia perna. `MÉDIA DE CONTAINER/HORA` divide o total de pernas pelas horas entre saída da base e encerramento da operação, inclusive se atravessar a meia-noite. A planilha Excel exporta todos os registros da data e deixa os horários e quantidades editáveis; suas fórmulas atualizam média e duração automaticamente. Os lançamentos são persistidos no banco MySQL gerenciado do projeto e recuperados por data de referência. Registros históricos sem a hora de chegada permanecem com esse campo em branco.

## Desenvolvimento

Requer Node.js 22+, pnpm 11.25.0 e `DATABASE_URL` disponibilizada pelo ambiente do projeto. Instale com `pnpm install` e inicie a API e o Vite com `pnpm dev`; a interface fica na porta 3000 e o proxy encaminha `/api` à API na porta 4000.

## Produção

`pnpm build` compila o frontend. O servidor Express serve os arquivos compilados, inicializa/migra a tabela de produtividade de forma idempotente e utiliza `DATABASE_URL` no ambiente de execução. A API disponibiliza `/api/health`.

Sem autenticação, conforme solicitado para este painel operacional: qualquer pessoa com acesso ao site pode consultar, inserir, editar e excluir lançamentos. Não publique o painel em um domínio com acesso público sem considerar essa característica.
