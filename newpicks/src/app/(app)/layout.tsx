'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { CompetitionProvider, useCompetition } from '@/context/CompetitionContext';
import { LeagueProvider, useLeague } from '@/context/LeagueContext';
import { Loader2, Home, User as UserIcon, LogOut, ChartNoAxesCombinedIcon, Layers, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import Link from 'next/link';
import { CompetitionSelector } from '@/components/shared/CompetitionSelector';
import { LeagueSelector } from '@/components/shared/LeagueSelector'; // <--- IMPORT NOVO

function LayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const themeContext = useTheme(); 
  const { activeCompetition, selectCompetition } = useCompetition(); 
  const { activeLeague } = useLeague(); 
  
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [isCompSelectorOpen, setIsCompSelectorOpen] = useState(false);
  const [isLeagueSelectorOpen, setIsLeagueSelectorOpen] = useState(false); // <--- ESTADO NOVO
  
  const [userProfile, setUserProfile] = useState<{ 
    username: string; 
    team_name?: string;
    team_logo?: string;
    team_color?: string; 
  } | null>(null);

  useEffect(() => {
    const fetchCompetitions = async () => {
      const { data, error } = await supabase.from('competitions').select('id, name, competition_logo, slug, theme_primary, theme_secondary, is_active').eq('is_active', true);
      if (!error && data && data.length > 0) {
        setCompetitions(data);
        if (!activeCompetition) {
           const saved = localStorage.getItem('active_competition_obj');
           if (saved) {
             try { selectCompetition(JSON.parse(saved)); } 
             catch (e) { selectCompetition(data[0]); }
           } else {
             selectCompetition(data[0]);
           }
        }
      }
    };
    fetchCompetitions();
  }, [activeCompetition, selectCompetition]);

  useEffect(() => {
    const checkSessionAndFetchProfile = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          router.push('/login');
          return;
        }

        setCurrentUserId(session.user.id);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, teams(name, logo_url, main_color)') 
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          const teamData = profileData.teams as any;
          setUserProfile({
            username: profileData.username,
            team_name: teamData?.name,
            team_logo: teamData?.logo_url,
            team_color: teamData?.main_color 
          });
        }
        setLoading(false);
      } catch (err) {
        router.push('/login');
      }
    };
    checkSessionAndFetchProfile();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getSafeColor = (hex: string | undefined) => {
    if (!hex) return '#e11d48'; 
    const cleanHex = hex.charAt(0) === '#' ? hex.substring(1) : hex;
    if (cleanHex.length !== 6) return hex;
    const r = parseInt(cleanHex.slice(0, 2), 16), g = parseInt(cleanHex.slice(2, 4), 16), b = parseInt(cleanHex.slice(4, 6), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 40 ? '#f8fafc' : hex; 
  };

  const themeColor = getSafeColor(userProfile?.team_color || themeContext?.themeColor || '#e11d48');

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={36} /></div>;

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <header className="border-b border-border/20 sticky top-0 z-50 backdrop-blur-md shadow-md bg-slate-950/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-display font-bold text-lg sm:text-xl uppercase tracking-wider">
              Arena<span style={{ color: themeColor }}>Picks</span>
            </Link>
            
            <div className="relative hidden md:flex items-center gap-2">
              {/* COMPETITION SELECTOR */}
              <div className="relative">
                <button onClick={() => { setIsCompSelectorOpen(!isCompSelectorOpen); setIsLeagueSelectorOpen(false); }} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium w-48">
                  <div className="flex items-center gap-2 truncate"><Layers size={14} style={{ color: themeColor }} /><span className="truncate">{activeCompetition?.name || 'Carregando...'}</span></div>
                  {isCompSelectorOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </button>
                {isCompSelectorOpen && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900 border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    <CompetitionSelector competitions={competitions} onRowClick={() => setIsCompSelectorOpen(false)} />
                  </div>
                )}
              </div>

              {/* LEAGUE SELECTOR */}
              <div className="relative">
                <button onClick={() => { setIsLeagueSelectorOpen(!isLeagueSelectorOpen); setIsCompSelectorOpen(false); }} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium w-48">
                  <div className="flex items-center gap-2 truncate"><Trophy size={14} className="text-yellow-500" /><span className="truncate text-slate-300">{activeLeague ? activeLeague.name : 'Liga Global'}</span></div>
                  {isLeagueSelectorOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </button>
                {isLeagueSelectorOpen && activeCompetition?.id && currentUserId && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    <LeagueSelector competitionId={activeCompetition.id} currentUserId={currentUserId} onRowClick={() => setIsLeagueSelectorOpen(false)} />
                    <div className="border-t border-border bg-black/20 p-2">
                      <Link href="/leagues" onClick={() => setIsLeagueSelectorOpen(false)} className="block text-center text-xs text-primary font-bold uppercase p-2 hover:bg-white/5 rounded transition-colors">
                        Gerenciar Ligas
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium ml-4">
              <Link href="/dashboard" className={`px-3 py-2 rounded-lg transition-colors ${pathname === '/dashboard' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`}>Painel</Link>
              <Link href="/ranking" className={`px-3 py-2 rounded-lg transition-colors ${pathname === '/ranking' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`}>Ranking</Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 text-right">
              <div className="flex flex-col"><span className="text-xs font-bold text-slate-200">@{userProfile?.username}</span></div>
              {userProfile?.team_logo && <img src={userProfile.team_logo} alt="Escudo" className="w-9 h-9 object-contain drop-shadow-lg" />}
            </div>
            <div style={{ borderColor: themeColor, color: themeColor }}><Link href="/profile" className={`px-3 py-2 rounded-lg transition-colors ${pathname === '/profile' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`}>Meu Perfil</Link></div>
            <button onClick={handleSignOut} className="hidden md:flex p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 pb-24 md:pb-6 relative z-10">
        {children}
      </main>

      {/* MODAL MOBILE COMPETIÇÃO */}
      {isCompSelectorOpen && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-slate-900 border-t border-border/20 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-2">
          <div className="p-3 border-b border-border/10 font-bold text-xs text-slate-400 uppercase tracking-wider text-center flex items-center justify-between">
            <span>Selecione a Competição</span>
            <button onClick={() => setIsCompSelectorOpen(false)} className="p-1 hover:bg-white/10 rounded"><ChevronDown size={16} /></button>
          </div>
          <CompetitionSelector competitions={competitions} onRowClick={() => setIsCompSelectorOpen(false)} />
        </div>
      )}

      {/* MODAL MOBILE LIGA */}
      {isLeagueSelectorOpen && activeCompetition?.id && currentUserId && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-slate-900 border-t border-border/20 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-2">
          <div className="p-3 border-b border-border/10 font-bold text-xs text-slate-400 uppercase tracking-wider text-center flex items-center justify-between">
            <span>Selecione a Liga</span>
            <button onClick={() => setIsLeagueSelectorOpen(false)} className="p-1 hover:bg-white/10 rounded"><ChevronDown size={16} /></button>
          </div>
          <LeagueSelector competitionId={activeCompetition.id} currentUserId={currentUserId} onRowClick={() => setIsLeagueSelectorOpen(false)} />
          <div className="border-t border-border bg-black/20 p-2">
            <Link href="/leagues" onClick={() => setIsLeagueSelectorOpen(false)} className="block text-center text-xs text-primary font-bold uppercase p-3 hover:bg-white/5 rounded transition-colors">
              Gerenciar / Criar Ligas
            </Link>
          </div>
        </div>
      )}

      {/* NAV MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/20 z-50 h-16 flex items-center justify-around px-2 shadow-2xl backdrop-blur-md bg-slate-950/95">
        <Link href="/dashboard" className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase ${pathname === '/dashboard' ? 'text-white' : 'text-slate-400'}`}>
          <Home size={20} style={{ color: pathname === '/dashboard' ? themeColor : '' }} />
          <span>Painel</span>
        </Link>
        <button onClick={() => { setIsCompSelectorOpen(!isCompSelectorOpen); setIsLeagueSelectorOpen(false); }} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase ${isCompSelectorOpen ? 'text-white' : 'text-slate-400'}`}>
           <Layers size={20} style={{ color: isCompSelectorOpen ? themeColor : '' }} />
           <span>Torneio</span>
        </button>
        <button onClick={() => { setIsLeagueSelectorOpen(!isLeagueSelectorOpen); setIsCompSelectorOpen(false); }} className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase ${isLeagueSelectorOpen || pathname === '/leagues' ? 'text-white' : 'text-slate-400'}`}>
          <Trophy size={20} style={{ color: isLeagueSelectorOpen || pathname === '/leagues' ? themeColor : '' }} />
          <span>Ligas</span>
        </button>
        <Link href="/ranking" className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase ${pathname === '/ranking' ? 'text-white' : 'text-slate-400'}`}>
          <ChartNoAxesCombinedIcon size={20} style={{ color: pathname === '/ranking' ? themeColor : '' }} />
          <span>Ranking</span>
        </Link>
      </nav>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CompetitionProvider>
        <LeagueProvider>
          <LayoutContent>{children}</LayoutContent>
        </LeagueProvider>
      </CompetitionProvider>
    </ThemeProvider>
  );
}