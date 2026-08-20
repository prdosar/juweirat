import type { VenteDirecteDto } from './types';

function pad(str: string, width: number, right = false): string {
  const s = String(str);
  if (s.length >= width) return s.slice(0, width);
  const spaces = ' '.repeat(width - s.length);
  return right ? spaces + s : s + spaces;
}

function line(left: string, right: string, width = 32): string {
  const available = width - right.length;
  const l = left.length > available ? left.slice(0, available - 1) + '…' : left;
  return l + ' '.repeat(width - l.length - right.length) + right;
}

function sep(char = '-', width = 32): string {
  return char.repeat(width);
}

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

export function printVenteDirecte(vente: VenteDirecteDto): void {
  const W = 32; // largeur en caractères pour 80mm ~32 cols à 11px Courier

  // URL absolue vers le logo : le reçu est écrit dans une nouvelle fenêtre,
  // les chemins relatifs y échouent.
  const logoUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/img/logo.png`
    : '/img/logo.png';

  const lines: string[] = [
    pad('Résidence Meublée', W, true).trimEnd(),
    pad('Lomé, Togo', W, true).trimEnd(),
    sep('=', W),
    '',
    line('Reçu ' + receiptId(vente.id), '', W).trimEnd(),
    line('Date : ' + fmtDate(vente.createdAt), fmtTime(vente.createdAt), W),
    sep('-', W),
    '',
    'PRESTATION',
    '',
    vente.prestationNameFr,
    line(
      `  ${vente.prixUnitaireSnapshot.toLocaleString('fr')} FCFA × ${vente.quantite}`,
      `${vente.total.toLocaleString('fr')} FCFA`,
      W,
    ),
    '',
    sep('-', W),
  ];

  // Décomposition TVA — 18% Togo. Prix stockés = TTC.
  const TVA_RATE = 0.18;
  const exonere  = vente.tvaExonere === true;
  const ttc      = vente.total;
  const ht       = exonere ? ttc : Math.round(ttc / (1 + TVA_RATE));
  const tva      = exonere ? 0   : ttc - ht;

  if (!exonere) {
    lines.push(line('Sous-total HT', `${ht.toLocaleString('fr')} FCFA`, W));
    lines.push(line('TVA (18%)',     `${tva.toLocaleString('fr')} FCFA`, W));
    lines.push(line('TOTAL TTC',     `${ttc.toLocaleString('fr')} FCFA`, W));
  } else {
    lines.push(line('TOTAL (exonéré TVA)', `${ttc.toLocaleString('fr')} FCFA`, W));
  }
  lines.push(sep('=', W));

  if (vente.mode === 'Encaissement' && vente.paymentMethod) {
    lines.push(line('Règlement :', vente.paymentMethod, W));
    lines.push(sep('-', W));
  }

  if (vente.mode === 'SurChambre' && vente.roomNumber) {
    lines.push(line('Facturé chambre :', vente.roomNumber, W));
    lines.push(line('Folio :', vente.folioNumber ?? '', W));
    lines.push(sep('-', W));
  }

  if (vente.clientNom) {
    lines.push(line('Client :', vente.clientNom, W));
    lines.push(sep('-', W));
  }

  lines.push('');
  lines.push(pad('Merci de votre confiance', W, true).trimEnd());
  lines.push(sep('=', W));
  lines.push('');
  lines.push('');
  lines.push('');

  const receiptHtml = /* html */ `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Reçu ${receiptId(vente.id)}</title>
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
      width: 80px;
      height: 80px;
      object-fit: contain;
      margin: 0 auto 4px;
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
  win.document.write(receiptHtml);
  win.document.close();
}
