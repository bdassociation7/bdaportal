import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { impersonationService } from '@/services/impersonation.service';
import { useToast } from '@/components/ui/use-toast';

export default function ImpersonationBanner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEnding, setIsEnding] = useState(false);

  const meta = impersonationService.getImpersonationMeta();
  if (!meta) return null;

  const handleEnd = async () => {
    setIsEnding(true);
    try {
      await impersonationService.endImpersonation();
      navigate('/admin/users');
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to end impersonation',
        variant: 'destructive',
      });
      setIsEnding(false);
    }
  };

  return (
    <div className="sticky top-0 z-[9999] bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm shadow-md">
      <Eye className="h-4 w-4 flex-shrink-0" />
      <span>
        Viewing portal as <strong>{meta.target_name || meta.target_email}</strong>
        {meta.target_name && <span className="opacity-80"> ({meta.target_email})</span>}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleEnd}
        disabled={isEnding}
        className="ml-2 bg-white/20 border-white/40 text-white hover:bg-white/30 hover:text-white h-7 px-3 text-xs"
      >
        <X className="h-3 w-3 mr-1" />
        {isEnding ? 'Restoring...' : 'End Impersonation'}
      </Button>
    </div>
  );
}
