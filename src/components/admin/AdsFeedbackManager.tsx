import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, RefreshCw, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdsFeedback {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  impact_level: string;
  affects_reading: boolean;
  affects_browsing: boolean;
  comment: string | null;
  created_at: string;
}

const IMPACT_LABELS: Record<string, { label: string; color: string }> = {
  no_impact: { label: 'لا تؤثر إطلاقاً', color: 'bg-green-500' },
  slight: { label: 'تأثير بسيط', color: 'bg-blue-500' },
  moderate: { label: 'تأثير متوسط', color: 'bg-yellow-500' },
  heavy: { label: 'تأثير كبير', color: 'bg-orange-500' },
  unusable: { label: 'تعيق الاستخدام', color: 'bg-red-500' },
};

const AdsFeedbackManager: React.FC = () => {
  const [items, setItems] = useState<AdsFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ads_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      setItems((data as AdsFeedback[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('ads_feedback').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast({ title: 'تم الحذف' });
  };

  const counts = items.reduce<Record<string, number>>((acc, it) => {
    acc[it.impact_level] = (acc[it.impact_level] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">آراء المستخدمين حول الإعلانات</h2>
          <Badge variant="secondary">{items.length}</Badge>
        </div>
        <Button onClick={fetchItems} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {Object.entries(IMPACT_LABELS).map(([key, { label, color }]) => (
          <Card key={key}>
            <CardContent className="p-3 text-center">
              <div className={`${color} text-white text-xs rounded px-2 py-1 mb-2 inline-block`}>
                {label}
              </div>
              <div className="text-2xl font-bold">{counts[key] || 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد ردود بعد</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const impact = IMPACT_LABELS[it.impact_level] || { label: it.impact_level, color: 'bg-gray-500' };
            return (
              <Card key={it.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <CardTitle className="text-base">
                        {it.user_name || 'زائر'} {it.user_email && <span className="text-xs text-muted-foreground">({it.user_email})</span>}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(it.created_at).toLocaleString('ar-EG')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${impact.color} text-white border-0`}>{impact.label}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(it.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex gap-2 flex-wrap text-sm">
                    {it.affects_reading && <Badge variant="outline">📖 يؤثر على قراءة الكتب</Badge>}
                    {it.affects_browsing && <Badge variant="outline">🌐 يؤثر على تصفح الموقع</Badge>}
                    {!it.affects_reading && !it.affects_browsing && <Badge variant="outline">لا مشاكل محددة</Badge>}
                  </div>
                  {it.comment && (
                    <div className="bg-muted/50 rounded p-3 text-sm whitespace-pre-wrap">{it.comment}</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdsFeedbackManager;
