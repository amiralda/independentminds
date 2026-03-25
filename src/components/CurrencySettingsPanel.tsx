import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCurrencySettings,
  useSaveCurrencySettings,
  CURRENCIES,
} from '@/hooks/useCurrencySettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Coins, Save } from 'lucide-react';
import { toast } from 'sonner';

export function CurrencySettingsPanel() {
  const { lang, t } = useI18n();
  const { selectedStudentId } = useAuth();
  const { data: settings } = useCurrencySettings(selectedStudentId || null);
  const saveMutation = useSaveCurrencySettings();

  const [currencyCode, setCurrencyCode] = useState('USD');
  const [pointsPerUnit, setPointsPerUnit] = useState(100);

  useEffect(() => {
    if (settings) {
      setCurrencyCode(settings.currency_code);
      setPointsPerUnit(settings.points_per_unit);
    }
  }, [settings]);

  const selectedCurrency = CURRENCIES.find(c => c.code === currencyCode);

  const handleSave = () => {
    if (!selectedStudentId || !selectedCurrency) return;
    saveMutation.mutate(
      {
        student_id: selectedStudentId,
        currency_code: selectedCurrency.code,
        currency_symbol: selectedCurrency.symbol,
        points_per_unit: pointsPerUnit,
      },
      {
        onSuccess: () => toast.success(t('currency.saved')),
      }
    );
  };

  return (
    <div className="space-y-4 rounded-xl border p-4 bg-card">
      <div className="flex items-center gap-2">
        <Coins size={18} className="text-secondary" />
        <h3 className="font-display font-bold text-sm">
          {t('currency.title')}
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">
            {t('currency.label')}
          </Label>
          <Select value={currencyCode} onValueChange={setCurrencyCode}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} {lang === 'HT' ? c.nameHT : c.name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">
            {t('currency.pointsPerUnit')}
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              min={1}
              max={10000}
              value={pointsPerUnit}
              onChange={e => setPointsPerUnit(Number(e.target.value) || 1)}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground">
              {t('currency.pts')} = {selectedCurrency?.symbol}1
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {t('currency.example')} = {selectedCurrency?.symbol}{(500 / pointsPerUnit).toFixed(2)}
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full text-xs font-display"
        >
          <Save size={14} className="mr-1" />
          {lang === 'HT' ? 'Anrejistre' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
