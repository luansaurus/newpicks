'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { useTheme } from '@/context/ThemeContext';
import { Loader2, User, Mail, Lock, ShieldOff } from 'lucide-react';
import Link from 'next/link';

interface Team {
  id: number;
  name: string;
  country_code: string | null;
  short_code: string;
  logo_url: string;
  main_color: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const { applyTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', username: '' });
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isButtonTextDark, setIsButtonTextDark] = useState(true);

  // Calcula o contraste para o botão principal baseado na cor do time
  const calculateBrightness = (hex: string) => {
    if (!hex) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    setIsButtonTextDark(brightness > 155);
  };

  // Busca todos os times no carregamento
  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase.from('teams').select('*');
      if (data) setTeams(data);
    };
    fetchTeams();
  }, []);

  // Agrupa os times por país, ignorando o placeholder "Sem Time"
  const groupedTeams = teams
    .filter((team) => team.short_code !== 'S/T') // Filtra o placeholder
    .reduce((acc: any, team) => {
      const code = team.country_code || 'Outros';
      (acc[code] = acc[code] || []).push(team);
      return acc;
    }, {});

  // Lida com a seleção de time ou "Sem Time"
  const handleTeamSelection = (team: Team | null) => {
    if (team) {
      setSelectedTeam(team);
      applyTheme(team.main_color);
      calculateBrightness(team.main_color);
    } else {
      // Se clicou em "Sem Time", busca o registro correspondente (ID 41 ou S/T)
      const noTeamPlaceholder = teams.find((t) => t.short_code === 'S/T');
      if (noTeamPlaceholder) {
        setSelectedTeam(noTeamPlaceholder);
        applyTheme(noTeamPlaceholder.main_color);
        calculateBrightness(noTeamPlaceholder.main_color);
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validação de segurança no front-end
    if (!selectedTeam) {
      setError('Por favor, selecione um time ou escolha "Sem time".');
      setLoading(false);
      return;
    }

    try {
      // 1. Cria usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Cria o profile associando ao ID selecionado (mesmo se for o ID 41 "S/T")
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            username: formData.username.trim().toLowerCase(),
            user_team: selectedTeam.id,
          },
        ]);

        if (profileError) {
          if (profileError.code === '23505') {
            throw new Error('Este username já está em uso.');
          }
          throw profileError;
        }

        // Sucesso: Redireciona
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao criar a conta.');
    } finally {
      setLoading(false);
    }
  };

return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Glow dinâmico */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 blur-[120px] transition-colors duration-1000"
        style={{ background: `radial-gradient(circle at 50% 50%, var(--color-primary), transparent 70%)` }}
      />

      {/* Adicionado 'relative z-10' aqui */}
      <form onSubmit={handleSignUp} className="w-full max-w-2xl bg-card border border-border p-8 rounded-3xl shadow-2xl relative z-10">
        <header className="mb-8">
          <h1 className="text-4xl font-display font-[500] text-white uppercase tracking-tighter">Criar Conta</h1><p className="text-slate-400">Personalize seu perfil para o Bolão.</p>
        </header>
        
        {/* Formulário de Dados */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <User className="absolute left-3 top-3.5 text-slate-500" size={18} />
            <input 
              required
              className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all" 
              placeholder="Username" 
              onChange={(e) => setFormData({...formData, username: e.target.value})} 
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
            <input 
              required
              type="email" 
              className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all" 
              placeholder="E-mail" 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
            />
          </div>
        </div>
        <div className="relative mb-8">
          <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
          <input 
            required
            type="password" 
            className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all" 
            placeholder="Senha" 
            onChange={(e) => setFormData({...formData, password: e.target.value})} 
          />
        </div>

        {/* Seleção de Times */}
        <div className="space-y-4 mb-8">
          <label className="text-xs font-bold uppercase text-slate-500">Selecione seu Time</label>
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            
            {/* Abas de Países */}
            {Object.keys(groupedTeams).map((country) => {
              const isSelected = selectedCountry === country && selectedTeam?.short_code !== 'S/T';
              return (
                <button 
                  key={country} 
                  type="button" 
                  onClick={() => setSelectedCountry(country)}
                  className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all whitespace-nowrap ${
                    isSelected 
                      ? `border-transparent ${isButtonTextDark ? 'text-slate-950' : 'text-white'}` 
                      : 'bg-background border-border text-slate-400'
                  }`}
                  style={{ backgroundColor: isSelected ? 'var(--color-primary)' : '' }}
                >
                  {country === 'ENG' ? '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League' : country === 'GER' ? '🇩🇪 Bundesliga' : country}
                </button>
              );
            })}

            {/* Botão Sem Time */}
            <button 
              type="button" 
              onClick={() => {
                setSelectedCountry(null);    // Reseta a aba do país
                handleTeamSelection(null);   // Aplica o placeholder S/T
              }}
              className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all whitespace-nowrap ${
                selectedTeam?.short_code === 'S/T'
                  ? 'bg-slate-600 text-white border-slate-500' 
                  : 'bg-background border-border text-slate-400'
              }`}
            >
              <ShieldOff size={16} className="inline mr-1" /> Sem time
            </button>
          </div>

          {/* Grid de Escudos (Só renderiza se houver um país selecionado e não for "Sem time") */}
          {selectedCountry && selectedTeam?.short_code !== 'S/T' && (
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 p-3 bg-background/50 rounded-xl border border-border">
              {groupedTeams[selectedCountry].map((team: Team) => (
                <button 
                  key={team.id} 
                  type="button" 
                  onClick={() => handleTeamSelection(team)}
                  className={`aspect-square p-2 rounded-xl border-2 flex items-center justify-center transition-all ${
                    selectedTeam?.id === team.id ? 'border-primary bg-primary/10' : 'border-transparent bg-card hover:border-slate-600'
                  }`}
                >
                  <img src={team.logo_url} alt={team.name} className="max-w-full max-h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Exibição de Erros */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        {/* Botão de Submit Dinâmico */}
        <button 
          disabled={loading}
          className={`w-full font-bold py-4 rounded-xl transition-all flex justify-center items-center ${
            isButtonTextDark ? 'text-slate-950' : 'text-white'
          }`}
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {loading ? <Loader2 className="animate-spin" /> : 'FINALIZAR CADASTRO'}
        </button>
        
        <footer className="text-center text-sm text-slate-500 mt-6">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-primary font-bold hover:underline" style={{ color: 'var(--color-primary)' }}>
            Fazer Login
          </Link>
        </footer>
      </form>
    </main>
  );
}