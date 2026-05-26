import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, X, Sparkles, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabaseFunctions } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import AIBotBadge from '@/components/icons/AIBotBadge';

interface Msg { role: 'user' | 'assistant'; content: string }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorName: string;
}

/**
 * شات شخصية المؤلف الافتراضية (AI persona).
 * إفصاح صريح: هذه محاكاة AI وليست المؤلف الحقيقي.
 */
export const AuthorPersonaDialog: React.FC<Props> = ({ open, onOpenChange, authorName }) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `🤖 تنبيه: أنا محاكاة ذكاء اصطناعي لأسلوب الكاتب "${authorName}" ولست المؤلف الحقيقي.\n\nاسألني عن كتبه أو أفكاره الواردة فيها، وسأحاول الإجابة بأسلوبه قدر الإمكان.`,
      }]);
    }
    if (!open) {
      // reset on close
      setTimeout(() => { setMessages([]); setInput(''); }, 200);
    }
  }, [open, authorName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const { data, error } = await supabaseFunctions.functions.invoke('author-persona-chat', {
        body: {
          authorName,
          messages: newMessages.filter(m => !m.content.startsWith('🤖 تنبيه')),
          language: 'ar',
        },
      });
      if (error) throw error;
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      console.error('persona chat error:', err);
      toast.error(err?.message || 'تعذر الاتصال بالمحاكاة');
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0 max-h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader className="p-4 border-b bg-primary/5">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-right">
              <DialogTitle className="font-cairo text-base">
                محاكاة أسلوب: {authorName}
              </DialogTitle>
              <DialogDescription className="font-cairo text-xs flex items-center gap-1 mt-0.5">
                <AIBotBadge size="sm" />
                <span>ليست المؤلف الحقيقي</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* بانر إفصاح إلزامي */}
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-cairo flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            هذه محاكاة ذكاء اصطناعي لأسلوب الكاتب اعتماداً على كتبه. الردود لا تمثل آراءه الحقيقية ولا تنسب إليه.
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm font-cairo leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-3 py-2 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-muted-foreground font-cairo">يفكر بأسلوب {authorName}...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="اسأل عن كتاب أو فكرة..."
            disabled={loading}
            className="font-cairo rounded-xl"
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="rounded-xl">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthorPersonaDialog;
