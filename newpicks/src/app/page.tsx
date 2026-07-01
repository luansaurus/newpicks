'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthentication = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Usuário logado vai direto para a área do app
        router.push('/dashboard');
      } else {
        // Usuário deslogado vai para a autenticação
        router.push('/login');
      }
    };

    checkAuthentication();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="animate-spin text-primary mx-auto" size={40} />
        <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">
          Carregando Arena...
        </p>
      </div>
    </div>
  );
}