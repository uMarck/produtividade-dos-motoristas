# Produtividade de motoristas · Alencar Log

Painel diário e mensal para acompanhar perna inteira, meia perna, total de movimentos, tempo de operação e containers por hora. A visão mensal consolida motoristas pelo nome e mostra os dias trabalhados; sua exportação Excel inclui resumo por motorista e todos os lançamentos datados. O Excel diário mantém as abas “Painel diário” e “Todos os dados”, com fórmulas e horários editáveis. PDF e JPEG exportam o painel exibido.

## Produção na Vercel

O frontend Vite usa as funções em `api/productivity/` para persistir cada lançamento em um Vercel Blob privado. Configure o armazenamento no projeto para disponibilizar `BLOB_READ_WRITE_TOKEN` nos ambientes de produção e preview. Não salve esse token no repositório. O código antigo em `server/` é mantido apenas para instalações Express/MySQL legadas; a Vercel usa as funções em `api/`.

Cada lançamento tem uma data de referência, ID estável e arquivo próprio, permitindo consultas por dia ou por mês. A interface não exige login; pessoas com acesso público ao endereço podem consultar e alterar os registros. Faça backup periódico por Excel.

## Desenvolvimento

Node.js 22+, pnpm 11.25.0. Execute `pnpm install`, `pnpm dev:web` para a interface e use `vercel dev` para testar as funções com o armazenamento conectado. `pnpm build` e `pnpm exec tsc --noEmit` verificam o frontend.
