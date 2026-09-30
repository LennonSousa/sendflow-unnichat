# SendFlow

Projeto de teste para organizar conexões e contatos e simular o envio de mensagens em grupo. A interface fica em `web/` e as Cloud Functions, em `functions/`.

Feito com React, TypeScript, Vite, Material UI, Tailwind CSS e Firebase.

## Rodar localmente

Você precisa do Node.js 22 ou mais recente e de um projeto Firebase.

1. No Firebase Console, crie uma aplicação Web, ative o login por e-mail e senha e crie o Firestore.
2. Copie `web/.env.example` para `web/.env.local` e preencha os valores da configuração Web do Firebase.
3. Na raiz do projeto, instale as dependências e inicie o app:

```sh
npm install
npm run dev
```

Para conferir o projeto e as Functions:

```sh
npm run build
npm run build:functions
npm run lint
```

## Como os dados ficam separados

O Firestore usa três collections, sem subcollections: `connections`, `contacts` e `messages`. Cada documento tem um `tenantId`, que é o UID do usuário autenticado. Contatos e mensagens também guardam o `connectionId`.

As regras do Firestore limitam o acesso aos documentos do próprio usuário. As operações de mensagem e a exclusão de uma conexão passam pelas Cloud Functions, que também verificam a conta dona dos dados.

## Mensagens agendadas

O envio é simulado: não há integração com SMS ou WhatsApp. Mensagens imediatas ficam como `sent`; as agendadas ficam como `scheduled` e uma Cloud Function as marca como enviadas quando chega o horário.

A verificação roda a cada minuto usando Cloud Scheduler. Para publicar Functions e usar esse agendamento, o projeto Firebase precisa do plano Blaze, que pode gerar cobranças.

## Publicar

Configure o projeto no Firebase CLI e execute, na raiz:

```sh
npx firebase-tools deploy
```

O Hosting publica `web/dist`. As regras e os índices do Firestore estão em `firestore.rules` e `firestore.indexes.json`.
