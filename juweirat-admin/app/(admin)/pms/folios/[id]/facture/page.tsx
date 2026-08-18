'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import { pmsFolios, pmsFactures, pmsConfig } from '@/lib/pms';
import type { FolioDto, FactureDto, HotelConfigDto } from '@/lib/pmsTypes';

const num = (v: any) => (typeof v === 'number' && isFinite(v) ? v : 0);
const frDate = (s: string) =>
  s
    ? new Date(s + 'T00:00:00').toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

function buildFactureHTML(
  facture: FactureDto,
  config: HotelConfigDto,
  folio: FolioDto | null,
  duplicata: boolean,
  logoUrl: string
): string {
  const cur = {
    code: config.currencyCode || 'FCFA',
    decimals: config.currencyDecimals || 0,
  };
  const fm = (n: number) =>
    (cur.decimals
      ? num(n).toLocaleString('fr-FR', {
          minimumFractionDigits: cur.decimals,
          maximumFractionDigits: cur.decimals,
        })
      : Math.round(num(n)).toLocaleString('fr-FR')) +
    ' ' +
    cur.code;

  const s = facture.snapshot || ({} as any);
  const cancelled = facture.status === 'Annulee' || facture.status === 'annulée';
  const destSociete = s.recipient === 'societe' && s.societe;
  const destNom = destSociete ? s.societe : s.client || 'Client';
  const total =
    num(s.total) ||
    (s.lines || []).reduce((acc: number, l: any) => acc + num(l.montant), 0);
  const paid = num(s.paid);
  const arrhes = num(s.arrhes);
  const solde = Math.max(0, total - paid - arrhes);
  const avoir = Math.max(0, paid + arrhes - total);
  const isSettled = solde <= 0.5;

  const rowsHTML = (s.lines || [])
    .map(
      (r: any, i: number) =>
        `<tr style="background:${i % 2 === 1 ? '#FAF8F5' : '#FFFFFF'};">
      <td style="padding:6px 10px;border-bottom:1px solid #EAE5DC;font-size:11px;color:#2A2622;font-weight:500;">${r.label}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #EAE5DC;font-size:11px;text-align:right;font-variant-numeric:tabular-nums;font-weight:700;color:#1B4332;">${fm(
        r.montant
      )}</td>
    </tr>`
    )
    .join('');

  let statusBadge = '';
  if (cancelled) {
    statusBadge =
      '<div style="margin-top:4px;display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#9B2C2C;background:#FFF5F5;border:1px solid #E53E3E;">FACTURE ANNULÉE</div>';
  } else if (duplicata) {
    statusBadge =
      '<div style="margin-top:4px;display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#9B2C2C;background:#FFF5F5;border:1px solid #FEB2B2;">DUPLICATA</div>';
  } else if ((facture.corrections || 0) > 0) {
    statusBadge =
      '<div style="margin-top:4px;display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#B5761F;background:#FFFDF5;border:1px solid #F6E05E;">FACTURE RECTIFIÉE</div>';
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Facture ${facture.number} — ${config.buildingName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      background: #FFFFFF !important;
      color: #1F2421;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      margin: 0;
      padding: 0;
      height: 100%;
      max-height: 100%;
      overflow: hidden;
    }
    .invoice-card {
      max-width: 740px;
      margin: 0 auto;
      background: #FFFFFF;
      padding: 0;
      page-break-inside: avoid;
      page-break-after: avoid;
      break-inside: avoid;
      break-after: avoid;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        height: 100% !important;
        max-height: 100% !important;
        overflow: hidden !important;
        background: #FFFFFF !important;
      }
      .invoice-card {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-card" style="opacity:${cancelled ? '0.75' : '1'};">
    <!-- Header -->
    <header style="display:flex;justify-content:space-between;align-items:center;border-bottom:2.5px solid #B08D57;padding-bottom:8px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${logoUrl}" alt="Logo Juweirat" style="height:44px;max-width:130px;object-fit:contain;" />
        <div>
          <div style="font-size:15px;font-weight:900;color:#1B4332;letter-spacing:-0.2px;text-transform:uppercase;line-height:1.1;">
            ${config.buildingName}
          </div>
          <div style="font-size:10px;color:#716B61;font-weight:600;margin-top:2px;">
            SCI JUWEIRAT · Résidence Hôtelière
          </div>
          <div style="font-size:9.5px;color:#8A8172;">
            Quartier Gbossimé, Lomé — TOGO
          </div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="display:inline-block;background:#1B4332;color:#FFFFFF;font-weight:800;font-size:12px;letter-spacing:0.5px;padding:3.5px 10px;border-radius:4px;text-transform:uppercase;">
          FACTURE N° ${facture.number}
        </div>
        <div style="font-size:10.5px;color:#554F47;margin-top:3px;">
          Date d’émission : <strong>${frDate(facture.date)}</strong>
        </div>
        <div style="font-size:10px;color:#8A8172;">
          Réf. Folio : ${folio?.number || facture.folioId}
        </div>
        ${statusBadge}
      </div>
    </header>

    <!-- Client & Stay Section -->
    <section style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
      <div style="background:#FAF8F5;border:1px solid #E5DFD5;border-radius:6px;padding:8px 10px;">
        <div style="font-size:9px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#B08D57;margin-bottom:3px;">
          Facturé à / Destinataire
        </div>
        <div style="font-size:13px;font-weight:800;color:#1B4332;">
          ${destNom}
        </div>
        ${
          !destSociete && s.reservataire
            ? `<div style="font-size:10.5px;color:#6B6458;margin-top:2px;">Réservataire : ${s.reservataire}</div>`
            : ''
        }
        ${
          s.phone || s.email
            ? `<div style="font-size:10px;color:#8A8172;margin-top:2px;">${[
                s.phone,
                s.email,
              ]
                .filter(Boolean)
                .join(' · ')}</div>`
            : ''
        }
      </div>
      <div style="background:#FAF8F5;border:1px solid #E5DFD5;border-radius:6px;padding:8px 10px;">
        <div style="font-size:9px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#B08D57;margin-bottom:3px;">
          Détails du Séjour
        </div>
        <div style="font-size:12.5px;font-weight:700;color:#1B4332;">
          ${s.unitLabel || 'Hébergement Juweirat'}
        </div>
        <div style="font-size:10.5px;color:#5C564D;margin-top:2px;">
          Du <strong>${frDate(s.arrival)}</strong> au <strong>${frDate(
    s.departure
  )}</strong> (${num(s.nights)} nuit${num(s.nights) > 1 ? 's' : ''})
        </div>
        <div style="font-size:10px;color:#8A8172;margin-top:1px;">
          Occupants : ${num(s.pax)} personne${num(s.pax) > 1 ? 's' : ''}
        </div>
      </div>
    </section>

    <!-- Table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
      <thead>
        <tr>
          <th style="background:#1B4332;color:#FFFFFF;font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;padding:6px 10px;text-align:left;border-top-left-radius:4px;">
            Désignation des prestations
          </th>
          <th style="background:#1B4332;color:#FFFFFF;font-size:10px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;padding:6px 10px;text-align:right;border-top-right-radius:4px;width:150px;">
            Montant (${cur.code})
          </th>
        </tr>
      </thead>
      <tbody>
        ${rowsHTML}
      </tbody>
    </table>

    <!-- Settlement & Totals -->
    <section style="display:flex;justify-content:space-between;align-items:stretch;gap:12px;margin-bottom:8px;">
      <div style="flex:1;background:#FAF8F5;border:1px solid #E5DFD5;border-radius:6px;padding:8px 10px;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div style="font-size:9px;font-weight:800;color:#B08D57;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;">
            Mode & Statut de Règlement
          </div>
          <div style="font-size:11px;color:#4A443B;">
            Mode de paiement : <strong>${s.payMode || 'Espèces'}</strong>
          </div>
          <div style="font-size:10.5px;color:#716B61;margin-top:2px;">
            Réf. Transaction / Reçu : Facture ${facture.number}
          </div>
        </div>
        <div style="margin-top:6px;">
          ${
            isSettled
              ? '<span style="display:inline-block;background:#DEF7EC;color:#03543F;border:1px solid #BCF0DA;padding:3px 8px;border-radius:4px;font-weight:800;font-size:10.5px;">✓ FACTURE SOLDÉE / ACQUITTÉE</span>'
              : `<span style="display:inline-block;background:#FDE8E8;color:#9B1C1C;border:1px solid #FBD5D5;padding:3px 8px;border-radius:4px;font-weight:800;font-size:10.5px;">⚠ SOLDE RESTANT DÛ : ${fm(
                  solde
                )}</span>`
          }
        </div>
      </div>
      <div style="width:270px;background:#FAF8F5;border:1px solid #E5DFD5;border-radius:6px;padding:6px 10px;">
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <tr>
            <td style="padding:3px 0;color:#554F47;">Total Prestations</td>
            <td style="padding:3px 0;text-align:right;font-variant-numeric:tabular-nums;font-weight:700;color:#1B4332;">${fm(
              total
            )}</td>
          </tr>
          ${
            arrhes > 0
              ? `<tr><td style="padding:3px 0;color:#554F47;">Arrhes / Acompte</td><td style="padding:3px 0;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#2D6A4F;">- ${fm(
                  arrhes
                )}</td></tr>`
              : ''
          }
          <tr>
            <td style="padding:3px 0;color:#554F47;">Montant Réglé</td>
            <td style="padding:3px 0;text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#2D6A4F;">- ${fm(
              paid
            )}</td>
          </tr>
          <tr style="border-top:1.5px solid #1B4332;border-bottom:1.5px solid #1B4332;background:#F4EFE6;">
            <td style="padding:5px 4px;font-size:11.5px;font-weight:900;color:#1B4332;text-transform:uppercase;">
              Net à Payer (Solde)
            </td>
            <td style="padding:5px 4px;text-align:right;font-size:12.5px;font-variant-numeric:tabular-nums;font-weight:900;color:${
              solde > 0.5 ? '#9B1C1C' : '#15803D'
            };">
              ${fm(solde)}
            </td>
          </tr>
          ${
            avoir > 0.5
              ? `<tr><td style="padding:3px 0;color:#1E429F;font-weight:600;">Avoir / Trop-perçu</td><td style="padding:3px 0;text-align:right;font-variant-numeric:tabular-nums;font-weight:700;color:#1E429F;">${fm(
                  avoir
                )}</td></tr>`
              : ''
          }
        </table>
      </div>
    </section>

    <!-- Footer -->
    <footer style="border-top:1px solid #E5DFD5;padding-top:8px;display:flex;justify-content:space-between;align-items:flex-end;font-size:9.5px;color:#7A746B;">
      <div>
        <div style="font-weight:700;color:#1B4332;font-size:10px;">${
          config.buildingName
        } — Résidence Hôtelière</div>
        <div>Tél : +228 90 00 00 00 · Email : contact@juweirat.com</div>
        <div>Facture générée informatiquement, valable comme justificatif officiel de séjour et de règlement.</div>
      </div>
      <div style="text-align:center;border:1px dashed #C4BCAF;border-radius:4px;padding:4px 10px;background:#FAFAFA;width:130px;">
        <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:0.5px;color:#8A8172;font-weight:700;">Cachet & Signature</div>
        <div style="height:22px;"></div>
        <div style="font-size:8px;color:#B08D57;font-style:italic;">Pour Acquit</div>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

export default function FacturePrintPage() {
  const { id } = useParams<{ id: string }>();
  const [folio, setFolio] = useState<FolioDto | null>(null);
  const [facture, setFacture] = useState<FactureDto | null>(null);
  const [config, setConfig] = useState<HotelConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([pmsFolios.getById(Number(id)), pmsConfig.get()])
      .then(([f, c]) => {
        setFolio(f);
        setConfig(c);
        if (f.factureId) {
          return pmsFactures.getById(f.factureId).then(setFacture);
        } else {
          throw new Error('Aucune facture émise pour ce folio.');
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Erreur de chargement');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-green/30 border-t-green rounded-full animate-spin" />
      </div>
    );

  if (error || !facture || !config)
    return (
      <div className="p-8 text-center text-red-600 font-medium">
        {error || 'Facture introuvable.'}
      </div>
    );

  const cur = {
    code: config.currencyCode || 'FCFA',
    decimals: config.currencyDecimals || 0,
  };
  const fm = (n: number) =>
    (cur.decimals
      ? num(n).toLocaleString('fr-FR', {
          minimumFractionDigits: cur.decimals,
          maximumFractionDigits: cur.decimals,
        })
      : Math.round(num(n)).toLocaleString('fr-FR')) +
    ' ' +
    cur.code;

  const s = facture.snapshot || ({} as any);
  const cancelled = facture.status === 'Annulee' || facture.status === 'annulée';
  const duplicata = (facture.printCount || 0) >= 1;
  const destSociete = s.recipient === 'societe' && s.societe;
  const destNom = destSociete ? s.societe : s.client || 'Client';

  const total =
    num(s.total) ||
    (s.lines || []).reduce((acc: number, l: any) => acc + num(l.montant), 0);
  const paid = num(s.paid);
  const arrhes = num(s.arrhes);
  const solde = Math.max(0, total - paid - arrhes);
  const avoir = Math.max(0, paid + arrhes - total);
  const isSettled = solde <= 0.5;
  const lines = s.lines || [];

  const handlePrint = () => {
    pmsFactures.print(facture.id).catch(() => {});

    const logoUrl =
      typeof window !== 'undefined'
        ? window.location.origin + '/img/logo.png'
        : '/img/logo.png';
    const html = buildFactureHTML(facture, config, folio, duplicata, logoUrl);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 2000);
    }, 250);
  };

  return (
    <div className="min-h-full flex flex-col bg-gray-100 print:bg-white text-charcoal">
      {/* Print styles */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            max-height: 100% !important;
            overflow: hidden !important;
            background: #FFFFFF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body * {
            visibility: hidden !important;
          }
          
          aside, header, nav, footer, .no-print, [data-no-print] {
            display: none !important;
            visibility: hidden !important;
          }

          #facture-sheet, #facture-sheet * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          #facture-sheet {
            display: block !important;
            position: fixed !important;
            top: 6mm !important;
            left: 8mm !important;
            right: 8mm !important;
            width: calc(100% - 16mm) !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #FFFFFF !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            break-inside: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* Screen Toolbar */}
      <header className="no-print bg-white border-b border-gray-200 px-6 py-3.5 sticky top-0 z-20 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/pms/folios/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-charcoal transition-colors font-medium"
          >
            <ArrowLeft size={16} /> Retour au folio
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <FileText size={16} className="text-[#1B4332]" />
            <span className="font-semibold">Facture {facture.number}</span>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 bg-[#1B4332] text-white hover:bg-[#143225] px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all"
        >
          <Printer size={15} /> Imprimer la facture
        </button>
      </header>

      {/* Screen Paper Preview with Pure Inline Styles matching the Printout 1:1 */}
      <main className="py-6 px-4 print:p-0">
        <div
          id="facture-sheet"
          style={{
            maxWidth: '740px',
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            padding: '24px 28px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            borderRadius: '4px',
            border: '1px solid #E5DFD5',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSize: '11px',
            lineHeight: 1.35,
            color: '#1F2421',
            opacity: cancelled ? 0.75 : 1,
          }}
        >
          {/* Header */}
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2.5px solid #B08D57',
              paddingBottom: '8px',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/logo.png"
                alt="Logo Juweirat"
                style={{
                  height: '44px',
                  maxWidth: '130px',
                  objectFit: 'contain',
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    color: '#1B4332',
                    letterSpacing: '-0.2px',
                    textTransform: 'uppercase',
                    lineHeight: 1.1,
                  }}
                >
                  {config.buildingName}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#716B61',
                    fontWeight: 600,
                    marginTop: '2px',
                  }}
                >
                  SCI JUWEIRAT · Résidence Hôtelière
                </div>
                <div style={{ fontSize: '9.5px', color: '#8A8172' }}>
                  Quartier Gbossimé, Lomé — TOGO
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: '#1B4332',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '12px',
                  letterSpacing: '0.5px',
                  padding: '3.5px 10px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                }}
              >
                FACTURE N° {facture.number}
              </div>
              <div
                style={{
                  fontSize: '10.5px',
                  color: '#554F47',
                  marginTop: '3px',
                }}
              >
                Date d’émission : <strong>{frDate(facture.date)}</strong>
              </div>
              <div style={{ fontSize: '10px', color: '#8A8172' }}>
                Réf. Folio : {folio?.number || facture.folioId}
              </div>

              {cancelled && (
                <div
                  style={{
                    marginTop: '4px',
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: '#9B2C2C',
                    backgroundColor: '#FFF5F5',
                    border: '1px solid #E53E3E',
                  }}
                >
                  FACTURE ANNULÉE
                </div>
              )}
              {!cancelled && duplicata && (
                <div
                  style={{
                    marginTop: '4px',
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: '#9B2C2C',
                    backgroundColor: '#FFF5F5',
                    border: '1px solid #FEB2B2',
                  }}
                >
                  DUPLICATA
                </div>
              )}
              {!cancelled && !duplicata && (facture.corrections || 0) > 0 && (
                <div
                  style={{
                    marginTop: '4px',
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: '#B5761F',
                    backgroundColor: '#FFFDF5',
                    border: '1px solid #F6E05E',
                  }}
                >
                  FACTURE RECTIFIÉE
                </div>
              )}
            </div>
          </header>

          {/* Client & Stay 2-Card Grid */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                backgroundColor: '#FAF8F5',
                border: '1px solid #E5DFD5',
                borderRadius: '6px',
                padding: '8px 10px',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  color: '#B08D57',
                  marginBottom: '3px',
                }}
              >
                Facturé à / Destinataire
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#1B4332',
                }}
              >
                {destNom}
              </div>
              {!destSociete && s.reservataire && (
                <div
                  style={{
                    fontSize: '10.5px',
                    color: '#6B6458',
                    marginTop: '2px',
                  }}
                >
                  Réservataire : {s.reservataire}
                </div>
              )}
              {(s.phone || s.email) && (
                <div
                  style={{
                    fontSize: '10px',
                    color: '#8A8172',
                    marginTop: '2px',
                  }}
                >
                  {[s.phone, s.email].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>

            <div
              style={{
                backgroundColor: '#FAF8F5',
                border: '1px solid #E5DFD5',
                borderRadius: '6px',
                padding: '8px 10px',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  color: '#B08D57',
                  marginBottom: '3px',
                }}
              >
                Détails du Séjour
              </div>
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#1B4332',
                }}
              >
                {s.unitLabel || 'Hébergement Juweirat'}
              </div>
              <div
                style={{
                  fontSize: '10.5px',
                  color: '#5C564D',
                  marginTop: '2px',
                }}
              >
                Du <strong>{frDate(s.arrival)}</strong> au{' '}
                <strong>{frDate(s.departure)}</strong> ({num(s.nights)} nuit
                {num(s.nights) > 1 ? 's' : ''})
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: '#8A8172',
                  marginTop: '1px',
                }}
              >
                Occupants : {num(s.pax)} personne{num(s.pax) > 1 ? 's' : ''}
              </div>
            </div>
          </section>

          {/* Items Table */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '8px',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    backgroundColor: '#1B4332',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    padding: '6px 10px',
                    textAlign: 'left',
                    borderTopLeftRadius: '4px',
                  }}
                >
                  Désignation des prestations
                </th>
                <th
                  style={{
                    backgroundColor: '#1B4332',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    padding: '6px 10px',
                    textAlign: 'right',
                    borderTopRightRadius: '4px',
                    width: '150px',
                  }}
                >
                  Montant ({cur.code})
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((r: any, i: number) => (
                <tr
                  key={i}
                  style={{
                    backgroundColor: i % 2 === 1 ? '#FAF8F5' : '#FFFFFF',
                  }}
                >
                  <td
                    style={{
                      padding: '6px 10px',
                      borderBottom: '1px solid #EAE5DC',
                      fontSize: '11px',
                      color: '#2A2622',
                      fontWeight: 500,
                    }}
                  >
                    {r.label}
                  </td>
                  <td
                    style={{
                      padding: '6px 10px',
                      borderBottom: '1px solid #EAE5DC',
                      fontSize: '11px',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 700,
                      color: '#1B4332',
                    }}
                  >
                    {fm(r.montant)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Settlement Summary & Totals */}
          <section
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'stretch',
              gap: '12px',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                flex: 1,
                backgroundColor: '#FAF8F5',
                border: '1px solid #E5DFD5',
                borderRadius: '6px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    color: '#B08D57',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    marginBottom: '3px',
                  }}
                >
                  Mode & Statut de Règlement
                </div>
                <div style={{ fontSize: '11px', color: '#4A443B' }}>
                  Mode de paiement : <strong>{s.payMode || 'Espèces'}</strong>
                </div>
                <div
                  style={{
                    fontSize: '10.5px',
                    color: '#716B61',
                    marginTop: '2px',
                  }}
                >
                  Réf. Transaction / Reçu : Facture {facture.number}
                </div>
              </div>
              <div style={{ marginTop: '6px' }}>
                {isSettled ? (
                  <span
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#DEF7EC',
                      color: '#03543F',
                      border: '1px solid #BCF0DA',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontWeight: 800,
                      fontSize: '10.5px',
                    }}
                  >
                    ✓ FACTURE SOLDÉE / ACQUITTÉE
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#FDE8E8',
                      color: '#9B1C1C',
                      border: '1px solid #FBD5D5',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontWeight: 800,
                      fontSize: '10.5px',
                    }}
                  >
                    ⚠ SOLDE RESTANT DÛ : {fm(solde)}
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                width: '270px',
                backgroundColor: '#FAF8F5',
                border: '1px solid #E5DFD5',
                borderRadius: '6px',
                padding: '6px 10px',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '11px',
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ padding: '3px 0', color: '#554F47' }}>
                      Total Prestations
                    </td>
                    <td
                      style={{
                        padding: '3px 0',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 700,
                        color: '#1B4332',
                      }}
                    >
                      {fm(total)}
                    </td>
                  </tr>
                  {arrhes > 0 && (
                    <tr>
                      <td style={{ padding: '3px 0', color: '#554F47' }}>
                        Arrhes / Acompte
                      </td>
                      <td
                        style={{
                          padding: '3px 0',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 600,
                          color: '#2D6A4F',
                        }}
                      >
                        - {fm(arrhes)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: '3px 0', color: '#554F47' }}>
                      Montant Réglé
                    </td>
                    <td
                      style={{
                        padding: '3px 0',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 600,
                        color: '#2D6A4F',
                      }}
                    >
                      - {fm(paid)}
                    </td>
                  </tr>
                  <tr
                    style={{
                      borderTop: '1.5px solid #1B4332',
                      borderBottom: '1.5px solid #1B4332',
                      backgroundColor: '#F4EFE6',
                    }}
                  >
                    <td
                      style={{
                        padding: '5px 4px',
                        fontSize: '11.5px',
                        fontWeight: 900,
                        color: '#1B4332',
                        textTransform: 'uppercase',
                      }}
                    >
                      Net à Payer (Solde)
                    </td>
                    <td
                      style={{
                        padding: '5px 4px',
                        textAlign: 'right',
                        fontSize: '12.5px',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 900,
                        color: solde > 0.5 ? '#9B1C1C' : '#15803D',
                      }}
                    >
                      {fm(solde)}
                    </td>
                  </tr>
                  {avoir > 0.5 && (
                    <tr>
                      <td
                        style={{
                          padding: '3px 0',
                          color: '#1E429F',
                          fontWeight: 600,
                        }}
                      >
                        Avoir / Trop-perçu
                      </td>
                      <td
                        style={{
                          padding: '3px 0',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          color: '#1E429F',
                        }}
                      >
                        {fm(avoir)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Footer */}
          <footer
            style={{
              borderTop: '1px solid #E5DFD5',
              paddingTop: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontSize: '9.5px',
              color: '#7A746B',
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 700,
                  color: '#1B4332',
                  fontSize: '10px',
                }}
              >
                {config.buildingName} — Résidence Hôtelière
              </div>
              <div>Tél : +228 90 00 00 00 · Email : contact@juweirat.com</div>
              <div>
                Facture générée informatiquement, valable comme justificatif
                officiel de séjour et de règlement.
              </div>
            </div>
            <div
              style={{
                textAlign: 'center',
                border: '1px dashed #C4BCAF',
                borderRadius: '4px',
                padding: '4px 10px',
                backgroundColor: '#FAFAFA',
                width: '130px',
              }}
            >
              <div
                style={{
                  fontSize: '8.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#8A8172',
                  fontWeight: 700,
                }}
              >
                Cachet & Signature
              </div>
              <div style={{ height: '22px' }}></div>
              <div
                style={{
                  fontSize: '8px',
                  color: '#B08D57',
                  fontStyle: 'italic',
                }}
              >
                Pour Acquit
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
