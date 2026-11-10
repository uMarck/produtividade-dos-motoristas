# TODO — Produtividade Alencar Log

## Cadastro, persistência e cálculos
- [x] A primeira coluna operacional registra a ENTRADA NA BASE: hora inserível de quando o motorista chegou na empresa.
- [x] A segunda coluna operacional registra a SAÍDA DA BASE: hora em que o motorista iniciou o trabalho; a terceira registra o ENCERRAMENTO DA OPERAÇÃO: quando encerrou o trabalho.
- [x] A quarta coluna operacional é MÉDIA DE CONTAINER/HORA: calcula a quantidade de puxadas dividida pelas horas trabalhadas entre SAÍDA DA BASE e ENCERRAMENTO DA OPERAÇÃO.
- [x] TOTAL DE PERNAS é calculado como PERNA INTEIRA + MEIA PERNA; entradas do dia são persistidas no banco e podem ser editadas pelo site.
- [x] Os registros anteriores são mantidos e a ENTRADA NA BASE fica em branco quando nunca foi cadastrada; o site não inventa esse horário.

## Site e exports
- [x] O site apresenta as informações na ordem ENTRADA NA BASE, SAÍDA DA BASE, ENCERRAMENTO DA OPERAÇÃO, MÉDIA DE CONTAINER/HORA; mantém a data de referência, mês, ranking diário e gráficos existentes.
- [x] Ao exportar EXCEL, incluir a produtividade já inserida no site para a data selecionada, com todas as colunas/hora, dados de motorista e cálculos; permitir alterar as células de entrada no Excel, sem proteção da planilha, e recalcular médias/duração por fórmula.
- [x] PDF e JPEG exibem as colunas de horários e a média e incluem todos os motoristas do dia, mesmo que a tabela na tela esteja filtrada pela busca.
- [x] Todas as exportações seguem a identidade visual azul-marinho, ciano/azul elétrico e verde-lima e preservam nomes, dados e cálculos em tamanho legível.

## Publicação
- [ ] Publicar o checkpoint desta atualização no Manus, mantendo a privacidade do projeto.
- [ ] Deploy Vercel e envio da URL, pendentes: conta conectada retornou 403 ao criar projeto e backend público/persistência de produção aguardam resolução autorizada.
