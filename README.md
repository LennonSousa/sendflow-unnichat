# SendFlow

Aplicação de broadcast com React, TypeScript, Vite e Firebase. O repositório separa a interface em `web/` e as Cloud Functions em `functions/`.

## Estrutura de dados

São usadas somente collections de nível superior no Firestore:

- `connections`: `{ tenantId, name, createdAt, updatedAt }`
- `contacts`: `{ tenantId, connectionId, name, phone, createdAt, updatedAt }`
- `messages`: `{ tenantId, connectionId, contactIds, body, status, scheduledAt, createdAt, updatedAt }`

O `tenantId` é sempre o UID obtido da sessão do Firebase Authentication. As regras do Firestore comparam o UID autenticado com `tenantId` em leituras e gravações e conferem que contatos e mensagens referenciem uma conexão do mesmo tenant. As Cloud Functions repetem as verificações antes de executar operações privilegiadas. Não são usadas subcoleções.

## Requisitos locais

- Node.js 22 ou superior
- Projeto Firebase com Authentication (e-mail/senha), Firestore, Functions e Hosting

## Configuração

1. Crie um projeto Firebase e registre uma aplicação Web.
2. Ative o método de autenticação por e-mail e senha e crie o banco Firestore.
3. Copie `web/.env.example` para `web/.env.local` e preencha as credenciais da aplicação Web.
4. Selecione o projeto Firebase para o Firebase CLI antes de publicar.

As variáveis `VITE_*` são públicas no bundle web. Não coloque credenciais de conta de serviço ou outras chaves privadas nelas.

## Desenvolvimento e validação

```sh
npm install
npm run dev
npm run build
npm run build:functions
npm run lint
```

## Emuladores

Execute os emuladores Auth, Firestore e Functions nas portas definidas em `firebase.json` e defina `VITE_USE_FIREBASE_EMULATORS=true` em `web/.env.local`. Inicie o Vite em outro terminal.

## Mensagens e agendamento

O envio é uma simulação, sem integração com SMS ou WhatsApp. Mensagens imediatas são registradas como `sent`; mensagens futuras ficam como `scheduled`. A Cloud Function `sendScheduledBroadcasts` verifica a cada minuto as mensagens vencidas e as atualiza para `sent`, mesmo que nenhum cliente esteja conectado.

A função agendada usa Cloud Scheduler. Para implantá-la no Firebase é necessário habilitar faturamento/Plano Blaze no projeto. A precisão do disparo é de até aproximadamente um minuto, conforme a periodicidade do agendador.

As mensagens podem ser editadas e excluídas no histórico; essas alterações passam por Cloud Functions que verificam o `tenantId` antes de acessar o registro.

## Firebase Hosting

O Hosting publica `web/dist`. O predeploy executa o build da interface. Publique Hosting, Firestore Rules, índices e Functions depois de configurar seu projeto Firebase:

```sh
npx firebase-tools deploy
```
