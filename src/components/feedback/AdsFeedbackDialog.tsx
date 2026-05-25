import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MegaphoneIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'ads_feedback_submitted_v1';

const IMPACT_OPTIONS = [
  { value: 'no_impact', label: 'لا تؤثر إطلاقاً 👍' },
  { value: 'slight', label: 'تأثير بسيط ومقبول' },
  { value: 'moderate', label: 'تأثير متوسط' },
  { value: 'heavy', label: 'تأثير كبير ومزعج' },
  { value: 'unusable', label: 'تعيقني عن استخدام الموقع 😣' },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const AdsFeedbackDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [impactLevel, setImpactLevel] = useState<string>('');
  const [affectsReading, setAffectsReading] = useState(false);
  const [affectsBrowsing, setAffectsBrowsing] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!impactLevel) {
      toast({ title: 'يرجى اختيار مستوى التأثير', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('ads_feedback').insert({
      user_id: user?.id || null,
      user_email: user?.email || null,
      user_name: (user?.user_metadata as any)?.full_name || (user?.user_metadata as any)?.name || null,
      impact_level: impactLevel,
      affects_reading: affectsReading,
      affects_browsing: affectsBrowsing,
      comment: comment.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: 'تعذر إرسال رأيك', description: error.message, variant: 'destructive' });
      return;
    }
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    toast({ title: 'شكراً لك! 🙏', description: 'تم استلام رأيك وسيساعدنا في تحسين الموقع.' });
    onOpenChange(false);
  };

  const handleDismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, 'dismissed'); } catch {}
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-3rem)] max-w-sm max-h-[42svh] overflow-hidden top-auto bottom-[5rem] translate-y-0 gap-1 p-2 sm:top-[50%] sm:bottom-auto sm:max-h-[80vh] sm:translate-y-[-50%] sm:rounded-lg" dir="rtl">
        <DialogHeader className="shrink-0 bg-background pb-2 -mx-2 px-2 pt-1 border-b">
          <DialogTitle className="flex items-center gap-1.5 text-right pr-6 text-xs leading-5">
            <MegaphoneIcon className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>هل تؤثر الإعلانات الجديدة على تجربتك؟</span>
          </DialogTitle>
          <DialogDescription className="text-right text-[11px] leading-4">
            رأيك يهمنا لتحسين جودة التصفح وقراءة الكتب.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[24svh] overflow-y-auto space-y-1 py-0.5 pr-1">
          <div>
            <Label className="text-[11px] font-semibold mb-0.5 block">ما مدى تأثير الإعلانات عليك؟</Label>
            <RadioGroup value={impactLevel} onValueChange={setImpactLevel} className="grid grid-cols-2 gap-1">
              {IMPACT_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center gap-1 py-0.5 px-1 rounded hover:bg-muted/50 cursor-pointer" onClick={() => setImpactLevel(opt.value)}>
                  <RadioGroupItem value={opt.value} id={opt.value} className="h-3.5 w-3.5" />
                  <Label htmlFor={opt.value} className="cursor-pointer flex-1 text-right text-[10px] leading-4">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-0.5">
            <Label className="text-[11px] font-semibold block">أين تلاحظ التأثير؟ (اختياري)</Label>
            <div className="grid grid-cols-2 gap-1">
              <div className="flex items-center gap-1 py-0.5 px-1">
                <Checkbox id="reading" checked={affectsReading} onCheckedChange={(v) => setAffectsReading(!!v)} className="h-3.5 w-3.5" />
                <Label htmlFor="reading" className="cursor-pointer text-[10px]">📖 قراءة الكتب</Label>
              </div>
              <div className="flex items-center gap-1 py-0.5 px-1">
                <Checkbox id="browsing" checked={affectsBrowsing} onCheckedChange={(v) => setAffectsBrowsing(!!v)} className="h-3.5 w-3.5" />
                <Label htmlFor="browsing" className="cursor-pointer text-[10px]">🌐 تصفح الموقع</Label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="comment" className="text-[11px] font-semibold mb-0.5 block">ملاحظة إضافية (اختياري)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="أخبرنا بمزيد من التفاصيل..."
              maxLength={1000}
              rows={1}
              className="min-h-[2rem] text-[10px] py-1"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-row gap-2 pt-2 border-t bg-background">
          <Button variant="ghost" size="sm" onClick={handleDismiss} disabled={submitting} className="h-8 text-xs">لاحقاً</Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !impactLevel} className="h-8 flex-1 text-xs">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            إرسال رأيي
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdsFeedbackDialog;
