'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { useTheme } from '@/context/ThemeContext';
import { Loader2, User, ShieldOff, AlertCircle, Globe, Shield } from 'lucide-react';

interface Team {
  id: number;
  name: string;
  country_code: string | null;
  short_code: string;
  logo_url: string;
  main_color: string;
  type: 'country' | 'club'; // Agora é obrigatório, vem do banco
}

export default function ProfilePage() {
  const router = useRouter();
  const { applyTheme } = useTheme();

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedType, setSelectedType] = useState<'club' | 'country' | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isButtonTextDark, setIsButtonTextDark] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const calculateBrightness = (hex: string) => {
    if (!hex) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    setIsButtonTextDark(brightness > 155);
  };

  useEffect(() => {
    const initializePage = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }
        setUserId(session.user.id);

        const { data: teamsData } = await supabase.from('teams').select('*');
        const allTeams = (teamsData || []) as Team[];
        
        setTeams(allTeams);

        const { data: profile } = await supabase
          .from('profiles')
          .select('username, user_team')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          if (profile.username) setUsername(profile.username);
          
          if (profile.user_team) {
            const currentTeam = allTeams.find(t => t.id === profile.user_team);
            if (currentTeam) {
              setSelectedTeam(currentTeam);
              applyTheme(currentTeam.main_color);
              calculateBrightness(currentTeam.main_color);
              
              // Usa o type do banco
              setSelectedType(currentTeam.type);
              if (currentTeam.type === 'club') {
                setSelectedCountry(currentTeam.country_code);
              } else {
                setSelectedCountry(null);
              }
            }
          }

          if (profile.username && profile.user_team) {
            setIsEditing(true);
          }
        }
      } catch (error) {
        console.error('Error initializing page:', error);
      } finally {
        setCheckingSession(false);
      }
    };

    initializePage();
  }, []);

  // Agrupa clubes por país (apenas times com type = 'club')
  const teamsByCountry = teams
    .filter((team) => team.type === 'club')
    .reduce((acc: Record<string, Team[]>, team) => {
      const code = team.country_code || 'Outros';
      if (!acc[code]) acc[code] = [];
      acc[code].push(team);
      return acc;
    }, {});

  // Lista de países únicos
  const countries = Object.keys(teamsByCountry).sort();

  // Times de seleções (type = 'country')
  const nationalTeams = teams.filter(team => team.type === 'country');

  const handleTeamSelection = (team: Team | null) => {
    if (team) {
      setSelectedTeam(team);
      applyTheme(team.main_color);
      calculateBrightness(team.main_color);
      
      // Usa o type do banco
      setSelectedType(team.type);
      if (team.type === 'club') {
        setSelectedCountry(team.country_code);
      } else {
        setSelectedCountry(null);
      }
    } else {
      setSelectedTeam(null);
      setSelectedType(null);
      setSelectedCountry(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setError(null);

    if (!username.trim()) {
      setError('O nome de usuário é obrigatório.');
      setLoading(false);
      return;
    }

    if (!selectedTeam) {
      setError('Por favor, selecione um clube ou uma seleção.');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username: username.trim().toLowerCase(),
          user_team: selectedTeam.id,
        });

      if (updateError) {
        if (updateError.code === '23505') {
          throw new Error('Este nome de usuário já está sendo utilizado por outro competidor.');
        }
        throw updateError;
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar dados cadastrais.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 blur-[120px] transition-colors duration-1000"
        style={{ background: `radial-gradient(circle at 50% 50%, var(--color-primary), transparent 70%)` }}
      />

      <form onSubmit={handleSaveProfile} className="w-full max-w-2xl bg-card border border-border p-8 rounded-3xl shadow-2xl relative z-10">
        <header className="mb-8">
          <h1 className="text-4xl font-display font-[500] text-white uppercase tracking-tighter">
            {isEditing ? 'Editar Perfil' : 'Configurar Perfil'}
          </h1>
          <p className="text-slate-400">
            {isEditing 
              ? 'Atualize seu nome de usuário ou troque seu time de coração.' 
              : 'Complete seus dados obrigatórios para liberar o acesso aos palpites.'}
          </p>
        </header>

        <div className="space-y-1 mb-6">
          <label className="text-xs font-bold uppercase text-slate-500 ml-1">Seu Username</label>
          <div className="relative">
            <User className="absolute left-3 top-3.5 text-slate-500" size={18} />
            <input
              required
              value={username}
              className="w-full bg-background border border-border rounded-xl p-3 pl-10 text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              placeholder="Ex: arena_palpites"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <label className="text-xs font-bold uppercase text-slate-500 ml-1">Escolha seu Time do Coração</label>
          
          {/* Box de seleção de tipo */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedType('club');
                setSelectedCountry(null);
                setSelectedTeam(null);
              }}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                selectedType === 'club' 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border bg-background hover:border-slate-600'
              }`}
            >
              <Shield size={20} className={selectedType === 'club' ? 'text-primary' : 'text-slate-400'} />
              <span className={`font-bold ${selectedType === 'club' ? 'text-primary' : 'text-slate-400'}`}>
                Clube
              </span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                setSelectedType('country');
                setSelectedCountry(null);
                setSelectedTeam(null);
              }}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                selectedType === 'country' 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border bg-background hover:border-slate-600'
              }`}
            >
              <Globe size={20} className={selectedType === 'country' ? 'text-primary' : 'text-slate-400'} />
              <span className={`font-bold ${selectedType === 'country' ? 'text-primary' : 'text-slate-400'}`}>
                Seleção
              </span>
            </button>
          </div>

          {/* Lista de países para clubes */}
          {selectedType === 'club' && (
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {countries.map((country) => {
                  const isSelected = selectedCountry === country;
                  return (
                    <button
                      key={country}
                      type="button"
                      onClick={() => setSelectedCountry(country)}
                      className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? `border-transparent ${isButtonTextDark ? 'text-slate-950' : 'text-white'}`
                          : 'bg-background border-border text-slate-400 hover:border-slate-600'
                      }`}
                      style={{ backgroundColor: isSelected ? 'var(--color-primary)' : '' }}
                    >
                      {country === 'ENG' ? '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra' : 
                       country === 'GER' ? '🇩🇪 Alemanha' : 
                       country === 'ESP' ? '🇪🇸 Espanha' :
                       country === 'ITA' ? '🇮🇹 Itália' :
                       country === 'FRA' ? '🇫🇷 França' :
                       country === 'POR' ? '🇵🇹 Portugal' :
                       country === 'NED' ? '🇳🇱 Holanda' :
                       country === 'BRA' ? '🇧🇷 Brasil' :
                       country === 'ARG' ? '🇦🇷 Argentina' :
                       country}
                    </button>
                  );
                })}
              </div>

              {selectedCountry && teamsByCountry[selectedCountry] && (
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 p-3 bg-background/50 rounded-xl border border-border">
                  {teamsByCountry[selectedCountry].map((team: Team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => handleTeamSelection(team)}
                      className={`aspect-square p-2 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                        selectedTeam?.id === team.id ? 'border-primary bg-primary/10' : 'border-transparent bg-card hover:border-slate-600'
                      }`}
                    >
                      {team.logo_url ? (
                        <img src={team.logo_url} alt={team.name} className="max-w-full max-h-full object-contain" />
                      ) : (
                        <span className="text-xs text-slate-400">{team.name}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lista de seleções */}
          {selectedType === 'country' && (
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 p-3 bg-background/50 rounded-xl border border-border">
              {nationalTeams.length > 0 ? (
                nationalTeams.map((team: Team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => handleTeamSelection(team)}
                    className={`aspect-square p-2 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                      selectedTeam?.id === team.id ? 'border-primary bg-primary/10' : 'border-transparent bg-card hover:border-slate-600'
                    }`}
                  >
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-xs text-slate-400">{team.name}</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="col-span-full text-center text-slate-400 py-8">
                  Nenhuma seleção disponível no momento.
                </div>
              )}
            </div>
          )}

          {/* Opção "Sem time" removida pois não faz mais sentido com o novo sistema */}
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-red-500 text-sm text-center flex items-center justify-center gap-2">
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
          {loading ? <Loader2 className="animate-spin" /> : isEditing ? 'SALVAR ALTERAÇÕES' : 'CONCLUIR CONFIGURAÇÃO'}
        </button>
      </form>
    </main>
  );
}