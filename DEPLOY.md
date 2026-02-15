# Como Fazer o Deploy do Legal Lode Light

Este projeto já está otimizado e configurado para rodar em produção.

## Requisitos

- Uma conta no GitHub.
- Uma conta no [Vercel](https://vercel.com) (recomendado) ou Netlify.

## Passo a Passo (Vercel)

1.  Acesse seu painel na **Vercel** e clique em **Add New...** > **Project**.
2.  Importe o repositório `legal-lode-light`.
3.  A Vercel deve detectar automaticamente que este é um projeto **Vite**.
    *   **Build Command:** `npm run build`
    *   **Output Directory:** `dist`
4.  Certifique-se de configurar as variáveis de ambiente necessárias (como `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`) nas configurações do projeto na Vercel (aba **Settings** > **Environment Variables**).
5.  Clique em **Deploy**.

## Sobre a Configuração

Este projeto inclui um arquivo `vercel.json` na raiz:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Isso garante que o roteamento do React (Client-Side Routing) funcione corretamente, redirecionando todas as requisições para o `index.html`.

## Funcionalidades Incluídas nesta Versão

-   **Performance:** Cache de processos (React Query) e remoção de queries lentas.
-   **Notificações:** Alertas de prazos (7, 3, 1 dias).
-   **UX:** Modo Escuro e Skeletons de carregamento.
-   **Filtros:** Busca avançada por data de movimentação.
