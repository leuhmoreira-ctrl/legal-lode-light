import React from 'react';
import { AlertTriangle, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  expanded: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, expanded: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, expanded: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[50vh] p-6 animate-in fade-in zoom-in duration-300">
          <Card className="max-w-md w-full border-destructive/20 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3 text-destructive">
                <div className="p-2 bg-destructive/10 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl">Algo deu errado</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Ocorreu um erro ao renderizar este componente. Tente recarregar a página.
              </p>

              {this.state.error && (
                <div className="text-sm font-mono bg-muted p-3 rounded-md overflow-x-auto border">
                  {this.state.error.message}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full gap-2"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recarregar Página
                </Button>

                <div className="pt-2">
                  <button
                    onClick={() => this.setState(s => ({ expanded: !s.expanded }))}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {this.state.expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Detalhes técnicos
                  </button>

                  {this.state.expanded && this.state.errorInfo && (
                    <pre className="mt-2 text-[10px] bg-black/5 p-2 rounded overflow-auto h-32 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
