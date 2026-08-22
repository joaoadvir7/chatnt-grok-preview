# Login por e-mail (Better Auth)

## O que mudou (mínimo)

1. `src/lib/auth/email-password.ts` → `emailAndPasswordEnabled = true`
2. Rota `src/routes/api/auth/$.ts` — handler Better Auth
3. Tela `/login` — Entrar / Cadastrar com e-mail + senha
4. `AppShell` exige sessão real (não altera Live Chat, automações, store CRM)
5. Menu **Sair** chama `signOut()` e volta para `/login`

## Cadastros reais

- Usuários ficam nas tabelas Better Auth (`user`, `session`, `account`) em PGLite (preview) ou Postgres (`DATABASE_URL` em produção).
- Cada pessoa cria a própria conta em **Cadastrar**.
- Se o e-mail coincidir com um agente já listado em Atendentes, o `activeAgentId` é alinhado automaticamente.

## O que NÃO mudou

- Zustand do CRM (contatos, conversas, WABA tokens no localStorage)
- Motor de automação, broadcasts, conexões Meta
- Encerrar o dia / PIN (continua no menu Conta → Segurança)

## Como usar

1. Abrir `/login`
2. **Cadastrar** com nome, e-mail e senha (≥ 8 caracteres)
3. Depois só **Entrar**
4. **Sair** no menu do rodapé da sidebar encerra a sessão
