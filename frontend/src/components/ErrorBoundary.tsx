import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface border border-border rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-primary mb-3">Something went wrong</h1>
            <p className="text-secondary mb-8">
              An unexpected error occurred. Don't worry, your data is safe.
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Try Refreshing
              </button>
              
              <button 
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-primary font-bold py-3.5 rounded-xl border border-white/10 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" /> Back to Home
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="mt-8 p-4 bg-black/40 rounded-xl text-left overflow-auto max-h-40">
                <p className="text-xs font-mono text-red-400 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
