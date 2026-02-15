

# Plano: Corrigir Tema Claro e Erros de Build

## Problema

O tema claro esta quebrado - a interface mostra cores escuras mesmo quando deveria estar no modo claro. Alem disso, existem erros de build que impedem a compilacao.

## Correcoes

### 1. Corrigir ThemeProvider (erro de build)

**Arquivo:** `src/components/ThemeProvider.tsx`

O tipo `ThemeProviderProps` nao e mais exportado pela versao atual do `next-themes`. Substituir pela tipagem inline usando `React.ComponentProps`.

### 2. Forcar tema claro como padrao

**Arquivo:** `src/App.tsx`

Alterar `defaultTheme="system"` para `defaultTheme="light"` no `ThemeProvider`, garantindo que o tema claro seja o padrao ao inves de herdar o tema do sistema (que pode ser escuro).

### 3. Corrigir erros no Email.tsx (erro de build)

**Arquivo:** `src/pages/Email.tsx`

O size `"xs"` nao existe no componente Button. Substituir todas as ocorrencias de `size="xs"` por `size="sm"`.

### 4. Corrigir erros no EmailConfig.tsx (erro de build)

**Arquivo:** `src/pages/EmailConfig.tsx`

A tabela `integracao_email` nao existe no schema do banco. Substituir as chamadas ao Supabase por logica local/mock para evitar erros de tipo, mantendo a funcionalidade visual intacta.

### 5. Revisar variaveis CSS do tema claro

**Arquivo:** `src/index.css`

Verificar e ajustar as variaveis CSS em `:root` (modo claro) para garantir contraste adequado:
- Background claro (`#f8fafc`) ja esta correto
- Card branco (`0 0% 100%`) ja esta correto
- Sidebar escura mantida (intencional)

## Resultado esperado

- A aplicacao carrega no tema claro por padrao
- Login, dashboard e demais paginas exibem fundo claro, cards brancos e texto escuro
- Todos os erros de build sao resolvidos
- O tema escuro continua funcionando se o usuario alternar manualmente

