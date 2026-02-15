

## Unificar Notificacoes e Comunicacoes

### Objetivo
Fundir as paginas `/notifications` e `/comunicacoes` em uma unica pagina `/comunicacoes` com abas que mostram: Notificacoes do sistema, Mensagens internas e E-mails (mock por enquanto).

### Mudancas

**1. Pagina `src/pages/Comunicacoes.tsx` -- Reescrever**

Criar uma pagina unificada com 3 abas usando o componente Tabs existente:
- **Todas**: lista unificada ordenada por data (notificacoes + mensagens + emails mock)
- **Notificacoes**: alertas de prazo, sistema (`notifications` table)
- **Mensagens**: mensagens internas entre usuarios (`messages` table)
- **E-mails**: emails mock (dados estaticos, como ja existe)

Layout: barra de abas no topo + area de conteudo abaixo. Ao selecionar uma mensagem/email, abre o visualizador no lado direito (layout duas colunas, como esta hoje). Notificacoes apenas marcam como lida ao clicar.

Badge de contagem nao-lida em cada aba.

**2. Sidebar `src/components/AppSidebar.tsx`**

- Remover o item "Notificacoes" separado do `mainNavItems`
- Manter apenas "Comunicacoes" com badge unificado (notificacoes nao lidas + mensagens nao lidas)

**3. Rota `/notifications` -- Redirecionar**

Em `src/App.tsx`, trocar a rota `/notifications` de renderizar `<Notifications />` para `<Navigate to="/comunicacoes" replace />`.

**4. Hook unificado `src/hooks/useComunicacoesUnificadas.ts` -- Criar**

Combinar dados de `useNotifications` e `useMessages` em um unico hook que retorna:
- Lista unificada de itens (tipo: notification | message | email)
- Contadores de nao lidos por categoria
- Funcoes: markAsRead, markAllAsRead, sendMessage, deleteNotification

**5. Componentes existentes -- Reaproveitar**

- `NotificationItem.tsx`: manter para renderizar notificacoes na lista
- `MessagesList.tsx` e `MessageView.tsx`: manter para mensagens
- `ComposeModal.tsx`: manter o botao de nova mensagem

### Detalhes Tecnicos

Arquivos modificados:
- `src/pages/Comunicacoes.tsx` -- reescrever com abas unificadas
- `src/components/AppSidebar.tsx` -- remover item Notificacoes, unificar badge
- `src/App.tsx` -- redirecionar `/notifications` para `/comunicacoes`
- `src/hooks/useComunicacoesUnificadas.ts` -- novo hook que combina useNotifications + useMessages

Arquivos mantidos sem alteracao:
- `src/hooks/useNotifications.ts`
- `src/hooks/useMessages.ts`
- `src/components/NotificationItem.tsx`
- `src/components/comunicacoes/MessageView.tsx`
- `src/components/comunicacoes/ComposeModal.tsx`

Nenhuma alteracao de banco de dados necessaria. Ambas as tabelas (`notifications` e `messages`) ja existem com RLS.
