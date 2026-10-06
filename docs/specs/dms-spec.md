# Especificação - Document Management System

## 1. Objetivo

Permitir que um usuário envie, consulte e baixe documentos armazenados no filesystem local da aplicação, mantendo seus metadados em memória.

## 2. Escopo

### Dentro do escopo

- Enviar um documento por requisição.
- Listar os documentos associados ao usuário.
- Baixar um documento pelo identificador.
- Registrar metadados em memória durante a execução do backend.
- Gravar arquivos em `backend/storage` com Multer e `diskStorage`.
- Apresentar as operações em uma interface React que consome a API via `/api`.

### Fora do escopo

- Armazenamento em nuvem ou provedores externos.
- Versionamento, edição ou exclusão de documentos.
- Persistência dos metadados após reinício do backend.
- Cadastro, autenticação e gestão de credenciais de usuários.
- Compartilhamento de documentos entre usuários.
- Busca avançada e paginação.

## 3. Atores e identidade

O usuário pode enviar, listar e baixar documentos próprios. O backend deve obter o identificador do proprietário de um contexto confiável (`req.user.id`), sem aceitar `owner` do corpo ou da query string.

Autenticação não faz parte desta entrega. Até que exista um mecanismo de autenticação, o ambiente deve fornecer uma identidade única por configuração (`DMS_OWNER_ID`), adequada somente para desenvolvimento ou uso local de usuário único. O sistema não deve ser exposto como multiusuário sem uma fonte confiável de identidade e autorização.

## 4. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo usando `multipart/form-data`, no campo `file`. |
| RF-02 | O backend deve rejeitar a requisição de upload quando o arquivo estiver ausente ou exceder o limite configurado. |
| RF-03 | O backend deve gravar o arquivo em `backend/storage`, usando Multer com `diskStorage` e um nome interno gerado pela aplicação. |
| RF-04 | Após um upload bem-sucedido, o sistema deve registrar e retornar os metadados do documento. |
| RF-05 | O usuário pode listar seus documentos, sem receber documentos associados a outro proprietário. |
| RF-06 | A listagem deve ser ordenada por data de upload decrescente. |
| RF-07 | O usuário pode baixar um documento próprio por seu identificador. |
| RF-08 | O download deve apresentar o nome original como nome de arquivo para o cliente, sem usar esse nome como caminho no filesystem. |
| RF-09 | O sistema deve retornar erro `404` quando o documento não existir, não pertencer ao usuário ou seu arquivo não estiver disponível. |
| RF-10 | A interface deve permitir selecionar e enviar um arquivo, exibir os documentos listados e iniciar o download de um documento. |
| RF-11 | A interface deve apresentar estados de carregamento e mensagens de erro para falhas de upload, listagem e download. |

## 5. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O armazenamento de arquivos deve ser exclusivamente local, usando Multer com `diskStorage` em `backend/storage`. |
| RNF-02 | Os metadados devem permanecer em memória nesta fase e podem ser perdidos ao reiniciar o backend. |
| RNF-03 | Configurações operacionais devem ser obtidas de variáveis de ambiente, com padrões locais documentados. |
| RNF-04 | O nome interno do arquivo deve ser gerado pela aplicação, evitando travessia de diretório e colisões baseadas no nome original. |
| RNF-05 | Rotas e controllers tratam HTTP; services concentram regras de negócio; repositories cuidam da persistência. Dependências seguem `routes -> controllers -> services -> repositories`. |
| RNF-06 | A API deve usar JSON para respostas de sucesso com metadados e para respostas de erro, exceto pelo conteúdo binário do download. |
| RNF-07 | O backend deve validar entrada e tratar falhas de leitura e gravação de arquivos sem expor caminhos locais ou stack traces ao cliente. |
| RNF-08 | A aplicação frontend deve chamar a API por `/api`; o proxy de desenvolvimento do Vite encaminha as requisições ao backend local. |

## 6. Modelo de dados

Registro mantido em memória pelo repository. `storageName` é interno e nunca deve ser retornado pela API.

| Campo | Tipo | Visibilidade | Descrição |
| --- | --- | --- | --- |
| `id` | string | API e interno | Identificador único gerado pela aplicação. |
| `originalName` | string | API e interno | Nome do arquivo informado pelo cliente, usado apenas para exibição e download. |
| `storageName` | string | Interno | Nome seguro gerado para localizar o arquivo em `backend/storage`. |
| `size` | number | API e interno | Tamanho do arquivo em bytes. |
| `mimeType` | string | API e interno | Tipo de mídia informado/detectado no upload, quando disponível. |
| `uploadedAt` | string | API e interno | Data e hora do recebimento, em ISO 8601 UTC. |
| `owner` | string | API e interno | Identificador do proprietário obtido do contexto confiável do usuário. |

### Regras de consistência

- `id` e `storageName` não devem ser derivados de `originalName`.
- A resposta da API não inclui caminho absoluto nem `storageName`.
- A listagem filtra registros por `owner`.
- A ausência do arquivo correspondente no filesystem torna o download indisponível e deve resultar em `404`.
- Arquivos podem permanecer órfãos no filesystem após reinício, pois os metadados não são persistidos nesta fase.

## 7. Contratos de API

As rotas do backend são `/upload`, `/documents` e `/documents/:id/download`. O frontend usa o prefixo `/api`, removido pelo proxy do Vite em desenvolvimento.

### Formato de erro

```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "O arquivo excede o tamanho máximo permitido."
  }
}
```

O campo `code` é estável para tratamento pelo cliente; `message` é legível e não deve revelar detalhes internos.

### `POST /api/upload`

Envia um documento.

- Content-Type: `multipart/form-data`
- Campo obrigatório: `file`
- O proprietário vem do contexto confiável da requisição, não do formulário.
- Limite padrão: 10 MiB, configurável por `MAX_FILE_SIZE_BYTES`.

Sucesso: `201 Created`

```json
{
  "id": "uuid",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "mimeType": "application/pdf",
  "uploadedAt": "2026-10-06T12:00:00.000Z",
  "owner": "user-123"
}
```

Erros previstos:

- `400 Bad Request` / `FILE_REQUIRED`: arquivo ausente ou campo inválido.
- `413 Payload Too Large` / `FILE_TOO_LARGE`: arquivo acima do limite.
- `500 Internal Server Error` / `UPLOAD_FAILED`: falha ao gravar o arquivo.

### `GET /api/documents`

Lista os documentos do usuário atual.

- Sem corpo de requisição.
- Retorna apenas documentos associados ao proprietário atual.
- Ordenação: `uploadedAt` decrescente.

Sucesso: `200 OK`

```json
{
  "documents": [
    {
      "id": "uuid",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "mimeType": "application/pdf",
      "uploadedAt": "2026-10-06T12:00:00.000Z",
      "owner": "user-123"
    }
  ]
}
```

Uma lista vazia é representada por `{"documents":[]}`.

### `GET /api/documents/:id/download`

Baixa o conteúdo binário de um documento próprio.

Sucesso: `200 OK`

- Corpo: bytes do arquivo.
- `Content-Type`: tipo de mídia registrado, ou `application/octet-stream` quando desconhecido.
- `Content-Disposition`: attachment com o nome original devidamente codificado.
- O caminho local não é retornado ao cliente.

Erros previstos:

- `404 Not Found` / `DOCUMENT_NOT_FOUND`: documento inexistente, de outro proprietário ou arquivo indisponível.
- `500 Internal Server Error` / `DOWNLOAD_FAILED`: outra falha de leitura.

## 8. Configuração

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Limite máximo de tamanho do upload, em bytes. |
| `DMS_STORAGE_DIR` | `backend/storage` | Diretório local usado para armazenar os arquivos. |
| `DMS_OWNER_ID` | `local-user` | Identidade única de desenvolvimento enquanto não houver autenticação. Não deve ser usado como mecanismo de autenticação em ambiente multiusuário. |

## 9. Decisões arquiteturais

- Backend em Node.js, Express e CommonJS.
- `routes/` declara endpoints e encaminha chamadas aos controllers.
- `controllers/` valida entrada HTTP, define status e serializa respostas.
- `services/` aplica regras de upload, propriedade, listagem e download.
- `repositories/` encapsula os metadados em memória e o acesso aos arquivos locais.
- Multer com `diskStorage` é usado para receber e gravar uploads no filesystem local.
- Frontend em React com componentes funcionais; chamadas HTTP ficam em `services/` e usam `fetch` com `/api`.
- Autenticação real e persistência durável ficam fora desta versão.

## 10. Plano de execução

Este plano descreve etapas futuras de implementação. A entrega desta especificação consiste somente neste documento; nenhuma etapa de backend ou frontend é executada ao criá-lo.

1. **Estabelecer contratos e configuração**
   - Definir as variáveis de ambiente, formato de erros, limite de upload e contexto de identidade.
   - Arquivos futuros: documentação de configuração e testes de contrato.

2. **Implementar persistência local e regras de negócio**
   - Criar repository em memória para metadados e acesso encapsulado ao filesystem.
   - Criar service para upload, listagem filtrada por proprietário e download.
   - Arquivos futuros: `backend/src/repositories/`, `backend/src/services/`.

3. **Implementar endpoints HTTP**
   - Configurar Multer com `diskStorage`, validação e tradução de erros.
   - Expor upload, listagem e download por rotas e controllers.
   - Arquivos futuros: `backend/src/routes/`, `backend/src/controllers/`, integração em `backend/src/app.js`.

4. **Construir a interface**
   - Implementar formulário de upload, listagem, feedback de estado e ação de download.
   - Arquivos futuros: `frontend/src/components/`, `frontend/src/pages/`, `frontend/src/services/`, `frontend/src/App.jsx`.

5. **Integrar e validar o fluxo**
   - Confirmar proxy `/api`, compatibilidade dos contratos e tratamento dos erros.
   - Adicionar testes backend para upload, listagem, propriedade, download e falhas.
   - Arquivos futuros: `backend/test/` e verificações de build do frontend.

## 11. Critérios de aceite

- Upload válido grava o arquivo localmente e retorna metadados sem expor o caminho interno.
- Upload sem arquivo ou acima do limite retorna o status e código de erro especificados.
- Listagem retorna somente documentos do proprietário atual, na ordem definida.
- Download de documento próprio retorna os bytes e nome original; documento ausente ou alheio retorna `404`.
- Frontend consome os endpoints via `/api` e apresenta sucesso, carregamento e erro nas operações.
- Testes backend cobrem os contratos e as regras principais; `npm test` do backend e `npm run build` do frontend passam.
- Nenhum serviço de armazenamento externo é introduzido.