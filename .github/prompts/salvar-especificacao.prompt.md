---
description: "Gera ou atualiza a especificação do DMS a partir de requisitos ou de um plano aprovado, salvando apenas o documento, sem implementar código."
name: salvar-especificacao
argument-hint: "Requisitos ou plano aprovado a incorporar na especificação."
agent: agent
tools: ['read', 'search', 'edit']
---

# Salvar especificação do DMS

Gere ou atualize a especificação usando os requisitos ou o plano aprovado
informados na mensagem. Na ausência deles, use o plano aprovado no contexto;
se também estiver ausente, peça os requisitos antes de editar.

## Referências

- [Instruções do projeto](../copilot-instructions.md).
- [Modelo obrigatório](../../docs/specs/spec-template.md).
- [Especificação atual](../../docs/specs/dms-spec.md), se existente.

## Procedimento

1. Leia o modelo, as instruções e a especificação existente. Consulte código
   próximo apenas para esclarecer contratos ou convenções relevantes.
2. Preserve decisões e requisitos existentes que não foram substituídos pelo
   pedido. Não apresente funcionalidades planejadas como já implementadas.
3. Preencha todas as seções do modelo: objetivo, escopo, requisitos funcionais
   e não funcionais, modelo de dados, contratos de API, decisões arquiteturais
   e plano de execução. Detalhe entrada, saída, status HTTP e erros das APIs.
4. No plano, indique a ordem das etapas futuras, arquivos envolvidos, critérios
   de aceite e riscos. Identifique suposições; peça confirmação quando uma decisão
   pendente alterar escopo, segurança ou contratos existentes.
5. Salve somente `docs/specs/dms-spec.md`. Outro nome dentro de `docs/specs`
   só pode ser usado quando solicitado explicitamente. Preserve o modelo.
6. Confira a cobertura das seções, a coerência dos contratos e os links locais.
   Informe o caminho salvo, um resumo das mudanças e eventuais decisões pendentes.

## Restrições

- A execução deste prompt entrega apenas o documento; não execute as etapas do plano.
- Não altere backend, frontend, testes, dependências ou personalizações do chat.
- Não execute comandos, inicie servidores, faça commits ou pushes.
- Não delegue implementação nem acione handoffs para implementá-la.
- Preserve a Clean Architecture simples `routes -> controllers -> services -> repositories`,
  Multer com `diskStorage` no filesystem local e metadados em memória.
- Não introduza armazenamento externo ou autenticação fora do escopo aprovado.