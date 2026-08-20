import type { VenteDirecteDto } from './types';

const W = 32; // largeur en caractères pour 80mm ~32 cols à 11px Courier
const TVA_RATE = 0.18;

function pad(str: string, width: number, right = false): string {
  const s = String(str);
  if (s.length >= width) return s.slice(0, width);
  const spaces = ' '.repeat(width - s.length);
  return right ? spaces + s : s + spaces;
}

function line(left: string, right: string, width = W): string {
  const available = width - right.length;
  const l = left.length > available ? left.slice(0, available - 1) + '…' : left;
  return l + ' '.repeat(width - l.length - right.length) + right;
}

function sep(char = '-', width = W): string { return char.repeat(width); }

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
}
function receiptId(id: number): string {
  return 'VD-' + String(id).padStart(5, '0');
}

// Ouvre une nouvelle fenêtre, y écrit le HTML du reçu et déclenche l'impression.
// Le HTML est le même quel que soit le nombre de lignes — seul `lines` change.
function openReceiptWindow(title: string, lines: string[]): void {
  const logoUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/img/logo.png`
    : '/img/logo.png';

  const html = /* html */ `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 3mm 4mm 6mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-weight: 700; }
    html, body {
      width: 72mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.45;
      color: #000;
      background: #fff;
      white-space: pre;
    }
    .center { text-align: center; }
    .bold   { font-weight: bold; }
    .big    { font-size: 13px; font-weight: bold; }
    .brand-logo {
      display: block;
      width: 45mm;
      height: auto;
      max-height: 35mm;
      object-fit: contain;
      margin: 0 auto 6px;
    }
    @media screen {
      body {
        max-width: 300px;
        padding: 16px;
        background: #f5f5f5;
      }
      .paper {
        background: #fff;
        padding: 12px 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,.15);
      }
    }
  </style>
</head>
<body>
<div class="paper"><img class="brand-logo" src="${logoUrl}" alt="Juweirat" />${lines
    .map(l => {
      if (l.startsWith('Résidence') || l.startsWith('Lomé')) return `<div class="center">${l.trim()}</div>`;
      if (l.startsWith('Merci'))            return `<div class="center">${l.trim()}</div>`;
      if (l.startsWith('PRESTATION') || l.startsWith('TOTAL TTC') || l.startsWith('TOTAL (exonéré')) return `<div class="bold">${l}</div>`;
      return `<div>${l}</div>`;
    })
    .join('\n')}
</div>
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 250);
  };
<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=340,height=600,toolbar=0,menubar=0,scrollbars=1');
  if (!win) {
    alert('Autorisez les pop-ups pour imprimer le reçu.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

// Bloc de bas de reçu commun (règlement, chambre, client, footer).
function buildFooterLines(v: VenteDirecteDto): string[] {
  const out: string[] = [];
  if (v.mode === 'Encaissement' && v.paymentMethod) {
    out.push(line('Règlement :', v.paymentMethod));
    out.push(sep('-'));
  }
  if (v.mode === 'SurChambre' && v.roomNumber) {
    out.push(line('Facturé chambre :', v.roomNumber));
    out.push(line('Folio :', v.folioNumber ?? ''));
    out.push(sep('-'));
  }
  if (v.clientNom) {
    out.push(line('Client :', v.clientNom));
    out.push(sep('-'));
  }
  out.push('');
  out.push(pad('Merci de votre confiance', W, true).trimEnd());
  out.push(sep('='));
  out.push(''); out.push(''); out.push('');
  return out;
}

export function printVenteDirecte(vente: VenteDirecteDto): void {
  const exonere  = vente.tvaExonere === true;
  const ttc      = vente.total;
  const htTotal  = exonere ? ttc : Math.round(ttc / (1 + TVA_RATE));
  const tva      = exonere ? 0   : ttc - htTotal;
  const qty      = Math.max(1, vente.quantite);
  // Prix unitaire HT dérivé du total HT — cohérent avec l'arrondi comptable.
  const htUnit   = Math.round(htTotal / qty);

  const lines: string[] = [
    pad('Résidence Meublée', W, true).trimEnd(),
    pad('Lomé, Togo', W, true).trimEnd(),
    sep('='),
    '',
    line('Reçu ' + receiptId(vente.id), '').trimEnd(),
    line('Date : ' + fmtDate(vente.createdAt), fmtTime(vente.createdAt)),
    sep('-'),
    '',
    'PRESTATION',
    '',
    vente.prestationNameFr,
    line(`  ${htUnit.toLocaleString('fr')} F HT × ${vente.quantite}`, `${htTotal.toLocaleString('fr')} F`),
    '',
    sep('-'),
  ];

  if (!exonere) {
    lines.push(line('Total HT',   `${htTotal.toLocaleString('fr')} FCFA`));
    lines.push(line('TVA (18%)',  `${tva.toLocaleString('fr')} FCFA`));
    lines.push(line('TOTAL TTC',  `${ttc.toLocaleString('fr')} FCFA`));
  } else {
    lines.push(line('TOTAL (exonéré TVA)', `${ttc.toLocaleString('fr')} FCFA`));
  }
  lines.push(sep('='));
  lines.push(...buildFooterLines(vente));

  openReceiptWindow(`Reçu ${receiptId(vente.id)}`, lines);
}

// Reçu combiné pour un panier de plusieurs prestations vendues ensemble.
// Une seule en-tête, la liste des lignes en HT, puis un bloc totaux agrégé.
export function printVenteDirecteBatch(ventes: VenteDirecteDto[]): void {
  if (!ventes || ventes.length === 0) return;
  if (ventes.length === 1) { printVenteDirecte(ventes[0]); return; }

  // Toutes les ventes du batch partagent le mode et le folio (créées ensemble).
  const first    = ventes[0];
  const exonere  = first.tvaExonere === true;
  const ttcTotal = ventes.reduce((s, v) => s + v.total, 0);
  const htTotal  = exonere ? ttcTotal : Math.round(ttcTotal / (1 + TVA_RATE));
  const tva      = exonere ? 0        : ttcTotal - htTotal;

  const lines: string[] = [
    pad('Résidence Meublée', W, true).trimEnd(),
    pad('Lomé, Togo', W, true).trimEnd(),
    sep('='),
    '',
    line(`Reçu ${receiptId(first.id)}${ventes.length > 1 ? `..${String(ventes[ventes.length - 1].id).padStart(5, '0')}` : ''}`, '').trimEnd(),
    line('Date : ' + fmtDate(first.createdAt), fmtTime(first.createdAt)),
    sep('-'),
    '',
    `PRESTATIONS (${ventes.length})`,
    '',
  ];

  for (const v of ventes) {
    // Chaque ligne : nom, puis (HT unitaire × qté = HT total ligne).
    const qty        = Math.max(1, v.quantite);
    const htLigne    = exonere ? v.total : Math.round(v.total / (1 + TVA_RATE));
    const htUnitaire = Math.round(htLigne / qty);
    lines.push(v.prestationNameFr);
    lines.push(line(`  ${htUnitaire.toLocaleString('fr')} F HT × ${v.quantite}`, `${htLigne.toLocaleString('fr')} F`));
  }
  lines.push('');
  lines.push(sep('-'));

  if (!exonere) {
    lines.push(line('Total HT',   `${htTotal.toLocaleString('fr')} FCFA`));
    lines.push(line('TVA (18%)',  `${tva.toLocaleString('fr')} FCFA`));
    lines.push(line('TOTAL TTC',  `${ttcTotal.toLocaleString('fr')} FCFA`));
  } else {
    lines.push(line('TOTAL (exonéré TVA)', `${ttcTotal.toLocaleString('fr')} FCFA`));
  }
  lines.push(sep('='));
  lines.push(...buildFooterLines(first));

  openReceiptWindow(`Reçu panier (${ventes.length} prestations)`, lines);
}
