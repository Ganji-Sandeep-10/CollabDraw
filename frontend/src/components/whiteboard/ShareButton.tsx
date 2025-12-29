import { useState, useCallback } from 'react';
import { Share2, X, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useShareRoom } from '@/hooks/useShareRoom';
import { Scene } from '@/hooks/types';

// import { toast } from 'sonner';

interface ShareButtonProps {
  getLocalScene: () => Scene;
  applyRemoteScene: (scene: Scene) => void;
}

export function ShareButton({ getLocalScene, applyRemoteScene }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [serverStatus, setServerStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle');
  const shareRoom = useShareRoom(getLocalScene, applyRemoteScene);

  const handleShare = useCallback(async () => {
    setServerStatus('checking');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const res = await fetch('http://localhost:8080/health', { 
          signal: controller.signal 
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        setServerStatus('online');
        const link = shareRoom();
        setShareLink(link);
      } else {
        setServerStatus('offline');
      }
    } catch (error) {
      console.error("Health check failed:", error);
      setServerStatus('offline');
    }
  }, [shareRoom]);

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => {
          setIsOpen(true);
          setServerStatus('idle');
          setShareLink(null);
          // Initial auto-check when opening can be added here if desired, 
          // but per previous flow we check on "Share" action or we can check on mount of modal.
          // Let's keep it manual trigger for now as per previous, or trigger immediately?
          // User said "when clicking on share button" (the main one).
          // Re-reading: "when user clicks the share button try to check is backend alive"
          // So let's check immediately when opening the modal.
          handleShare();
        }}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium shadow-toolbar hover:bg-primary/90 transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/20 z-40" 
              onClick={() => {
                setIsOpen(false);
                setShareLink(null);
              }} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-12 right-0 w-80 bg-panel-bg border border-border rounded-xl shadow-panel overflow-hidden z-50"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Share canvas</h3>
                  <button 
                    onClick={() => {
                      setIsOpen(false);
                      setShareLink(null);
                    }}
                    className="p-1 hover:bg-secondary rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {serverStatus === 'checking' && (
                   <div className="flex flex-col items-center justify-center py-8 space-y-3">
                     <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                     <p className="text-sm text-muted-foreground">Checking server status...</p>
                   </div>
                )}

                {serverStatus === 'offline' && (
                  <div className="flex flex-col items-center justify-center py-4 space-y-3 text-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    <p className="text-sm font-medium text-destructive">Server is offline</p>
                    <button 
                      onClick={handleShare}
                      className="text-xs text-primary hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {serverStatus === 'online' && shareLink && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                       <span className="text-xs text-green-600 font-medium">System Online</span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Anyone with this link can join your collaboration session.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={shareLink}
                        readOnly
                        className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm"
                      />
                      <button
                        onClick={copyLink}
                        className={cn(
                          "p-2.5 rounded-lg transition-colors",
                          copied 
                            ? "bg-green-500 text-white" 
                            : "bg-secondary hover:bg-secondary/80"
                        )}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
