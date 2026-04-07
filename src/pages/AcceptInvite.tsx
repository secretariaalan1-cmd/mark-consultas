import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'needLogin'>('loading');
  const code = params.get('code');

  useEffect(() => {
    if (loading) return;
    if (!code) { setStatus('error'); return; }
    if (!user) { setStatus('needLogin'); return; }

    supabase.rpc('accept_invite', { _user_id: user.id, _code: code })
      .then(({ error }) => {
        if (error) {
          toast.error(error.message);
          setStatus('error');
        } else {
          toast.success('Convite aceito! Redirecionando...');
          setStatus('success');
          setTimeout(() => { window.location.href = '/'; }, 1500);
        }
      });
  }, [user, loading, code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-card rounded-lg border border-border p-8 text-center max-w-sm w-full shadow-sm">
        <h1 className="text-xl font-bold mb-4 text-foreground">Convite</h1>
        {status === 'loading' && <p className="text-muted-foreground">Processando convite...</p>}
        {status === 'needLogin' && (
          <div className="space-y-3">
            <p className="text-muted-foreground">Você precisa entrar ou criar uma conta para aceitar o convite.</p>
            <Button onClick={() => navigate(`/login?redirect=/convite?code=${code}`)}>Entrar / Cadastrar</Button>
          </div>
        )}
        {status === 'success' && <p className="text-primary font-medium">Convite aceito com sucesso!</p>}
        {status === 'error' && <p className="text-destructive">Convite inválido ou expirado.</p>}
      </div>
    </div>
  );
}
