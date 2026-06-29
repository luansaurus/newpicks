'use client';
import { useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    
    // Simulação de chamada ao Supabase
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  return (
    
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-400">E-mail</label>
        <input
          type="email"
          className="w-full bg-card border border-border rounded-lg p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          placeholder="seu@email.com"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-400">Senha</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className="w-full bg-card border border-border rounded-lg p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3.5 text-slate-400 hover:text-primary"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button
        disabled={isLoading}
        className="w-full bg-primary text-slate-950 font-bold py-3 rounded-lg hover:bg-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
      >
        {isLoading ? <Loader2 className="animate-spin" /> : 'Entrar na Arena'}
      </button>

      <div className="text-center space-y-2 text-sm">
        <a href="/forgot-password" className="text-slate-400 hover:text-primary transition-colors block">
          Esqueci minha senha
        </a>
        <p className="text-slate-500">
          Não tem conta?{' '}
          <a href="/signup" className="text-primary font-semibold hover:underline">
            Cadastre-se agora
          </a>
        </p>
      </div>
      
    </form>
  );
}