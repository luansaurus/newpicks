'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { CompetitionProvider } from '@/context/CompetitionContext';
import { Loader2, Trophy, Home, User as UserIcon, LogOut, ChartNoAxesCombinedIcon } from 'lucide-react';
import Link from 'next/link';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const themeContext = useTheme(); 
  
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{ 
    username: string; 
    team_name?: string;
    team_logo?: string;
    team_color?: string; 
  } | null>(null);

  useEffect(() => {
    const checkSessionAndFetchProfile = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          router.push('/login');
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, teams(name, logo_url, main_color)') 
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;

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
        console.error('Erro ao carregar perfil:', err);
        router.push('/login');
      }
    };

    checkSessionAndFetchProfile();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- MÁGICA DO CONTRASTE (Fica dentro do componente para evitar o erro do TypeScript) ---
  const getSafeColor = (hex: string | undefined) => {
    if (!hex) return '#e11d48'; // Fallback padrão (Vermelho)
    
    // Limpa o hex caso venha com ou sem a hashtag
    const cleanHex = hex.charAt(0) === '#' ? hex.substring(1) : hex;
    
    // Evita quebra se o hex no banco estiver incompleto
    if (cleanHex.length !== 6) return hex;

    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    
    // Fórmula padrão de luminância
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Limite 40: Pega pretos (0), cinzas escuros e azul marinho, 
    // mas poupa os vermelhos puros (54), verdes e azuis mais abertos.
    return luma < 40 ? '#f8fafc' : hex; 
  };

  // Define a cor pura (Banco > Contexto > Fallback) e passa pelo filtro de segurança
  const rawColor = userProfile?.team_color || themeContext?.themeColor || '#e11d48';
  const themeColor = getSafeColor(rawColor);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* HEADER ESCURO PADRÃO DO APP */}
      <header className="border-b border-border/20 sticky top-0 z-50 backdrop-blur-md shadow-md bg-slate-950/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-display font-bold text-xl uppercase tracking-wider">
              Arena<span style={{ color: themeColor }}>Picks</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link href="/dashboard" className={`px-3 py-2 rounded-lg transition-colors ${pathname === '/dashboard' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`}>
                Painel
              </Link>
              <Link href="/profile" className={`px-3 py-2 rounded-lg transition-colors ${pathname === '/profile' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`}>
                Meu Perfil
              </Link>
              <Link href="/ranking" className={`px-3 py-2 rounded-lg transition-colors ${pathname === '/ranking' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white'}`}>
                Ranking Geral
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* INFORMAÇÕES DO USUÁRIO */}
            <div className="hidden sm:flex items-center gap-3 text-right">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">@{userProfile?.username}</span>
                <span className="text-[10px] font-medium" style={{ color: themeColor }}>
                  {userProfile?.team_name || 'Sem Time Favorito'}
                </span>
              </div>
              {userProfile?.team_logo && (
                <img src={userProfile.team_logo} alt="Escudo" className="w-9 h-9 object-contain drop-shadow-lg" />
              )}
            </div>

            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border shadow-sm bg-background/40"
              style={{ borderColor: themeColor, color: themeColor }}
            >
              <Trophy size={15} />
              <span className="font-display tracking-tight">Bolão ativo</span>
            </div>

            <button 
              onClick={handleSignOut}
              className="hidden md:flex p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 pb-24 md:pb-6 relative z-10">
        {children}
      </main>

      {/* NAV MOBILE ESCURA PADRÃO */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/20 z-50 h-16 flex items-center justify-around px-4 shadow-2xl backdrop-blur-md bg-slate-950/95">
        <Link href="/dashboard" className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase ${pathname === '/dashboard' ? 'text-white' : 'text-slate-400'}`}>
          <Home size={20} style={{ color: pathname === '/dashboard' ? themeColor : '' }} />
          <span>Painel</span>
        </Link>
        <Link href="/profile" className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase ${pathname === '/profile' ? 'text-white' : 'text-slate-400'}`}>
          <UserIcon size={20} style={{ color: pathname === '/profile' ? themeColor : '' }} />
          <span>Perfil</span>
        </Link>
        <Link href="/ranking" className={`flex flex-col items-center gap-1 text-[10px] font-bold uppercase ${pathname === '/ranking' ? 'text-white' : 'text-slate-400'}`}>
          <ChartNoAxesCombinedIcon size={20} style={{ color: pathname === '/ranking' ? themeColor : '' }} />
          <span>Ranking</span>
        </Link>
        <button onClick={handleSignOut} className="flex flex-col items-center gap-1 text-[10px] font-bold uppercase text-slate-400">
          <LogOut size={20} className="text-red-400/80" />
          <span>Sair</span>
        </button>
      </nav>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CompetitionProvider>
        <LayoutContent>{children}</LayoutContent>
      </CompetitionProvider>
    </ThemeProvider>
  );
}