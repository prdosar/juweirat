'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, AlertTriangle, FileText } from 'lucide-react';
import { pmsFolios } from '@/lib/pms';
import type { ContractDataDto } from '@/lib/pmsTypes';

// ── French number-to-words ──────────────────────────────────────────────────

const ONES = [
  '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 70) {
    const d = Math.floor(n / 10), u = n % 10;
    const ds = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
    if (u === 0) return ds[d];
    if (u === 1) return ds[d] + ' et un';
    return ds[d] + '-' + ONES[u];
  }
  if (n < 80) {
    if (n === 71) return 'soixante et onze';
    return 'soixante-' + ONES[n - 60];
  }
  if (n < 90) return n === 80 ? 'quatre-vingts' : 'quatre-vingt-' + ONES[n - 80];
  return 'quatre-vingt-' + ONES[n - 80]; // 90-99
}

function stripFinalS(w: string): string {
  return w.replace(/\bcents\b/g, 'cent').replace(/\bquatre-vingts\b/g, 'quatre-vingt');
}

function numberToWords(n: number): string {
  if (n === 0) return 'zéro';
  if (n < 0) return 'moins ' + numberToWords(-n);
  const parts: string[] = [];
  if (n >= 1_000_000) {
    const m = Math.floor(n / 1_000_000); n %= 1_000_000;
    parts.push(numberToWords(m) + (m === 1 ? ' million' : ' millions'));
  }
  if (n >= 1000) {
    const t = Math.floor(n / 1000); n %= 1000;
    const tWord = t === 1 ? '' : stripFinalS(numberToWords(t)) + ' ';
    parts.push(tWord + 'mille');
  }
  if (n >= 100) {
    const h = Math.floor(n / 100); n %= 100;
    const prefix = h === 1 ? '' : ONES[h] + ' ';
    parts.push(prefix + 'cent' + (h > 1 && n === 0 ? 's' : ''));
  }
  if (n > 0) parts.push(belowHundred(n));
  return parts.join(' ').trim();
}

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDateFr(iso: string): string {
  if (!iso) return '………………………………';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatDateOrdinal(iso: string): string {
  if (!iso) return '………………………………';
  const d = new Date(iso);
  const day = d.getDate();
  const months = [
    'janvier','février','mars','avril','mai','juin',
    'juillet','août','septembre','octobre','novembre','décembre',
  ];
  return `${day === 1 ? '1ᵉʳ' : day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function floorLabel(f: number): string {
  if (f === 0) return 'rez-de-chaussée (RDC)';
  const ordinals = ['','premier (1ᵉʳ)','deuxième (2ᵉ)','troisième (3ᵉ)',
    'quatrième (4ᵉ)','cinquième (5ᵉ)','sixième (6ᵉ)','septième (7ᵉ)',
    'huitième (8ᵉ)','neuvième (9ᵉ)','dixième (10ᵉ)'];
  return ordinals[f] ? `${ordinals[f]} étage` : `${f}ᵉ étage`;
}

function compositionLabel(pmsType: string | null): string {
  switch (pmsType?.toUpperCase()) {
    case 'T1': return 'un (01) studio comprenant un séjour-chambre, une kitchenette, ainsi que les pièces d’eau et sanitaires qui y sont attachés';
    case 'T2': return 'deux (02) chambres, d’un salon, d’une cuisine, ainsi que des pièces d’eau, sanitaires qui y sont attachées';
    case 'T3': return 'trois (03) chambres, d’un salon, d’une salle à manger, d’une cuisine, ainsi que des pièces d’eau et sanitaires qui y sont attachées';
    case 'T4': return 'quatre (04) chambres, d’un grand salon, d’une salle à manger, d’une cuisine, ainsi que des pièces d’eau, sanitaires et d’une terrasse';
    default:   return 'deux (02) chambres, d’un salon, d’une cuisine, ainsi que des pièces d’eau, sanitaires qui y sont attachées';
  }
}

function durationLabel(nights: number): string {
  if (nights >= 360) return 'un (01) an';
  const months = Math.floor(nights / 30);
  const days = nights % 30;
  const monthWord = (n: number) => n === 1
    ? 'un (01) mois'
    : `${numberToWords(n)} (${String(n).padStart(2, '0')}) mois`;
  const dayWord = (n: number) => n === 1
    ? 'un (01) jour'
    : `${numberToWords(n)} (${n}) jours`;
  if (days === 0 && months > 0) return monthWord(months);
  if (months === 0) return dayWord(days);
  return `${monthWord(months)} et ${dayWord(days)}`;
}

// Inline filled value helper
function FieldVal({ val, placeholder }: { val?: string | null; placeholder?: string }) {
  if (val && val.trim()) {
    return <span className="font-semibold text-black underline decoration-gray-400 decoration-1 underline-offset-2">{val}</span>;
  }
  return <span className="text-gray-400 select-all font-mono text-[9pt]">{placeholder || '………………………………………………'}</span>;
}

// ── Main Contract View ───────────────────────────────────────────────────────

function ContractDocument({ d }: { d: ContractDataDto }) {
  const monthly   = d.monthlyLoyer || 650000;
  const quarterly = monthly * 3;
  const annual    = monthly * 12;

  const isCompany = !!d.societe;

  return (
    <div className="contract-body text-black bg-white font-serif text-[10pt] leading-[1.65] text-justify max-w-[210mm] mx-auto p-0 print:max-w-none">
      
      {/* ── Entête / Titre ── */}
      <div className="text-center mb-6 pb-4 border-b-2 border-black">
        <h1 className="text-[14pt] font-extrabold uppercase tracking-wide mb-1 font-serif">
          Contrat de bail à usage d’habitation
        </h1>
        <p className="text-[10.5pt] italic text-gray-800 mb-1">
          Location meublée — Immeuble « JUWEIRAT », quartier GBOSSIME - 08BP: 80859, Lomé (Togo)
        </p>
        <p className="text-[8.5pt] text-gray-500 font-sans tracking-wider uppercase">
          Réf. Folio : {d.folioNumber}
        </p>
      </div>

      {/* ── Visa légal ── */}
      <p className="text-[9pt] italic text-center mb-6 text-gray-700 px-4">
        Le présent contrat est régi par le <strong>Décret n°2022-001/PR du 5 janvier 2022</strong> portant réglementation de la caution, de la garantie de loyer et du bail d’habitation au Togo, ainsi que par les dispositions du Code civil togolais relatives au contrat de louage (articles 1708 et suivants).
      </p>

      {/* ── Parties ── */}
      <div className="mb-6 space-y-4">
        <p className="font-bold text-[10.5pt] uppercase tracking-wide">Entre les soussignés</p>

        <div className="pl-4 border-l-2 border-black space-y-1">
          <p>
            <strong>Le Bailleur : Société Civile Immobilière “JUWEIRAT”,</strong> représenté par son gérant, <strong>M. TIDJANI Sakariyaou.</strong>
          </p>
          <p className="italic text-[9pt] text-gray-700">ci-après dénommé « <strong>le Bailleur</strong> »,</p>
          <p className="font-bold text-[9pt] tracking-wider uppercase pt-1">D’UNE PART,</p>
        </div>

        <div className="pl-4 border-l-2 border-black space-y-2">
          <p>
            <strong>Et le Preneur</strong> <span className="italic text-gray-600 text-[9pt]">(personne physique ou morale — ne conserver que la mention applicable ci-dessous) :</span>
          </p>

          <div className="space-y-2 text-[9.5pt]">
            <p className={!isCompany ? 'font-medium' : 'text-gray-600'}>
              <strong>• Personne physique :</strong> M./Mme <FieldVal val={!isCompany ? d.prenomNom : null} placeholder="………………………………………………" />, né(e) le <FieldVal placeholder="……………………" /> à <FieldVal placeholder="………………………………" />, de nationalité <FieldVal val={!isCompany ? d.nationalite : null} placeholder="…………………………" />, exerçant la profession de <FieldVal placeholder="………………………………" />, titulaire de la pièce d’identité n° <FieldVal val={!isCompany ? d.pieceIdentite : null} placeholder="………………………………" />, demeurant à <FieldVal val={!isCompany ? d.adresse : null} placeholder="………………………………………………" /> ;
            </p>

            <p className={isCompany ? 'font-medium' : 'text-gray-600'}>
              <strong>• Personne morale :</strong> la société <FieldVal val={d.societe} placeholder="…………………………………………" />, <FieldVal placeholder="………………" /> (forme juridique : SA / SARL / SAS / autre), au capital de <FieldVal placeholder="…………………………" /> francs CFA, immatriculée au Registre du commerce et du crédit mobilier (RCCM) sous le n° <FieldVal placeholder="………………………………" />, dont le siège social est à <FieldVal val={d.adresse} placeholder="…………………………………………" />, représentée par <FieldVal val={isCompany ? d.prenomNom : null} placeholder="……………………………………" /> agissant en qualité de <FieldVal placeholder="………………………………" /> dûment habilité(e) à l’effet des présentes,
            </p>
          </div>

          <p className="italic text-[9pt] text-gray-700">ci-après dénommé « <strong>le Preneur</strong> » ou « <strong>le Locataire</strong> »,</p>
          <p className="font-bold text-[9pt] tracking-wider uppercase pt-1">D’AUTRE PART.</p>
        </div>

        <p className="italic text-center text-[9.5pt] my-3">
          Il a été préalablement exposé puis convenu et arrêté ce qui suit.
        </p>
      </div>

      {/* ── Articles ── */}
      <div className="space-y-4">
        
        {/* Article 1 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 1 — Objet et désignation des lieux loués</h2>
          <p>
            Le Bailleur donne à bail à usage d’habitation au Preneur, qui accepte, un appartement à usage exclusif d’habitation situé dans l’immeuble « JUWEIRAT » quartier GBOSSIME - 08BP: 80859, sis à Lomé (Togo).
          </p>
          <p className="mt-1.5">
            L’appartement, portant le <strong>numéro {d.aptNo || '54'}</strong>, est situé au <strong>{floorLabel(d.floor)}</strong> de l’immeuble. Il se compose de <strong>{compositionLabel(d.pmsType)}</strong>. <strong>La chambre 2 et la cuisine disposent chacune d’un balcon.</strong>
          </p>
          <p className="mt-1.5">
            L’appartement est donné <strong>entièrement meublé et équipé</strong>, conformément à l’inventaire détaillé du mobilier figurant en Annexe 1, laquelle fait partie intégrante du présent contrat.
          </p>
        </section>

        {/* Article 2 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 2 — Destination des lieux</h2>
          <p>
            Les lieux loués sont destinés exclusivement à l’usage d’habitation du Preneur ou, lorsque le Preneur est une personne morale, des personnes physiques qu’il désigne pour y résider. Le Preneur s’interdit d’y exercer toute activité commerciale, artisanale, industrielle ou professionnelle, et de faire des lieux le siège social ou un établissement de son activité. Toute transformation ou modification des lieux est interdite sans l’accord écrit et préalable du Bailleur.
          </p>
        </section>

        {/* Article 3 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 3 — État des lieux et inventaire du mobilier</h2>
          <p>
            Un état des lieux contradictoire, accompagné de l’inventaire du mobilier, est établi conjointement par les parties à l’entrée du Preneur, puis à sa sortie, à frais partagés par moitié, et annexé au présent contrat. À défaut d’état des lieux d’entrée, le Preneur est présumé avoir reçu les lieux et le mobilier en bon état de réparations locatives et devra, sauf preuve contraire, les restituer dans le même état à la fin du bail.
          </p>
        </section>

        {/* Article 4 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 4 — Durée</h2>
          <p>
            Le présent bail est conclu pour une durée déterminée d’<strong>{durationLabel(d.nights)}</strong>, prenant effet le <strong>{formatDateOrdinal(d.arrival)}</strong> pour se terminer le <strong>{formatDateOrdinal(d.departure)}</strong>. À son terme, il se renouvelle <strong>par tacite reconduction</strong> pour des périodes successives d’égale durée, sauf congé régulièrement notifié par l’une des parties dans les conditions prévues à l’article 13 ci-après.
          </p>
        </section>

        {/* Article 5 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 5 — Loyer</h2>
          <p>
            Le loyer est fixé, d’un commun accord entre les parties conformément à la loi de l’offre et de la demande, à la somme de <strong>{numberToWords(monthly)} ({fmt(monthly)}) francs CFA par mois</strong>, soit {numberToWords(quarterly)} ({fmt(quarterly)}) francs CFA par trimestre et {numberToWords(annual)} ({fmt(annual)}) francs CFA par an. <strong>Ce loyer s’entend hors TVA.</strong>
          </p>
          <p className="mt-1.5">
            Le loyer est <strong>payable trimestriellement et d’avance</strong>, au plus tard le premier jour de chaque trimestre, à raison de trois (03) mois de loyer par terme. Le premier terme est exigible à la prise d’effet du bail.
          </p>
        </section>

        {/* Article 6 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 6 — Modalités de paiement et quittance</h2>
          <p>
            Le loyer est payable au domicile du Bailleur ou par tout moyen légal (virement bancaire, mobile money, espèce, chèque), contre quittance valable remise par le Bailleur. Le Preneur demeure tenu au paiement du loyer même pendant la période de préavis ou de congé.
          </p>
        </section>

        {/* Article 7 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 7 — Charges et consommations</h2>
          <p>
            La consommation d’électricité est à la charge du Preneur, qui en rembourse le Bailleur sur justificatifs. Les autres charges et consommations, notamment l’eau, demeurent à la charge du Bailleur.
          </p>
        </section>

        {/* Article 8 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 8 — Obligations du Preneur</h2>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Payer le loyer et les charges aux termes et conditions convenus ;</li>
            <li>User paisiblement des lieux et du mobilier, en bon père de famille, dans le respect de la sécurité, la propreté, et la tranquillité ;</li>
            <li>Entretenir les lieux et le mobilier et effectuer les réparations locatives ;</li>
            <li>Ne pas sous-louer ni céder le bail sans l’accord écrit du Bailleur (article 11) ;</li>
            <li>Laisser exécuter les grosses réparations, même urgentes, incombant au Bailleur ;</li>
            <li>Restituer les lieux et le mobilier en bon état à la fin du bail ;</li>
            <li>Respecter le règlement intérieur de l’immeuble et la tranquillité du voisinage.</li>
          </ul>
        </section>

        {/* Article 9 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 9 — Obligations du Bailleur</h2>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li>Délivrer un logement décent, propre, sécurisé et en bon état d’usage, aux installations fonctionnelles ;</li>
            <li>Assurer au Preneur la jouissance paisible des lieux loués pendant toute la durée du bail ;</li>
            <li>Effectuer les grosses réparations qui lui incombent ;</li>
            <li>Remettre au Preneur quittance des sommes régulièrement versées.</li>
          </ul>
        </section>

        {/* Article 10 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 10 — Réparations et entretien</h2>
          <p>
            Les réparations locatives et l’entretien courant sont à la charge du Bailleur, notamment : le maintien en état de propreté des intérieurs, le remplacement des serrures, le graissage des gonds des portes et fenêtres, l’entretien courant des canalisations et des équipements à usage privatif, ainsi que les menues réparations du mobilier.
          </p>
          <p className="mt-1.5">
            Les grosses réparations (gros œuvre, éléments porteurs concourant à la stabilité et à la solidité de l’édifice, clos et couvert) demeurent également à la charge dudit Bailleur. Le Preneur doit l’aviser sans délai de toute dégradation nécessitant une grosse réparation.
          </p>
        </section>

        {/* Article 11 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 11 — Sous-location et cession</h2>
          <p>
            Le Preneur ne peut sous-louer tout ou partie des lieux, ni céder son droit au présent bail, sans l’accord écrit et préalable du Bailleur.
          </p>
        </section>

        {/* Article 12 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 12 — Assurance</h2>
          <p>
            Le Preneur s’oblige à assurer les lieux loués et le mobilier contre les risques locatifs (incendie, dégâts des eaux et risques assimilés) auprès d’une compagnie d’assurance dûment agréée.
          </p>
          <p className="mt-1.5">
            Le Preneur s’oblige à souscrire à une responsabilité civile, couvrant les dommages lui incombant (incendie, dégât eaux et risques assimilés), auprès d’une compagnie d’assurance dûment agréée, et à en justifier au Bailleur à première demande, puis à chaque échéance annuelle.
          </p>
        </section>

        {/* Article 13 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 13 — Congé et résiliation</h2>
          <p>
            À l’échéance du terme, la partie qui ne souhaite pas le renouvellement du bail doit en aviser l’autre par un <strong>congé écrit notifié au moins deux (02) mois avant ladite échéance</strong>. À défaut, le bail est reconduit tacitement. En cours de reconduction, chaque partie peut résilier le bail moyennant un <strong>préavis de deux (02) mois</strong>, conformément à l’article 26 du Décret n°2022-001/PR.
          </p>
          <p className="mt-1.5">
            Le congé est signifié par tout moyen laissant une trace écrite. Le Preneur reste redevable du loyer pendant toute la durée du préavis.
          </p>
        </section>

        {/* Article 14 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 14 — Clause résolutoire</h2>
          <p>
            En cas de non-paiement du loyer ou des charges à l’échéance, ou d’inexécution de toute autre obligation du présent bail, celui-ci pourra être résilié après mise en demeure adressée au Preneur et demeurée infructueuse pendant un délai d’un (01) mois.
          </p>
        </section>

        {/* Article 15 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 15 — Continuité du bail</h2>
          <p>
            Conformément aux articles 27 et 28 du Décret n°2022-001/PR, le bail ne prend fin ni par la cession des droits du Bailleur sur les locaux — le nouvel acquéreur étant substitué de plein droit dans les obligations de l’ancien bailleur — ni par le décès de l’une ou l’autre des parties.
          </p>
        </section>

        {/* Article 16 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 16 — Enregistrement</h2>
          <p>
            Le présent contrat, établi sous seing privé, est soumis aux <strong>formalités d’enregistrement</strong> auprès de l’administration fiscale, conformément au Code général des impôts (article 11 du décret). Les frais d’enregistrement sont supportés par <FieldVal placeholder="………………………………" />
          </p>
        </section>

        {/* Article 17 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 17 — Élection de domicile et règlement des litiges</h2>
          <p>
            Pour l’exécution des présentes, les parties élisent domicile en leurs adresses respectives ci-dessus indiquées. Tout différend relatif à l’interprétation ou à l’exécution du présent contrat sera recherché à l’amiable ; à défaut d’accord, il sera soumis aux juridictions compétentes de Lomé.
          </p>
        </section>

        {/* Article 18 */}
        <section className="page-break-avoid">
          <h2 className="font-bold text-[10pt] mb-1">Article 18 — Annexes</h2>
          <p>
            Sont annexés au présent contrat et en font partie intégrante : (1) l’état des lieux d’entrée (Annexe 1) ; (2) la copie des pièces d’identité de la personne hébergée.
          </p>
        </section>
      </div>

      {/* ── Signatures ── */}
      <div className="mt-8 pt-4 border-t border-gray-300 page-break-avoid">
        <p className="mb-4">
          Fait à Lomé, le <strong>{formatDateOrdinal(d.today)}</strong>, en <strong>trois (03) exemplaires originaux</strong>, dont un remis à chacune des parties et un destiné à l’enregistrement.
        </p>

        <table className="w-full border-collapse border border-gray-400 mt-4 text-[9.5pt]">
          <thead>
            <tr>
              <th className="border border-gray-400 p-3 w-1/2 text-center font-bold bg-gray-50">LE BAILLEUR</th>
              <th className="border border-gray-400 p-3 w-1/2 text-center font-bold bg-gray-50">LE PRENEUR</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 p-3 align-top h-36">
                <p className="italic text-[8.5pt] text-center text-gray-600 mb-2">(précédé de la mention manuscrite « Lu et approuvé »)</p>
                <p className="mb-1"><strong>Nom :</strong> TIDJANI Sakariyaou</p>
                <p className="mb-1"><strong>En qualité de :</strong> Gérant</p>
                <p className="text-[8.5pt] text-gray-500 mt-4">Signature :</p>
              </td>
              <td className="border border-gray-400 p-3 align-top h-36">
                <p className="italic text-[8.5pt] text-center text-gray-600 mb-2">(précédé de la mention manuscrite « Lu et approuvé »)</p>
                <p className="mb-1"><strong>Nom :</strong> <FieldVal val={d.prenomNom} placeholder="………………………………………………" /></p>
                <p className="mb-1"><strong>En qualité de :</strong> <FieldVal val={d.societe ? 'Représentant légal' : null} placeholder="………………………………" /></p>
                <p className="text-[8.5pt] text-gray-500 mt-4">Signature :</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── ANNEXE : ÉTAT DES LIEUX ── */}
      <div className="page-break-before mt-12 pt-6">
        <div className="text-center mb-6 pb-3 border-b-2 border-black">
          <h2 className="text-[13pt] font-extrabold uppercase tracking-wide mb-1 font-serif">
            Annexe — État des lieux
          </h2>
          <p className="text-[10pt] italic text-gray-800">
            Appartement n°{d.aptNo || '54'} — {floorLabel(d.floor)} — Immeuble « JUWEIRAT »
          </p>
        </div>

        <p className="text-[9.5pt] text-justify mb-4">
          Le présent état des lieux est dressé contradictoirement entre le Bailleur et le Preneur, lors de la remise des clés à l’entrée, puis à la restitution des lieux à la sortie. Il complète l’inventaire du mobilier (Annexe 1) et fait partie intégrante du contrat de bail. À défaut d’état des lieux d’entrée, le Preneur est présumé avoir reçu les lieux et le mobilier en bon état de réparations locatives.
        </p>

        <div className="flex items-center justify-between text-[9.5pt] mb-4 bg-gray-50 p-2.5 border border-gray-300">
          <div>
            <strong>Type d’état des lieux :</strong> &nbsp;
            <span>☐ Entrée</span> &nbsp;&nbsp;&nbsp; <span>☐ Sortie</span>
          </div>
          <div>
            <strong>Date :</strong> {formatDateFr(d.arrival)}
          </div>
        </div>

        <p className="text-[8.5pt] italic text-gray-600 mb-3">
          <strong>Barème d’appréciation :</strong> N = neuf · TB = très bon · B = bon · M = moyen · MV = mauvais / à remplacer
        </p>

        {/* Relevé compteurs */}
        <div className="mb-4">
          <h3 className="font-bold text-[9.5pt] mb-1.5 uppercase tracking-wide">Relevé des compteurs et des clés</h3>
          <table className="w-full border-collapse border border-gray-400 text-[8.5pt]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-left w-1/2">Élément</th>
                <th className="border border-gray-400 p-2 text-center w-1/4">Index / Nombre à l’entrée</th>
                <th className="border border-gray-400 p-2 text-center w-1/4">Index / Nombre à la sortie</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 font-medium">Compteur d’électricité (CEET)</td>
                <td className="border border-gray-400 p-2 text-center"></td>
                <td className="border border-gray-400 p-2 text-center"></td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 font-medium">Clés remises</td>
                <td className="border border-gray-400 p-2 text-center"></td>
                <td className="border border-gray-400 p-2 text-center"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* État détaillé par pièce */}
        <div className="space-y-4">
          <h3 className="font-bold text-[9.5pt] mb-1 uppercase tracking-wide">État détaillé par pièce</h3>

          <RoomEdlSection title="SALON" items={[
            'Sols',
            'Murs et plafond',
            'Portes et fenêtres',
            'Électricité et éclairage',
            'Mobilier et équipements (cf. Annexe 1)'
          ]} />

          <RoomEdlSection title="CHAMBRE 1 (+ salle d’eau)" items={[
            'Sols',
            'Murs et plafond',
            'Portes et fenêtres',
            'Électricité et éclairage',
            'Plomberie et sanitaires',
            'Mobilier et équipements (cf. Annexe 1)'
          ]} />

          <RoomEdlSection title="CHAMBRE 2 (+ salle d’eau + balcon)" items={[
            'Sols',
            'Murs et plafond',
            'Portes et fenêtres',
            'Électricité et éclairage',
            'Plomberie et sanitaires',
            'Mobilier et équipements (cf. Annexe 1)',
            'Balcon'
          ]} />

          <RoomEdlSection title="CUISINE (+ balcon)" items={[
            'Sols',
            'Murs et plafond',
            'Portes et fenêtres',
            'Électricité et éclairage',
            'Plomberie et sanitaires',
            'Mobilier et équipements (cf. Annexe 1)',
            'Balcon'
          ]} />

          <RoomEdlSection title="WC VISITEUR" items={[
            'Sols',
            'Murs et plafond',
            'Portes et fenêtres',
            'Électricité et éclairage',
            'Plomberie et sanitaires',
            'Mobilier et équipements (cf. Annexe 1)'
          ]} />

          <RoomEdlSection title="HALL / COULOIR" items={[
            'Sols',
            'Murs et plafond',
            'Portes et fenêtres',
            'Électricité et éclairage',
            'Mobilier et équipements (cf. Annexe 1)'
          ]} />
        </div>

        {/* Observations */}
        <div className="mt-6 page-break-avoid">
          <p className="font-bold text-[9pt] mb-2">Observations générales (fissures, taches, éléments manquants ou défectueux, etc.) :</p>
          <div className="space-y-3 pt-1">
            <div className="border-b border-dotted border-gray-400 h-5"></div>
            <div className="border-b border-dotted border-gray-400 h-5"></div>
            <div className="border-b border-dotted border-gray-400 h-5"></div>
          </div>
        </div>

        {/* Signatures État des lieux */}
        <div className="mt-6 pt-4 border-t border-gray-300 page-break-avoid">
          <p className="mb-4 text-[9.5pt]">
            Fait à Lomé, le <strong>{formatDateOrdinal(d.today)}</strong>, en deux (02) exemplaires, dont un remis à chaque partie.
          </p>

          <table className="w-full border-collapse border border-gray-400 text-[9.5pt]">
            <thead>
              <tr>
                <th className="border border-gray-400 p-2.5 w-1/2 text-center font-bold bg-gray-50">LE BAILLEUR</th>
                <th className="border border-gray-400 p-2.5 w-1/2 text-center font-bold bg-gray-50">LE PRENEUR</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 p-3 align-top h-32">
                  <p className="italic text-[8.5pt] text-center text-gray-600 mb-2">(précédé de la mention manuscrite « Lu et approuvé »)</p>
                  <p className="mb-1"><strong>Nom :</strong> TIDJANI Sakariyaou</p>
                  <p className="mb-1"><strong>En qualité de :</strong> Gérant</p>
                  <p className="text-[8.5pt] text-gray-500 mt-3">Signature :</p>
                </td>
                <td className="border border-gray-400 p-3 align-top h-32">
                  <p className="italic text-[8.5pt] text-center text-gray-600 mb-2">(précédé de la mention manuscrite « Lu et approuvé »)</p>
                  <p className="mb-1"><strong>Nom :</strong> <FieldVal val={d.prenomNom} placeholder="………………………………………………" /></p>
                  <p className="mb-1"><strong>En qualité de :</strong> <FieldVal val={d.societe ? 'Représentant légal' : null} placeholder="………………………………" /></p>
                  <p className="text-[8.5pt] text-gray-500 mt-3">Signature :</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RoomEdlSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="page-break-avoid">
      <table className="w-full border-collapse border border-gray-400 text-[8.5pt]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 p-1.5 text-left font-bold text-black w-[35%]">{title}</th>
            <th className="border border-gray-400 p-1.5 text-center font-medium w-[18%]">État à l’entrée</th>
            <th className="border border-gray-400 p-1.5 text-center font-medium w-[18%]">État à la sortie</th>
            <th className="border border-gray-400 p-1.5 text-left font-medium w-[29%]">Observations</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={idx} className="h-6">
              <td className="border border-gray-400 px-2 py-1 text-gray-800">{it}</td>
              <td className="border border-gray-400 px-2 py-1 text-center"></td>
              <td className="border border-gray-400 px-2 py-1 text-center"></td>
              <td className="border border-gray-400 px-2 py-1"></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function ContratPage() {
  const { id }                = useParams<{ id: string }>();
  const [data,    setData]    = useState<ContractDataDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    pmsFolios.getContractData(Number(id))
      .then(setData)
      .catch(() => setError('Erreur lors du chargement des données du contrat.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-green/30 border-t-green rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="p-8 text-center text-red-600 font-medium">{error || 'Folio introuvable.'}</div>
  );

  const isLongStay = data.nights >= 30;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Print styles */}
      <style>{`
        @page {
          size: A4;
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
          #contract-sheet {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
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
            <FileText size={16} className="text-gold" />
            <span className="font-semibold">Contrat de bail — Folio {data.folioNumber}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLongStay ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              <AlertTriangle size={13} />
              Bail d’habitation ({data.nights} nuits)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full">
              Séjour de {data.nights} nuits
            </span>
          )}
          
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-charcoal text-white hover:bg-black px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all"
          >
            <Printer size={15} /> Imprimer le contrat
          </button>
        </div>
      </header>

      {/* Screen Paper Preview */}
      <main className="py-8 px-4 print:p-0">
        <div
          id="contract-sheet"
          className="max-w-[210mm] mx-auto bg-white shadow-xl rounded-sm p-[18mm] border border-gray-200 print:border-none print:shadow-none print:p-0"
        >
          <ContractDocument d={data} />
        </div>
      </main>
    </div>
  );
}
