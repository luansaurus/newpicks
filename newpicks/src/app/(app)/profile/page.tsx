'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { useTheme } from '@/context/ThemeContext';
import { useColor } from '@/context/ColorContext';
import { Loader2, User, ShieldOff, AlertCircle, Globe, Shield, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { getSafeColor, getTextColorForBackground, getSafeTextClass } from '@/utils/colors';

interface Team {
  id: number;
  name: string;
  country_code: string | null;
  short_code: string;
  logo_url: string;
  main_color: string;
  type: string;
  confederation?: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { applyTheme } = useTheme();
  const { getSafeColor, getTextColorForBackground, isColorDark } = useColor();

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedType, setSelectedType] = useState<'club' | 'country' | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedConfederation, setSelectedConfederation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedConfederations, setExpandedConfederations] = useState<Set<string>>(new Set(['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC']));
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());

  // Cor do tema atual (para usar nos botões)
  const [themeColor, setThemeColor] = useState<string>('#e11d48');

  // Função para normalizar o tipo do time
  const normalizeTeamType = (type: string): 'club' | 'country' => {
    if (!type) return 'club';
    
    const normalized = type.toLowerCase().trim();
    
    if (['club', 'clube', 'clubes', 'team', 'time'].includes(normalized)) {
      return 'club';
    }
    
    if (['country', 'nacional', 'seleção', 'selecao', 'national', 'nation'].includes(normalized)) {
      return 'country';
    }
    
    return 'club';
  };

  // Mapeamento de confederações para nomes amigáveis e logos
  const confederationInfo: Record<string, { label: string; logo: string; color: string }> = {
    'UEFA': { 
      label: 'Europa (UEFA)', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/UEFA_logo.svg/1920px-UEFA_logo.svg.png',
      color: '#1a3c6e'
    },
    'CONMEBOL': { 
      label: 'América do Sul (CONMEBOL)', 
      logo: 'https://upload.wikimedia.org/wikipedia/pt/7/74/CONMEBOL_logo_%282017%29.png',
      color: '#006747'
    },
    'CONCACAF': { 
      label: 'América do Norte (CONCACAF)', 
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Concacaf_logo.svg/1280px-Concacaf_logo.svg.png',
      color: '#0033a0'
    },
    'CAF': { 
      label: 'África (CAF)', 
      logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/72/Confederation_of_African_Football_logo.svg/1280px-Confederation_of_African_Football_logo.svg.png',
      color: '#e31b23'
    },
    'AFC': { 
      label: 'Ásia (AFC)', 
      logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/28/Asian_Football_Confederation_logo_2025.svg/1920px-Asian_Football_Confederation_logo_2025.svg.png',
      color: '#004c97'
    },
    'OFC': { 
      label: 'Oceania (OFC)', 
      logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/28/Asian_Football_Confederation_logo_2025.svg/1920px-Asian_Football_Confederation_logo_2025.svg.png',
      color: '#00843d'
    },
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
        
        const normalizedTeams = allTeams.map(team => ({
          ...team,
          type: normalizeTeamType(team.type)
        }));
        
        setTeams(normalizedTeams);

        const { data: profile } = await supabase
          .from('profiles')
          .select('username, user_team')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          if (profile.username) setUsername(profile.username);
          
          if (profile.user_team) {
            const currentTeam = normalizedTeams.find(t => t.id === profile.user_team);
            if (currentTeam) {
              setSelectedTeam(currentTeam);
              const safeColor = getSafeColor(currentTeam.main_color);
              setThemeColor(safeColor);
              applyTheme(safeColor);
              
              const normalizedType = normalizeTeamType(currentTeam.type);
              setSelectedType(normalizedType);
              
              if (normalizedType === 'club') {
                setSelectedCountry(currentTeam.country_code);
              } else {
                setSelectedCountry(null);
                setSelectedConfederation(currentTeam.confederation || null);
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

  // Agrupa clubes por país
  const teamsByCountry = teams
    .filter((team) => normalizeTeamType(team.type) === 'club')
    .reduce((acc: Record<string, Team[]>, team) => {
      const code = team.country_code || 'Outros';
      if (!acc[code]) acc[code] = [];
      acc[code].push(team);
      return acc;
    }, {});

  // Ordena os times dentro de cada país alfabeticamente
  Object.keys(teamsByCountry).forEach(country => {
    teamsByCountry[country].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Cria uma lista de países que devem ser exibidos individualmente (com 5+ times)
  const countriesToShow = Object.keys(teamsByCountry)
    .filter(country => teamsByCountry[country].length >= 5)
    .sort();

  // Times de "Outros" (países com menos de 5 times)
  const otherTeams = Object.entries(teamsByCountry)
    .filter(([country, teams]) => teams.length < 5)
    .flatMap(([_, teams]) => teams)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Se houver times "Outros", adiciona "Outros" à lista de países
  const allCountries = [...countriesToShow];
  if (otherTeams.length > 0) {
    allCountries.push('Outros');
  }

  // Função para alternar expansão de país
  const toggleCountry = (country: string) => {
    setExpandedCountries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(country)) {
        newSet.delete(country);
      } else {
        newSet.add(country);
      }
      return newSet;
    });
  };

  // Times de seleções (type = 'country') agrupados por confederação
  const nationalTeamsByConfederation = teams
    .filter((team) => normalizeTeamType(team.type) === 'country')
    .reduce((acc: Record<string, Team[]>, team) => {
      const conf = team.confederation || 'outros';
      if (!acc[conf]) acc[conf] = [];
      acc[conf].push(team);
      return acc;
    }, {});

  // Ordena os times dentro de cada confederação alfabeticamente
  Object.keys(nationalTeamsByConfederation).forEach(conf => {
    nationalTeamsByConfederation[conf].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Lista de confederações disponíveis
  const availableConfederations = Object.keys(nationalTeamsByConfederation).sort();

  // Função para alternar expansão de confederação
  const toggleConfederation = (conf: string) => {
    setExpandedConfederations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conf)) {
        newSet.delete(conf);
      } else {
        newSet.add(conf);
      }
      return newSet;
    });
  };

  const handleTeamSelection = (team: Team | null) => {
    if (team) {
      setSelectedTeam(team);
      const safeColor = getSafeColor(team.main_color);
      setThemeColor(safeColor);
      applyTheme(safeColor);
      
      const normalizedType = normalizeTeamType(team.type);
      setSelectedType(normalizedType);
      
      if (normalizedType === 'club') {
        setSelectedCountry(team.country_code);
        setSelectedConfederation(null);
      } else {
        setSelectedCountry(null);
        setSelectedConfederation(team.confederation || null);
      }
    } else {
      setSelectedTeam(null);
      setSelectedType(null);
      setSelectedCountry(null);
      setSelectedConfederation(null);
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

  const getButtonTextColor = (bgColor: string) => {
    const isDark = isColorDark(bgColor);
    return isDark ? 'text-white' : 'text-slate-950';
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

  const safeThemeColor = getSafeColor(themeColor);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 blur-[120px] transition-colors duration-1000"
        style={{ background: `radial-gradient(circle at 50% 50%, ${safeThemeColor}, transparent 70%)` }}
      />

      <form onSubmit={handleSaveProfile} className="w-full max-w-3xl bg-card border border-border p-8 rounded-3xl shadow-2xl relative z-10">
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
                setSelectedConfederation(null);
                setSelectedTeam(null);
              }}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                selectedType === 'club' 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border bg-background hover:border-slate-600'
              }`}
              style={{ 
                borderColor: selectedType === 'club' ? safeThemeColor : undefined,
                backgroundColor: selectedType === 'club' ? `${safeThemeColor}10` : undefined
              }}
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
                setSelectedConfederation(null);
                setSelectedTeam(null);
              }}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                selectedType === 'country' 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border bg-background hover:border-slate-600'
              }`}
              style={{ 
                borderColor: selectedType === 'country' ? safeThemeColor : undefined,
                backgroundColor: selectedType === 'country' ? `${safeThemeColor}10` : undefined
              }}
            >
              <Globe size={20} className={selectedType === 'country' ? 'text-primary' : 'text-slate-400'} />
              <span className={`font-bold ${selectedType === 'country' ? 'text-primary' : 'text-slate-400'}`}>
                Seleção
              </span>
            </button>
          </div>

          {/* Lista de países para clubes (incluindo "Outros" na ordem alfabética) */}
          {selectedType === 'club' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {allCountries.map((country) => {
                  const isSelected = selectedCountry === country;
                  const isOutros = country === 'Outros';
                  return (
                    <button
                      key={country}
                      type="button"
                      onClick={() => setSelectedCountry(country)}
                      className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? `border-transparent ${getButtonTextColor(safeThemeColor)}`
                          : 'bg-background border-border text-slate-400 hover:border-slate-600'
                      }`}
                      style={{ backgroundColor: isSelected ? safeThemeColor : undefined }}
                    >
                      {isOutros ? (
                        <>
                          <Package size={14} className="inline mr-1" />
                          Outros
                        </>
                      ) : country === 'ENG' ? '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra' : 
                       country === 'GER' ? '🇩🇪 Alemanha' : 
                       country === 'ESP' ? '🇪🇸 Espanha' :
                       country === 'ITA' ? '🇮🇹 Itália' :
                       country === 'FRA' ? '🇫🇷 França' :
                       country === 'POR' ? '🇵🇹 Portugal' :
                       country === 'NED' ? '🇳🇱 Holanda' :
                       country === 'BRA' ? '🇧🇷 Brasil' :
                       country === 'ARG' ? '🇦🇷 Argentina' :
                       country === 'BEL' ? '🇧🇪 Bélgica' :
                       country === 'MEX' ? '🇲🇽 México' :
                       country === 'USA' ? '🇺🇸 EUA' :
                       country}
                    </button>
                  );
                })}
              </div>

              {/* Exibição dos times do país selecionado */}
              {selectedCountry && (
                <>
                  {selectedCountry === 'Outros' ? (
                    // Exibe os times "Outros"
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 p-3 bg-background/30 rounded-xl border border-border/50">
                      {otherTeams.map((team: Team) => {
                        const isSelected = selectedTeam?.id === team.id;
                        return (
                          <div key={team.id} className="relative group">
                            <button
                              type="button"
                              onClick={() => handleTeamSelection(team)}
                              className={`aspect-square p-2 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer w-full ${
                                isSelected ? 'border-primary bg-primary/10' : 'border-transparent bg-card hover:border-slate-600'
                              }`}
                              style={{ 
                                borderColor: isSelected ? safeThemeColor : undefined,
                                backgroundColor: isSelected ? `${safeThemeColor}10` : undefined
                              }}
                              title={team.name}
                            >
                              {team.logo_url ? (
                                <img src={team.logo_url} alt={team.name} className="max-w-full max-h-full object-contain" />
                              ) : (
                                <span className="text-xs text-slate-400">{team.short_code || team.name}</span>
                              )}
                            </button>
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                              <span className="text-[10px] bg-slate-900/95 text-white px-2 py-0.5 rounded shadow-lg border border-slate-700">
                                {team.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Exibe os times do país selecionado
                    teamsByCountry[selectedCountry] && (
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 p-3 bg-background/50 rounded-xl border border-border">
                        {teamsByCountry[selectedCountry].map((team: Team) => {
                          const isSelected = selectedTeam?.id === team.id;
                          return (
                            <div key={team.id} className="relative group">
                              <button
                                type="button"
                                onClick={() => handleTeamSelection(team)}
                                className={`aspect-square p-2 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer w-full ${
                                  isSelected ? 'border-primary bg-primary/10' : 'border-transparent bg-card hover:border-slate-600'
                                }`}
                                style={{ 
                                  borderColor: isSelected ? safeThemeColor : undefined,
                                  backgroundColor: isSelected ? `${safeThemeColor}10` : undefined
                                }}
                                title={team.name}
                              >
                                {team.logo_url ? (
                                  <img src={team.logo_url} alt={team.name} className="max-w-full max-h-full object-contain" />
                                ) : (
                                  <span className="text-xs text-slate-400">{team.short_code || team.name}</span>
                                )}
                              </button>
                              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                <span className="text-[10px] bg-slate-900/95 text-white px-2 py-0.5 rounded shadow-lg border border-slate-700">
                                  {team.name}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          )}

          {/* Lista de seleções agrupadas por confederação */}
          {selectedType === 'country' && (
            <div className="space-y-4">
              {availableConfederations.length > 0 ? (
                availableConfederations.map((conf) => {
                  const teamsInConf = nationalTeamsByConfederation[conf] || [];
                  const isExpanded = expandedConfederations.has(conf);
                  const confInfo = confederationInfo[conf] || { 
                    label: conf, 
                    logo: '',
                    color: '#475569'
                  };

                  return (
                    <div key={conf} className="border border-slate-700/50 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleConfederation(conf)}
                        className="w-full px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800/70 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {confInfo.logo ? (
                            <img 
                              src={confInfo.logo} 
                              alt={conf} 
                              className="w-8 h-8 object-contain" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Globe size={20} className="text-slate-400" />
                          )}
                          <span className="font-bold text-sm text-white">{confInfo.label}</span>
                          <span className="text-xs text-slate-400">({teamsInConf.length})</span>
                        </div>
                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </button>

                      {isExpanded && (
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 p-3 bg-background/30">
                          {teamsInConf.map((team: Team) => {
                            const isSelected = selectedTeam?.id === team.id;
                            return (
                              <div key={team.id} className="relative group">
                                <button
                                  type="button"
                                  onClick={() => handleTeamSelection(team)}
                                  className={`aspect-square p-2 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer w-full ${
                                    isSelected ? 'border-primary bg-primary/10' : 'border-transparent bg-card hover:border-slate-600'
                                  }`}
                                  style={{ 
                                    borderColor: isSelected ? safeThemeColor : undefined,
                                    backgroundColor: isSelected ? `${safeThemeColor}10` : undefined
                                  }}
                                  title={team.name}
                                >
                                  {team.logo_url ? (
                                    <img src={team.logo_url} alt={team.name} className="max-w-full max-h-full object-contain" />
                                  ) : (
                                    <span className="text-xs text-slate-400">{team.short_code || team.name}</span>
                                  )}
                                </button>
                                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                  <span className="text-[10px] bg-slate-900/95 text-white px-2 py-0.5 rounded shadow-lg border border-slate-700">
                                    {team.name}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-slate-400 py-8">
                  Nenhuma seleção disponível no momento.
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-red-500 text-sm text-center flex items-center justify-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          disabled={loading}
          className={`w-full font-bold py-4 rounded-xl transition-all flex justify-center items-center cursor-pointer ${getButtonTextColor(safeThemeColor)}`}
          style={{ backgroundColor: safeThemeColor }}
        >
          {loading ? <Loader2 className="animate-spin" /> : isEditing ? 'SALVAR ALTERAÇÕES' : 'CONCLUIR CONFIGURAÇÃO'}
        </button>
      </form>
    </main>
  );
}