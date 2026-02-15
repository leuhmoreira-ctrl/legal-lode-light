

## Plano de Correção dos Erros de Build

### Problema Principal
O arquivo `src/App.tsx` tem tags JSX desalinhadas -- tags de fechamento (`</ErrorBoundary>`, `</ThemeContextProvider>`) que não correspondem às tags de abertura. Alem disso, dois arquivos de pagina importados (`Mensagens` e `Email`) nao existem mais.

### Correções

**1. Corrigir `src/App.tsx` (erro critico)**

Reescrever a estrutura de providers com a hierarquia correta:

```text
QueryClientProvider
  ThemeProvider
    ThemeContextProvider        <-- adicionar abertura
      TooltipProvider
        Toaster
        AuthProvider
          PermissionsProvider
            BrowserRouter
              ErrorBoundary     <-- adicionar abertura
                Routes
                  ...rotas...
              /ErrorBoundary
            /BrowserRouter
          /PermissionsProvider
        /AuthProvider
      /TooltipProvider
    /ThemeContextProvider       <-- já existe no fechamento
  /ThemeProvider
/QueryClientProvider
```

Remover imports de `Mensagens` e `Email` (arquivos inexistentes) e substituir suas rotas por redirecionamentos `Navigate to="/comunicacoes"`.

**2. Corrigir `supabase/functions/sync-process/index.ts` (erro secundario)**

Na linha 156, `error` é do tipo `unknown`. Corrigir com:
```typescript
JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
```

### Detalhes Técnicos

Mudancas em 2 arquivos:
- `src/App.tsx`: Corrigir hierarquia JSX, remover imports quebrados, adicionar redirects
- `supabase/functions/sync-process/index.ts`: Tipar corretamente o `error` no catch

Nenhuma funcionalidade sera removida. As rotas `/mensagens` e `/email` redirecionarao automaticamente para `/comunicacoes`.
