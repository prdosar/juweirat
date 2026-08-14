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

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white text-charcoal">
      {/* Print styles */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 15mm 20mm;
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          #facture-sheet {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            border: none !important;
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
          onClick={() => {
            pmsFactures
              .print(facture.id)
              .then(() => window.print())
              .catch(() => window.print());
          }}
          className="inline-flex items-center gap-2 bg-charcoal text-white hover:bg-black px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all"
        >
          <Printer size={15} /> Imprimer la facture
        </button>
      </header>

      {/* Screen Paper Preview */}
      <main className="py-8 px-4 print:p-0">
        <div
          id="facture-sheet"
          className={`max-w-[780px] mx-auto bg-white p-12 print:p-0 shadow-xl rounded-sm border border-gray-200 print:border-none ${
            cancelled ? 'opacity-70' : ''
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b-[3px] border-gold pb-5">
            <div>
              <div className="text-[24px] font-black text-green tracking-tight font-serif">
                {config.buildingName}
              </div>
              <div className="text-[12px] text-gray-600 mt-1 uppercase tracking-wider font-sans">
                {config.city} — SCI JUWEIRAT
              </div>
              <div className="text-[11.5px] text-gray-500 mt-0.5">
                Propriétaire : {config.ownerName}
              </div>
            </div>

            <div className="text-right font-sans">
              <div className="text-[14px] text-green font-bold uppercase tracking-wide">
                FACTURE N° {facture.number}
              </div>
              <div className="text-[12px] text-gray-500 mt-1">
                Date d’émission : <strong>{frDate(facture.date)}</strong>
              </div>
              <div className="text-[11.5px] text-gray-400 mt-0.5">
                Réf. Folio : {folio?.number}
              </div>

              {cancelled && (
                <div className="mt-2.5 inline-block text-[11px] font-bold text-red-700 bg-red-50 border border-red-300 rounded px-2.5 py-0.5 tracking-wider uppercase">
                  FACTURE ANNULÉE
                </div>
              )}
              {!cancelled && duplicata && (
                <div className="mt-2.5 inline-block text-[11px] font-bold text-red-700 bg-red-50 border border-red-300 rounded px-2.5 py-0.5 tracking-wider uppercase">
                  DUPLICATA
                </div>
              )}
              {!cancelled && !duplicata && facture.corrections > 0 && (
                <div className="mt-2.5 inline-block text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-300 rounded px-2.5 py-0.5 tracking-wider uppercase">
                  FACTURE RECTIFIÉE
                </div>
              )}
            </div>
          </div>

          {/* Destinataire / Séjour */}
          <div className="grid grid-cols-2 gap-6 my-6 text-[13px] font-sans">
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
              <div className="text-[10.5px] tracking-wider uppercase text-gold font-bold mb-1.5">
                Client / Destinataire
              </div>
              <div className="font-bold text-[14.5px] text-charcoal">{destNom}</div>
              {!destSociete && s.reservataire && (
                <div className="text-[12px] text-gray-600 mt-0.5">
                  Réservé par : {s.reservataire}
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
              <div className="text-[10.5px] tracking-wider uppercase text-gold font-bold mb-1.5">
                Détails du séjour
              </div>
              <div className="font-bold text-[14px] text-charcoal">{s.unitLabel || 'Appartement'}</div>
              <div className="text-[12px] text-gray-600 mt-0.5">
                Du {frDate(s.arrival)} au {frDate(s.departure)} ({num(s.nights)} nuit{num(s.nights) > 1 ? 's' : ''})
              </div>
              <div className="text-[11.5px] text-gray-500 mt-0.5">
                Occupants : {num(s.pax)} personne{num(s.pax) > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mt-4 text-[13px] font-sans">
            <thead>
              <tr className="border-b-2 border-green">
                <th className="bg-green text-white text-left px-3.5 py-2.5 text-[11.5px] uppercase tracking-wider font-semibold">
                  Désignation des prestations
                </th>
                <th className="bg-green text-white text-right px-3.5 py-2.5 text-[11.5px] uppercase tracking-wider font-semibold w-36">
                  Montant
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((r: any, i: number) => (
                <tr key={i} className={i % 2 === 1 ? 'bg-gray-50/70' : 'bg-white'}>
                  <td className="px-3.5 py-2.5 border-b border-gray-100 text-charcoal font-medium">
                    {r.label}
                  </td>
                  <td className="px-3.5 py-2.5 border-b border-gray-100 text-right tabular-nums font-semibold">
                    {fm(r.montant)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-sans">
              <tr className="border-t-2 border-gray-300">
                <td className="pt-4 px-3.5 pb-1.5 font-bold text-[14.5px] text-charcoal uppercase">
                  Total Facturé
                </td>
                <td className="pt-4 px-3.5 pb-1.5 text-right tabular-nums font-black text-[15px] text-green">
                  {fm(total)}
                </td>
              </tr>
              {arrhes > 0 && (
                <tr className="text-gray-600 text-[12.5px]">
                  <td className="px-3.5 py-1">Arrhes / Acompte perçu</td>
                  <td className="px-3.5 py-1 text-right tabular-nums font-medium text-green">
                    - {fm(arrhes)}
                  </td>
                </tr>
              )}
              <tr className="text-gray-600 text-[12.5px]">
                <td className="px-3.5 py-1">
                  Montant Réglé ({s.payMode || 'Espèces'})
                </td>
                <td className="px-3.5 py-1 text-right tabular-nums font-medium text-green">
                  - {fm(paid)}
                </td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-3.5 py-2.5 font-extrabold text-[14px] uppercase text-charcoal">
                  Net à payer (Solde)
                </td>
                <td
                  className={`px-3.5 py-2.5 text-right tabular-nums font-extrabold text-[15px] ${
                    solde > 0.5 ? 'text-red-700' : 'text-green'
                  }`}
                >
                  {fm(solde)}
                </td>
              </tr>
              {avoir > 0.5 && (
                <tr className="text-blue-800 text-[12.5px] bg-blue-50/50">
                  <td className="px-3.5 py-1.5 font-semibold">Avoir / Trop-perçu</td>
                  <td className="px-3.5 py-1.5 text-right tabular-nums font-bold">
                    {fm(avoir)}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>

          {/* Footer & Legal Mentions */}
          <div className="mt-12 pt-4 border-t border-gray-200 text-[11px] text-gray-500 flex justify-between items-end font-sans">
            <div>
              <p className="font-semibold text-gray-700">Société Civile Immobilière JUWEIRAT</p>
              <p>Quartier GBOSSIME, 08BP: 80859 — Lomé, Togo</p>
              <p className="mt-0.5">Tél : (+228) 90 00 00 00 · Email : contact@juweirat.com</p>
            </div>
            <div className="text-right">
              <p>Facture générée le {frDate(facture.date)}</p>
              {facture.corrections > 0 && (
                <p>Rectifiée le {frDate(facture.corrigeeLe || facture.date)}</p>
              )}
              <p className="text-[10px] text-gray-400 mt-0.5">Document officiel PMS Juweirat</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
