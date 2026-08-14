'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { pmsFolios, pmsFactures, pmsConfig } from '@/lib/pms';
import type { FolioDto, FactureDto, HotelConfigDto } from '@/lib/pmsTypes';
import { Printer } from 'lucide-react';

const num = (v: any) => (typeof v === "number" && isFinite(v) ? v : 0);
const frDate = (s: string) => (s ? new Date(s + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");

export default function FacturePrintPage() {
  const { id } = useParams<{ id: string }>();
  const [folio, setFolio] = useState<FolioDto | null>(null);
  const [facture, setFacture] = useState<FactureDto | null>(null);
  const [config, setConfig] = useState<HotelConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      pmsFolios.getById(Number(id)),
      pmsConfig.get()
    ]).then(([f, c]) => {
      setFolio(f);
      setConfig(c);
      if (f.factureId) {
        return pmsFactures.getById(f.factureId).then(setFacture);
      } else {
        throw new Error('Aucune facture associée à ce folio.');
      }
    }).catch(e => {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    }).finally(() => {
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-8 h-8 border-2 border-green/30 border-t-green rounded-full animate-spin" />
    </div>
  );

  if (error || !facture || !config) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 text-red-600 font-medium">
      {error || 'Facture introuvable'}
    </div>
  );

  const cur = config.currency || { code: 'FCFA', decimals: 0 };
  const fm = (n: number) => (cur.decimals ? num(n).toLocaleString("fr-FR", { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals }) : Math.round(num(n)).toLocaleString("fr-FR")) + " " + cur.code;
  
  const s = facture.snapshot || ({} as any);
  const cancelled = facture.status === "Annulee" || facture.status === "annulée";
  const duplicata = (facture.printCount || 0) >= 1;
  const destSociete = s.recipient === "societe" && s.societe;
  const destNom = destSociete ? s.societe : (s.client || "Client");
  
  const total = num(s.total); 
  const paid = num(s.paid); 
  const arrhes = num(s.arrhes); 
  const solde = Math.max(0, total - paid - arrhes); 
  const avoir = Math.max(0, paid + arrhes - total);
  const lines = s.lines || [];

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white font-sans text-charcoal">
      <div className="max-w-[720px] mx-auto mb-6 flex justify-end print:hidden px-4">
        <button
          onClick={() => {
            pmsFactures.print(facture.id).then(() => {
              window.print();
            }).catch(() => {
              window.print();
            });
          }}
          className="flex items-center gap-2 bg-charcoal text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-charcoal/90 shadow-sm"
        >
          <Printer size={16} /> Imprimer / PDF
        </button>
      </div>

      <div className={`max-w-[720px] mx-auto bg-white p-10 print:p-0 print:max-w-none shadow-sm print:shadow-none ${cancelled ? 'opacity-70' : ''}`}>
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-[3px] border-gold pb-4">
          <div>
            <div className="text-[22px] font-extrabold text-green-dark">{config.buildingName}</div>
            <div className="text-[12.5px] text-gray-500 mt-1">
              {config.city} — Propriétaire : {config.ownerName}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[13px] text-green-dark font-bold uppercase tracking-wide">FACTURE {facture.number}</div>
            <div className="text-[12.5px] text-gray-500 mt-1">Date : {frDate(facture.date)}</div>
            
            {cancelled && <div className="mt-2 inline-block text-[11px] font-bold text-red-700 border border-red-700 rounded px-2 py-0.5 tracking-wider uppercase">FACTURE ANNULÉE</div>}
            {!cancelled && duplicata && <div className="mt-2 inline-block text-[11px] font-bold text-red-700 border border-red-700 rounded px-2 py-0.5 tracking-wider uppercase">DUPLICATA</div>}
            {!cancelled && !duplicata && facture.corrections > 0 && <div className="mt-2 inline-block text-[11px] font-bold text-amber-700 border border-amber-700 rounded px-2 py-0.5 tracking-wider uppercase">FACTURE RECTIFIÉE</div>}
          </div>
        </div>

        {/* Boxes */}
        <div className="flex gap-6 my-6">
          <div className="flex-1 border border-gray-200 rounded-lg p-3.5">
            <h4 className="m-0 mb-1.5 text-[11px] tracking-wider uppercase text-gold font-bold">Destinataire</h4>
            <div className="font-bold text-[14px]">{destNom}</div>
            {!destSociete && s.reservataire && <div className="text-[12.5px] text-gray-500">{s.reservataire}</div>}
          </div>
          <div className="flex-1 border border-gray-200 rounded-lg p-3.5">
            <h4 className="m-0 mb-1.5 text-[11px] tracking-wider uppercase text-gold font-bold">Séjour</h4>
            <div className="font-medium text-[13.5px]">{s.unitLabel || ""}</div>
            <div className="text-[12.5px] text-gray-500 mt-0.5">
              {frDate(s.arrival)} → {frDate(s.departure)} · {num(s.nights)} nuit(s) · {num(s.pax)} pax
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse mt-2 text-[13.5px]">
          <thead>
            <tr>
              <th className="bg-green-dark text-white text-left px-3 py-2.5 text-xs uppercase tracking-wide font-semibold">Désignation</th>
              <th className="bg-green-dark text-white text-right px-3 py-2.5 text-xs uppercase tracking-wide font-semibold">Montant</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((r: any, i: number) => (
              <tr key={i}>
                <td className="px-3 py-2.5 border-b border-gray-200">{r.label}</td>
                <td className="px-3 py-2.5 border-b border-gray-200 text-right tabular-nums">{fm(r.montant)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-green-dark font-extrabold text-base">
            <tr>
              <td className="pt-4 px-3 pb-2 border-none">Total</td>
              <td className="pt-4 px-3 pb-2 border-none text-right tabular-nums">{fm(total)}</td>
            </tr>
            {arrhes > 0 && (
              <tr className="text-green text-sm font-semibold">
                <td className="px-3 py-1 border-none">Arrhes / acompte</td>
                <td className="px-3 py-1 border-none text-right tabular-nums">{fm(arrhes)}</td>
              </tr>
            )}
            <tr className="text-green text-sm font-semibold">
              <td className="px-3 py-1 border-none">Réglé ({s.payMode || "Espèces"})</td>
              <td className="px-3 py-1 border-none text-right tabular-nums">{fm(paid)}</td>
            </tr>
            <tr className="text-base font-extrabold">
              <td className="px-3 py-2 border-none">Solde</td>
              <td className={`px-3 py-2 border-none text-right tabular-nums ${solde > 0.5 ? 'text-red-700' : 'text-green'}`}>
                {fm(solde)}
              </td>
            </tr>
            {avoir > 0.5 && (
              <tr className="text-blue-700 text-sm font-semibold">
                <td className="px-3 py-1 border-none">Avoir / trop-perçu (arrhes)</td>
                <td className="px-3 py-1 border-none text-right tabular-nums">{fm(avoir)}</td>
              </tr>
            )}
          </tfoot>
        </table>

        {/* Footer */}
        <div className="mt-8 pt-3 border-t border-gray-200 text-[11.5px] text-gray-500">
          Facture éditée le {frDate(facture.date)} 
          {facture.corrections > 0 ? ` · rectifiée le ${frDate(facture.corrigeeLe || facture.date)}` : ''} 
          — {config.buildingName}, {config.city}. Montants en {cur.code}. Document généré par le PMS Juweirat.
        </div>
      </div>
    </div>
  );
}
