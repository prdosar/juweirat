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

export default function FacturePrintPage() {
  const { id } = useParams<{ id: string }>();
  const [folio, setFolio]     = useState<FolioDto | null>(null);
  const [facture, setFacture] = useState<FactureDto | null>(null);
  const [config, setConfig]   = useState<HotelConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

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

  const total = num(s.total);
  const paid = num(s.paid);
  const arrhes = num(s.arrhes);
  const solde = Math.max(0, total - paid - arrhes);
  const avoir = Math.max(0, paid + arrhes - total);
  const lines = s.lines || [];

  const handlePrint = () => {
    pmsFactures.print(facture.id).catch(() => {});

    const sheet = document.getElementById('facture-sheet');
    if (!sheet) {
      window.print();
      return;
    }

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
    doc.write(`
      <!DOCTYPE html>
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
          }
          html, body {
            background: #FFFFFF;
            color: #1F2421;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 11px;
            line-height: 1.3;
            margin: 0;
            padding: 0;
            height: 100%;
            max-height: 100%;
            overflow: hidden;
          }
          .invoice-card {
            max-width: 100%;
            margin: 0 auto;
            background: #fff;
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
              background: #fff !important;
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
        <div class="invoice-card">
          ${sheet.innerHTML}
        </div>
      </body>
      </html>
    `);
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
    <div className="min-h-screen bg-gray-100 print:bg-white text-charcoal">
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
          }
          
          /* Hide EVERYTHING on the page */
          body * {
            visibility: hidden !important;
          }
          
          aside, header, nav, footer, .no-print, [data-no-print] {
            display: none !important;
            visibility: hidden !important;
          }

          /* Show ONLY #facture-sheet */
          #facture-sheet, #facture-sheet * {
            visibility: visible !important;
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
            <FileText size={16} className="text-green-dark" />
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

      {/* Screen Paper Preview */}
      <main className="py-6 px-4 print:p-0">
        <div
          id="facture-sheet"
          className={`max-w-[760px] mx-auto bg-white p-7 print:p-0 shadow-lg rounded-sm border border-gray-200 print:border-none font-sans ${
            cancelled ? 'opacity-75' : ''
          }`}
        >
          {/* Header with Logo */}
          <div className="flex justify-between items-center border-b-[2.5px] border-[#B08D57] pb-3 mb-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/img/logo.png"
                alt="Logo Juweirat"
                className="h-11 w-auto max-w-[130px] object-contain"
              />
              <div>
                <div className="text-[15px] font-black text-[#1B4332] uppercase tracking-tight">
                  {config.buildingName}
                </div>
                <div className="text-[10.5px] text-gray-600 font-medium mt-0.5">
                  SCI JUWEIRAT · Résidence Hôtelière
                </div>
                <div className="text-[10px] text-gray-500">
                  Quartier Gbossimé, Lomé — TOGO
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block bg-[#1B4332] text-white text-[12.5px] font-extrabold uppercase tracking-wide px-3 py-1 rounded">
                FACTURE N° {facture.number}
              </div>
              <div className="text-[11px] text-gray-600 mt-1">
                Date d’émission : <strong>{frDate(facture.date)}</strong>
              </div>
              <div className="text-[10.5px] text-gray-400">
                Réf. Folio : {folio?.number}
              </div>

              {cancelled && (
                <div className="mt-1 inline-block text-[10px] font-extrabold text-red-700 bg-red-50 border border-red-300 rounded px-2 py-0.5 tracking-wider uppercase">
                  FACTURE ANNULÉE
                </div>
              )}
              {!cancelled && duplicata && (
                <div className="mt-1 inline-block text-[10px] font-extrabold text-red-700 bg-red-50 border border-red-300 rounded px-2 py-0.5 tracking-wider uppercase">
                  DUPLICATA
                </div>
              )}
              {!cancelled && !duplicata && (facture.corrections || 0) > 0 && (
                <div className="mt-1 inline-block text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-300 rounded px-2 py-0.5 tracking-wider uppercase">
                  FACTURE RECTIFIÉE
                </div>
              )}
            </div>
          </div>

          {/* Destinataire / Séjour (2 Cards) */}
          <div className="grid grid-cols-2 gap-3 mb-3 text-[12px]">
            <div className="border border-[#E5DFD5] rounded-md p-2.5 bg-[#FAF8F5]">
              <div className="text-[9px] tracking-wider uppercase text-[#B08D57] font-extrabold mb-1">
                Facturé à / Destinataire
              </div>
              <div className="font-extrabold text-[13px] text-[#1B4332]">{destNom}</div>
              {!destSociete && s.reservataire && (
                <div className="text-[10.5px] text-gray-600 mt-0.5">
                  Réservataire : {s.reservataire}
                </div>
              )}
              {(s.phone || s.email) && (
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {[s.phone, s.email].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>

            <div className="border border-[#E5DFD5] rounded-md p-2.5 bg-[#FAF8F5]">
              <div className="text-[9px] tracking-wider uppercase text-[#B08D57] font-extrabold mb-1">
                Détails du séjour
              </div>
              <div className="font-bold text-[12.5px] text-[#1B4332]">{s.unitLabel || 'Hébergement Juweirat'}</div>
              <div className="text-[10.5px] text-gray-600 mt-0.5">
                Du <strong>{frDate(s.arrival)}</strong> au <strong>{frDate(s.departure)}</strong> ({num(s.nights)} nuit{num(s.nights) > 1 ? 's' : ''})
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                Occupants : {num(s.pax)} personne{num(s.pax) > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-2.5 text-[11.5px]">
            <thead>
              <tr>
                <th className="bg-[#1B4332] text-white text-left px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-tl">
                  Désignation des prestations
                </th>
                <th className="bg-[#1B4332] text-white text-right px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-bold w-40 rounded-tr">
                  Montant ({cur.code})
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((r: any, i: number) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-[#FAF8F5]' : 'bg-white'}>
                  <td className="px-2.5 py-1.5 border-b border-gray-100 text-charcoal font-medium">
                    {r.label}
                  </td>
                  <td className="px-2.5 py-1.5 border-b border-gray-100 text-right tabular-nums font-semibold text-[#1B4332]">
                    {fm(r.montant)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Settlement Summary & Totals */}
          <div className="flex justify-between items-stretch gap-3 mb-2.5">
            <div className="flex-1 border border-[#E5DFD5] rounded-md p-2.5 bg-[#FAF8F5] flex flex-col justify-between">
              <div>
                <div className="text-[9px] tracking-wider uppercase text-[#B08D57] font-extrabold mb-1">
                  Mode & Statut de Règlement
                </div>
                <div className="text-[11px] text-gray-700">
                  Mode de paiement : <strong>{s.payMode || 'Espèces'}</strong>
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Réf. Transaction : Facture {facture.number}
                </div>
              </div>
              <div className="mt-2">
                {solde <= 0.5 ? (
                  <span className="inline-block bg-[#DEF7EC] text-[#03543F] border border-[#BCF0DA] px-2 py-0.5 rounded text-[10.5px] font-extrabold">
                    ✓ FACTURE SOLDÉE / ACQUITTÉE
                  </span>
                ) : (
                  <span className="inline-block bg-[#FDE8E8] text-[#9B1C1C] border border-[#FBD5D5] px-2 py-0.5 rounded text-[10.5px] font-extrabold">
                    ⚠ SOLDE RESTANT DÛ : {fm(solde)}
                  </span>
                )}
              </div>
            </div>

            <div className="w-64 border border-[#E5DFD5] rounded-md p-2 bg-[#FAF8F5]">
              <table className="w-full border-collapse text-[11px]">
                <tbody>
                  <tr>
                    <td className="py-0.5 text-gray-600">Total Prestations</td>
                    <td className="py-0.5 text-right tabular-nums font-bold text-[#1B4332]">{fm(total)}</td>
                  </tr>
                  {arrhes > 0 && (
                    <tr>
                      <td className="py-0.5 text-gray-600">Arrhes / Acompte</td>
                      <td className="py-0.5 text-right tabular-nums font-medium text-[#2D6A4F]">- {fm(arrhes)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-0.5 text-gray-600">Montant Réglé</td>
                    <td className="py-0.5 text-right tabular-nums font-medium text-[#2D6A4F]">- {fm(paid)}</td>
                  </tr>
                  <tr className="border-t-[1.5px] border-b-[1.5px] border-[#1B4332] bg-[#F4EFE6]">
                    <td className="py-1 px-1 font-black text-[11.5px] text-[#1B4332] uppercase">
                      Net à Payer (Solde)
                    </td>
                    <td
                      className={`py-1 px-1 text-right tabular-nums font-black text-[12.5px] ${
                        solde > 0.5 ? 'text-red-700' : 'text-[#15803D]'
                      }`}
                    >
                      {fm(solde)}
                    </td>
                  </tr>
                  {avoir > 0.5 && (
                    <tr>
                      <td className="py-0.5 text-blue-800 font-semibold">Avoir / Trop-perçu</td>
                      <td className="py-0.5 text-right tabular-nums font-bold text-blue-800">{fm(avoir)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer & Legal Mentions with Signature Box */}
          <div className="border-t border-[#E5DFD5] pt-2 flex justify-between items-end text-[9.5px] text-gray-500">
            <div>
              <p className="font-bold text-gray-700">{config.buildingName} — SCI JUWEIRAT</p>
              <p>Quartier GBOSSIME, Lomé, TOGO · Tél : (+228) 90 00 00 00 · contact@juweirat.com</p>
              <p className="mt-0.5 text-[9px] text-gray-400">Éditée le {frDate(facture.date)} · Document officiel PMS Juweirat</p>
            </div>
            <div className="text-center border border-dashed border-[#C4BCAF] rounded px-2.5 py-1 bg-gray-50 w-28 shrink-0">
              <div className="text-[8px] uppercase text-gray-400 tracking-wider font-semibold">Cachet & Signature</div>
              <div className="text-[9.5px] font-bold text-[#1B4332] mt-0.5">Pour Acquit</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
