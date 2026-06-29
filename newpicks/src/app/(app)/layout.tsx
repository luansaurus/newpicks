'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { useTheme } from '@/context/ThemeContext';
import { Loader2, LogOut, Trophy, Home, CalendarDays, CheckCircle2, Globe, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { CompetitionProvider } from '@/context/CompetitionContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { applyTheme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  const navItems = [
    { name: 'Início', path: '/dashboard', icon: Home },
    { name: 'Palpites', path: '/palpites', icon: CalendarDays },
    { name: 'Resultados', path: '/resultados', icon: CheckCircle2 },
    { name: 'Ranking', path: '/ranking', icon: Globe },
  ];

  useEffect(() => {
    const checkUserAndTheme = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          username,
          total_points,
          teams (id, name, logo_url, main_color)
        `)
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
        const userTeam: any = Array.isArray(profile.teams) ? profile.teams[0] : profile.teams;
        if (userTeam?.main_color) {
          applyTheme(userTeam.main_color);
        }
      }
      setLoading(false);
    };

    checkUserAndTheme();
  }, [router, applyTheme]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('team_primary_color');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <CompetitionProvider>
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* HEADER TOPO */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Marca - Agora é um Link para a Home/Dashboard */}
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            {userProfile?.teams?.logo_url && (
              <img 
                src={userProfile.teams.logo_url} 
                alt="Logo Time" 
                className="h-8 w-8 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-200" 
              />
            )}
            <span className="font-display font-bold text-xl uppercase tracking-wider hidden sm:block">
              Arena<span className="text-primary transition-colors group-hover:opacity-80">Picks</span>
            </span>
          </Link>

          {/* Navegação Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-slate-400 hover:bg-card hover:text-white'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-primary' : ''} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Perfil & Pontuação */}
          <div className="flex items-center gap-3 sm:gap-6">
            
            {/* Bloco de Pontos */}
            <div className="flex items-center gap-1.5 bg-background border border-border px-3 py-1.5 rounded-xl text-sm font-bold select-none">
              <Trophy size={16} className="text-primary" />
              <span>{userProfile?.total_points || 0}</span>
            </div>
            
            {/* Área do Profile - Redireciona para a tela de configurações do perfil */}
            <Link 
              href="/profile" 
              className="flex text-sm text-slate-300 font-medium items-center gap-1.5 hover:text-primary transition-colors cursor-pointer group"
            >
              <UserIcon size={16} className="group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">@{userProfile?.username}</span>
            </Link>

            {/* Logout */}
            <button 
              onClick={handleLogout} 
              className="text-slate-400 hover:text-red-400 transition-colors p-2 cursor-pointer"
              title="Sair da conta"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 pb-24 md:pb-6 relative z-10">
        {children}
      </main>

      {/* BOTTOM NAVIGATION BAR (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-safe">
        <div className="flex items-center justify-around p-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex flex-col items-center justify-center w-full py-2 gap-1 rounded-xl transition-all ${
                  isActive ? 'text-primary' : 'text-slate-500'
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-primary/20' : ''}`}>
                  <Icon size={22} className={isActive ? 'text-primary' : ''} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
    </CompetitionProvider>
  );
}