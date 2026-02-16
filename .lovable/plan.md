
# Plano de Correcao dos Erros de Build

## Erro 1: "cn is not defined" em Kanban.tsx

**Causa:** O arquivo `src/pages/Kanban.tsx` usa a funcao `cn()` na linha 367 mas nao a importa.

**Correcao:** Adicionar o import `import { cn } from "@/lib/utils";` no topo do arquivo, junto aos outros imports.

---

## Erro 2: Erros TypeScript em useClientes.ts

**Causa:** A tabela `clientes` nao existe no schema do banco de dados (arquivo de tipos gerado automaticamente). As chamadas `supabase.from("clientes")` falham na tipagem. Alem disso, os `@ts-expect-error` nas linhas 29 e 52 estao marcados como "unused" porque o erro real esta nas chamadas `.from()` (linhas 16, 31, 54), nao nas linhas seguintes.

**Correcao:** 
- Remover os `@ts-expect-error` das linhas 29 e 52
- Adicionar `@ts-expect-error` antes de cada chamada `.from("clientes")` nas linhas 15-16, 30-31 e 53-54
- Tambem adicionar na linha 82-83 (delete) e 97 (select em processos, que pode ter o mesmo problema)

---

## Detalhes Tecnicos

### Arquivo 1: `src/pages/Kanban.tsx`
- Linha 1: Adicionar `import { cn } from "@/lib/utils";` aos imports existentes

### Arquivo 2: `src/hooks/useClientes.ts`
- Linha 15: Adicionar `// @ts-expect-error - tabela clientes nao esta nos tipos gerados` antes do `const { data, error } = await supabase`
- Linha 29: Remover o `@ts-expect-error` existente (que esta no lugar errado)
- Linha 52: Remover o `@ts-expect-error` existente (que esta no lugar errado)  
- Mover os comentarios `@ts-expect-error` para ficarem imediatamente antes das linhas com `.from("clientes")`
- Linha 82: Verificar se o `@ts-expect-error` ja esta posicionado corretamente

### Resultado esperado
- Build sem erros TypeScript
- Pagina `/minhas-tarefas` e `/kanban` funcionando sem o erro "cn is not defined"
