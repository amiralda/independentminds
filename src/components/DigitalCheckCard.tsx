import { useI18n } from '@/lib/i18n';
import { type DigitalCheck } from '@/hooks/useDigitalChecks';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';

interface Props {
  check: DigitalCheck;
}

export function DigitalCheckCard({ check }: Props) {
  const { lang } = useI18n();

  const generatePDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [180, 80] });

    // Background
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 180, 80, 'F');

    // Border
    doc.setDrawColor(30, 150, 110);
    doc.setLineWidth(1);
    doc.rect(3, 3, 174, 74, 'S');

    // Inner decorative border
    doc.setDrawColor(30, 150, 110);
    doc.setLineWidth(0.3);
    doc.rect(5, 5, 170, 70, 'S');

    // Header
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('INDEPENDENT MINDS EDU', 10, 14);

    doc.setFontSize(7);
    doc.text(lang === 'HT' ? 'Chèk Dijital Edikasyon' : 'Digital Education Check', 10, 19);

    // Check number
    doc.setFontSize(8);
    doc.setTextColor(30, 150, 110);
    doc.text(`No. ${check.check_number}`, 145, 14);

    // Date
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${lang === 'HT' ? 'Dat' : 'Date'}: ${new Date(check.issued_at).toLocaleDateString()}`,
      145, 19
    );

    // Pay to line
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(lang === 'HT' ? 'PEYE A:' : 'PAY TO:', 10, 30);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.2);
    doc.line(30, 30, 130, 30);
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(lang === 'HT' ? 'Etidyan Merite' : 'Deserving Student', 32, 29.5);

    // Amount box
    doc.setFillColor(30, 150, 110);
    doc.roundedRect(135, 24, 35, 12, 2, 2, 'F');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `${check.currency_symbol}${Number(check.currency_amount).toFixed(2)}`,
      152.5, 32,
      { align: 'center' }
    );

    // Amount in words line
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(`${check.amount_points} ${lang === 'HT' ? 'pwen edikasyon' : 'education points'}`, 10, 40);
    doc.line(10, 41, 130, 41);

    // Memo
    if (check.memo) {
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`${lang === 'HT' ? 'Nòt' : 'Memo'}: ${check.memo}`, 10, 50);
    }

    // Status badge
    const statusColor = check.status === 'issued' ? [30, 150, 110] : [150, 150, 150];
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(10, 55, 25, 7, 1, 1, 'F');
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text(
      check.status === 'issued'
        ? (lang === 'HT' ? 'AKTIF' : 'ACTIVE')
        : (lang === 'HT' ? 'ITILIZE' : 'USED'),
      22.5, 59.5,
      { align: 'center' }
    );

    // Signature line
    doc.setDrawColor(150, 150, 150);
    doc.line(110, 65, 165, 65);
    doc.setFontSize(6);
    doc.setTextColor(130, 130, 130);
    doc.text(lang === 'HT' ? 'Siyati Paran' : 'Parent Signature', 137.5, 69, { align: 'center' });

    // Security pattern
    doc.setFontSize(4);
    doc.setTextColor(220, 220, 220);
    doc.text('IME • DIGITAL CHECK • SECURE', 90, 76, { align: 'center' });

    doc.save(`check-${check.check_number}.pdf`);
  };

  return (
    <div className="rounded-xl border bg-gradient-to-r from-card to-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-lg">
            {check.currency_symbol}
            {Number(check.currency_amount).toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            #{check.check_number} •{' '}
            {new Date(check.issued_at).toLocaleDateString()}
          </p>
          {check.memo && (
            <p className="text-[10px] text-muted-foreground italic mt-0.5">
              {check.memo}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              check.status === 'issued'
                ? 'bg-success/20 text-success'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {check.status === 'issued'
              ? lang === 'HT' ? '✅ Aktif' : '✅ Active'
              : lang === 'HT' ? '☑️ Itilize' : '☑️ Used'}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={generatePDF}
            aria-label={lang === 'HT' ? 'Telechaje chèk' : 'Download check'}
          >
            <Download size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
