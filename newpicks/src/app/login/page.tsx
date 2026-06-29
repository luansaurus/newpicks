'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { useTheme } from '@/context/ThemeContext';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { applyTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isButtonTextDark, setIsButtonTextDark] = useState(true);

  // Carrega o tema salvo no localStorage no momento da montagem
  useEffect(() => {
    const savedColor = localStorage.getItem('team_primary_color');
    if (savedColor) {
      applyTheme(savedColor);
      const r = parseInt(savedColor.slice(1, 3), 16);
      const g = parseInt(savedColor.slice(3, 5), 16);
      const b = parseInt(savedColor.slice(5, 7), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      setIsButtonTextDark(brightness > 155);
    }
  }, [applyTheme]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Busca o perfil para aplicar a regra de roteamento de segurança
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username, user_team')
          .eq('id', authData.user.id)
          .single();

        // Se o perfil não existir ou faltar dados obrigatórios, vai para a tela de setup
        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        if (!profile || !profile.username || !profile.user_team) {
          router.push('/profile');
          return;
        }

        // Tudo preenchido, vai para a Dashboard
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Brilho de fundo reativo */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 blur-[120px] transition-colors duration-1000"
        style={{ background: `radial-gradient(circle at 50% 50%, var(--color-primary), transparent 70%)` }}
      />

      <div className="w-full max-w-md bg-card border border-border p-8 rounded-3xl shadow-2xl relative z-10">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-display font-[500] text-white uppercase tracking-tighter">
            Entrar na <span className="text-primary">Arena</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie seus palpites e acompanhe o ranking.</p>
        </header>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500 ml-1">E-mail</label>
            <input
              required
              type="email"
              className="w-full bg-background border border-border rounded-xl p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              placeholder="seu@email.com"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-500 ml-1">Senha</label>
            <input
              required
              type="password"
              className="w-full bg-background border border-border rounded-xl p-3 text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              placeholder="••••••••"
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-red-500 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            disabled={loading}
            className={`w-full font-bold py-4 rounded-xl transition-all flex justify-center items-center cursor-pointer ${
              isButtonTextDark ? 'text-slate-950' : 'text-white'
            }`}
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {loading ? <Loader2 className="animate-spin" /> : 'ENTRAR'}
          </button>

          <footer className="text-center text-sm text-slate-500 pt-2">
            Novo por aqui?{' '}
            <Link href="/signup" className="text-primary font-bold hover:underline" style={{ color: 'var(--color-primary)' }}>
              Criar uma conta
            </Link>
          </footer>
        </form>
      </div>
    </main>
  );
}