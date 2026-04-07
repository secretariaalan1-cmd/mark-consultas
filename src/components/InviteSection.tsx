import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export function InviteSection() {
  const { workspaceId } = useAuth();
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateInvite = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { error } = await supabase.from('invites').insert({
        workspace_id: workspaceId,
        code,
        created_by: (await supabase.auth.getUser()).data.user?.id || null,
      });
      if (error) throw error;
      const link = `${window.location.origin}/convite?code=${code}`;
      setInviteLink(link);
      toast.success('Convite criado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar convite');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-foreground">Convidar Colaborador</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Gere um link de convite para que outra pessoa tenha acesso completo ao sistema de agendamentos.
      </p>

      <Button onClick={generateInvite} disabled={loading} className="w-full mb-4">
        {loading ? 'Gerando...' : 'Gerar Link de Convite'}
      </Button>

      {inviteLink && (
        <div className="flex gap-2">
          <Input value={inviteLink} readOnly className="font-mono text-xs" />
          <Button variant="outline" size="icon" onClick={copyLink}>
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}
