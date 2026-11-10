# Produtividade de motoristas · Alencar Log

Painel diário e mensal para acompanhar perna inteira, meia perna, total de movimentos, tempo de operação e containers por hora. A visão mensal consolida motoristas pelo nome e mostra os dias trabalhados; sua exportação Excel inclui resumo por motorista e todos os lançamentos datados. O Excel diário mantém as abas “Painel diário” e “Todos os dados”, com fórmulas e horários editáveis. PDF e JPEG exportam o painel exibido.

## Produção na Vercel

O frontend Vite usa as funções em `api/productivity/` para persistir cada lançamento em um Vercel Blob privado. A conta do STATUS OPERACIONAL no projeto Supabase `grupo-alencar-operacional` autentica os dois administradores existentes; a API valida cada token no servidor e só aceita `admin@alencarlog.com.br` e `admin1@alencarlog.com.br`. Não é preciso criar outras contas. A sessão deste site é própria do domínio, então entre aqui com o mesmo e-mail e senha. Os dados não ficam no navegador: duas máquinas com acesso ao site consultam o mesmo armazenamento; o painel atualiza ao voltar ao foco e a cada 30 segundos enquanto estiver aberto.

Configure `BLOB_READ_WRITE_TOKEN`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no projeto Vercel. A chave publishable pode ser incluída no frontend; nunca use a chave secret/service role nele. Não salve tokens no repositório. O código antigo em `server/` permanece apenas para instalações Express/MySQL legadas; a Vercel usa `api/`.

## Desenvolvimento

Node.js 22+, pnpm 11.25.0. Execute `pnpm install`, `pnpm dev:web` para a interface e use `vercel dev` para testar as funções com as variáveis conectadas. `pnpm build` e `pnpm exec tsc --noEmit` verificam o frontend.

## Recuperação de senha

O login oferece “Criar ou recuperar senha” para os dois administradores existentes. O Supabase envia um link para o e-mail cadastrado; a página aceita o retorno automático e oferece a validação manual do link caso o redirecionamento do projeto de Auth aponte para outro endereço. A alteração da senha afeta também o STATUS OPERACIONAL, pois os dois sites usam a mesma identidade no mesmo projeto Supabase. Nenhuma senha é armazenada no código ou enviada ao servidor Vercel.
