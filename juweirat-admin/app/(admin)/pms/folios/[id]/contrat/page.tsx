'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, AlertTriangle } from 'lucide-react';
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
  return new Intl.NumberFormat('fr-FR').format(n);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatDateOrdinal(iso: string): string {
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
  return ordinals[f] ?? `${f}ᵉ`;
}

function compositionLabel(pmsType: string | null): string {
  switch (pmsType?.toUpperCase()) {
    case 'T1': return 'un (01) studio comprenant un séjour-chambre, une kitchenette, ainsi que les pièces d\'eau et sanitaires qui y sont attachés';
    case 'T2': return 'deux (02) chambres, d\'un salon, d\'une cuisine, ainsi que des pièces d\'eau et sanitaires qui y sont attachés';
    case 'T3': return 'trois (03) chambres, d\'un salon, d\'une salle à manger, d\'une cuisine, ainsi que des pièces d\'eau et sanitaires';
    case 'T4': return 'quatre (04) chambres, d\'un grand salon, d\'une salle à manger, d\'une cuisine, ainsi que des pièces d\'eau, sanitaires et d\'une terrasse';
    default:   return 'un appartement meublé';
  }
}

function durationLabel(nights: number): string {
  const months = Math.floor(nights / 30);
  const days = nights % 30;
  const monthWord = (n: number) => n === 1
    ? 'un (01) mois'
    : `${numberToWords(n)} (${String(n).padStart(2, '0')}) mois`;
  const dayWord = (n: number) => n === 1
    ? 'un (01) jour'
    : `${numberToWords(n)} (${n}) jours`;
  if (days === 0) return monthWord(months);
  if (months === 0) return dayWord(days);
  return `${monthWord(months)} et ${dayWord(days)}`;
}

// ── Contract HTML component ──────────────────────────────────────────────────

function BailContract({ d }: { d: ContractDataDto }) {
  const monthly   = d.monthlyLoyer;
  const quarterly = monthly * 3;
  const annual    = monthly * 12;

  const isCompany = !!d.societe;

  return (
    <div id="contract-body" style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '10pt', lineHeight: '1.6', color: '#1a1a1a' }}>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '20pt', paddingBottom: '12pt', borderBottom: '2px solid #333' }}>
        <p style={{ fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1pt', marginBottom: '4pt' }}>
          Contrat de bail à usage d&apos;habitation
        </p>
        <p style={{ fontSize: '11pt', fontStyle: 'italic', marginBottom: '4pt' }}>
          Location meublée — Immeuble « JUWEIRAT »
        </p>
        <p style={{ fontSize: '9pt', color: '#555' }}>
          Quartier GBOSSIME — 08BP : 80859, Lomé (Togo) · Réf. folio {d.folioNumber}
        </p>
      </div>

      {/* Legal basis */}
      <p style={{ fontSize: '9pt', fontStyle: 'italic', textAlign: 'center', marginBottom: '14pt', color: '#555' }}>
        Le présent contrat est régi par le Décret n°2022-001/PR du 5 janvier 2022 portant réglementation de la caution,
        de la garantie de loyer et du bail d&apos;habitation au Togo, ainsi que par les dispositions du Code civil togolais
        relatives au contrat de louage (articles 1708 et suivants).
      </p>

      <p style={{ marginBottom: '10pt', fontWeight: 'bold' }}>Entre les soussignés :</p>

      {/* Bailleur */}
      <div style={{ marginBottom: '10pt', paddingLeft: '12pt', borderLeft: '3px solid #333' }}>
        <p><strong>Le Bailleur :</strong> Société Civile Immobilière &laquo; JUWEIRAT &raquo;, représentée par son gérant,
        M. TIDJANI Sakariyaou,</p>
        <p style={{ fontStyle: 'italic' }}>ci-après dénommé &laquo; le Bailleur &raquo;,</p>
        <p style={{ fontWeight: 'bold' }}>D&apos;UNE PART,</p>
      </div>

      {/* Preneur */}
      <div style={{ marginBottom: '14pt', paddingLeft: '12pt', borderLeft: '3px solid #333' }}>
        <p><strong>Et le Preneur :</strong></p>
        {isCompany ? (
          <p>La société <strong>{d.societe}</strong>, dont le siège social est à {d.adresse ?? '…………………………'},
            représentée par {d.prenomNom ?? '…………………………'}, dûment habilité(e) à l&apos;effet des présentes,</p>
        ) : (
          <p>
            M. / Mme <strong>{d.prenomNom ?? '…………………………………………………'}</strong>,
            {d.nationalite ? ` de nationalité ${d.nationalite},` : ''}
            {d.pieceIdentite ? ` titulaire du ${d.pieceIdentite},` : ''}
            {d.adresse ? ` demeurant à ${d.adresse},` : ''}
          </p>
        )}
        <p style={{ fontStyle: 'italic' }}>ci-après dénommé &laquo; le Preneur &raquo; ou &laquo; le Locataire &raquo;,</p>
        <p style={{ fontWeight: 'bold' }}>D&apos;AUTRE PART.</p>
      </div>

      <p style={{ marginBottom: '14pt' }}>Il a été préalablement exposé puis convenu et arrêté ce qui suit.</p>

      {/* ── Article 1 ── */}
      <Article n={1} title="Objet et désignation des lieux loués">
        <p>Le Bailleur donne à bail à usage d&apos;habitation au Preneur, qui accepte, un appartement à usage exclusif
        d&apos;habitation situé dans l&apos;immeuble &laquo; JUWEIRAT &raquo;, quartier GBOSSIME — 08BP : 80859, sis à Lomé (Togo).</p>
        <p style={{ marginTop: '6pt' }}>L&apos;appartement, portant le numéro <strong>{d.aptNo ?? '…'}</strong>,
        est situé au <strong>{floorLabel(d.floor)}</strong> de l&apos;immeuble. Il se compose de {compositionLabel(d.pmsType)}.</p>
        <p style={{ marginTop: '6pt' }}>L&apos;appartement est donné entièrement meublé et équipé, conformément à
        l&apos;inventaire détaillé du mobilier figurant en Annexe 1, laquelle fait partie intégrante du présent contrat.</p>
      </Article>

      {/* ── Article 2 ── */}
      <Article n={2} title="Destination des lieux">
        <p>Les lieux loués sont destinés exclusivement à l&apos;usage d&apos;habitation du Preneur ou, lorsque le Preneur est
        une personne morale, des personnes physiques qu&apos;il désigne pour y résider. Le Preneur s&apos;interdit d&apos;y
        exercer toute activité commerciale, artisanale, industrielle ou professionnelle, et de faire des lieux le siège social
        ou un établissement de son activité. Toute transformation ou modification des lieux est interdite sans l&apos;accord
        écrit et préalable du Bailleur.</p>
      </Article>

      {/* ── Article 3 ── */}
      <Article n={3} title="État des lieux et inventaire du mobilier">
        <p>Un état des lieux contradictoire, accompagné de l&apos;inventaire du mobilier, est établi conjointement par les
        parties à l&apos;entrée du Preneur, puis à sa sortie, à frais partagés par moitié, et annexé au présent contrat.
        À défaut d&apos;état des lieux d&apos;entrée, le Preneur est présumé avoir reçu les lieux et le mobilier en bon état
        de réparations locatives et devra, sauf preuve contraire, les restituer dans le même état à la fin du bail.</p>
      </Article>

      {/* ── Article 4 ── */}
      <Article n={4} title="Durée">
        <p>Le présent bail est conclu pour une durée déterminée
        de <strong>{durationLabel(d.nights)}</strong>, prenant
        effet le <strong>{formatDateOrdinal(d.arrival)}</strong> pour
        se terminer le <strong>{formatDateOrdinal(d.departure)}</strong>.
        {d.nights >= 30
          ? " À son terme, il se renouvelle par tacite reconduction pour des périodes successives d'égale durée, sauf congé régulièrement notifié par l'une des parties dans les conditions prévues à l'article 13 ci-après."
          : " À son terme, il prend fin de plein droit, sauf accord écrit des parties pour son renouvellement."
        }</p>
      </Article>

      {/* ── Article 5 ── */}
      <Article n={5} title="Loyer">
        <p>Le loyer est fixé, d&apos;un commun accord entre les parties conformément à la loi de l&apos;offre et de la demande,
        à la somme de <strong>{capitalize(numberToWords(monthly))} ({fmt(monthly)}) francs CFA par mois</strong>,
        soit <strong>{capitalize(numberToWords(quarterly))} ({fmt(quarterly)}) francs CFA par trimestre</strong> et{' '}
        <strong>{capitalize(numberToWords(annual))} ({fmt(annual)}) francs CFA par an</strong>. Ce loyer s&apos;entend hors TVA.</p>
        <p style={{ marginTop: '6pt' }}>Le loyer est payable trimestriellement et d&apos;avance, au plus tard le premier jour
        de chaque trimestre, à raison de trois (03) mois de loyer par terme. Le premier terme est exigible à la prise
        d&apos;effet du bail.</p>
      </Article>

      {/* ── Article 6 ── */}
      <Article n={6} title="Modalités de paiement et quittance">
        <p>Le loyer est payable au domicile du Bailleur ou par tout moyen légal (virement bancaire, mobile money, espèces,
        chèque), contre quittance valable remise par le Bailleur. Le Preneur demeure tenu au paiement du loyer même pendant
        la période de préavis ou de congé.</p>
      </Article>

      {/* ── Article 7 ── */}
      <Article n={7} title="Charges et consommations">
        {d.elecIncluded ? (
          <p>La consommation d&apos;électricité est incluse dans le loyer pour la durée du présent bail. Les autres charges
          et consommations, notamment l&apos;eau, demeurent à la charge du Bailleur.</p>
        ) : (
          <p>La consommation d&apos;électricité est à la charge du Preneur, qui en rembourse le Bailleur sur la base du
          tarif CEET en vigueur (230 FCFA/kWh), sur relevé de compteur mensuel. Les autres charges et consommations,
          notamment l&apos;eau, demeurent à la charge du Bailleur.</p>
        )}
      </Article>

      {/* ── Article 8 ── */}
      <Article n={8} title="Obligations du Preneur">
        <ul style={{ paddingLeft: '16pt', marginTop: '4pt' }}>
          {[
            'Payer le loyer et les charges aux termes et conditions convenus ;',
            'User paisiblement des lieux et du mobilier, en bon père de famille, dans le respect de la sécurité, la propreté, et la tranquillité ;',
            'Entretenir les lieux et le mobilier et effectuer les réparations locatives ;',
            'Ne pas sous-louer ni céder le bail sans l\'accord écrit du Bailleur (article 11) ;',
            'Laisser exécuter les grosses réparations, même urgentes, incombant au Bailleur ;',
            'Restituer les lieux et le mobilier en bon état à la fin du bail ;',
            'Respecter le règlement intérieur de l\'immeuble et la tranquillité du voisinage.',
          ].map((item, i) => <li key={i} style={{ marginBottom: '2pt' }}>{item}</li>)}
        </ul>
      </Article>

      {/* ── Article 9 ── */}
      <Article n={9} title="Obligations du Bailleur">
        <ul style={{ paddingLeft: '16pt', marginTop: '4pt' }}>
          {[
            'Délivrer un logement décent, propre, sécurisé et en bon état d\'usage, aux installations fonctionnelles ;',
            'Assurer au Preneur la jouissance paisible des lieux loués pendant toute la durée du bail ;',
            'Effectuer les grosses réparations qui lui incombent ;',
            'Remettre au Preneur quittance des sommes régulièrement versées.',
          ].map((item, i) => <li key={i} style={{ marginBottom: '2pt' }}>{item}</li>)}
        </ul>
      </Article>

      {/* ── Article 10 ── */}
      <Article n={10} title="Réparations et entretien">
        <p>Les réparations locatives et l&apos;entretien courant sont à la charge du Bailleur, notamment : le maintien en
        état de propreté des intérieurs, le remplacement des serrures, le graissage des gonds des portes et fenêtres,
        l&apos;entretien courant des canalisations et des équipements à usage privatif, ainsi que les menues réparations
        du mobilier.</p>
        <p style={{ marginTop: '6pt' }}>Les grosses réparations (gros œuvre, éléments porteurs concourant à la stabilité
        et à la solidité de l&apos;édifice, clos et couvert) demeurent également à la charge dudit Bailleur. Le Preneur
        doit l&apos;aviser sans délai de toute dégradation nécessitant une grosse réparation.</p>
      </Article>

      {/* ── Article 11 ── */}
      <Article n={11} title="Sous-location et cession">
        <p>Le Preneur ne peut sous-louer tout ou partie des lieux, ni céder son droit au présent bail, sans
        l&apos;accord écrit et préalable du Bailleur.</p>
      </Article>

      {/* ── Article 12 ── */}
      <Article n={12} title="Assurance">
        <p>Le Preneur s&apos;oblige à assurer les lieux loués et le mobilier contre les risques locatifs (incendie,
        dégâts des eaux et risques assimilés) auprès d&apos;une compagnie d&apos;assurance dûment agréée.</p>
        <p style={{ marginTop: '6pt' }}>Le Preneur s&apos;oblige à souscrire à une responsabilité civile, couvrant
        les dommages lui incombant (incendie, dégât eaux et risques assimilés), auprès d&apos;une compagnie
        d&apos;assurance dûment agréée, et à en justifier au Bailleur à première demande, puis à chaque échéance annuelle.</p>
      </Article>

      {/* ── Article 13 ── */}
      <Article n={13} title="Congé et résiliation">
        <p>À l&apos;échéance du terme, la partie qui ne souhaite pas le renouvellement du bail doit en aviser l&apos;autre
        par un congé écrit notifié au moins deux (02) mois avant ladite échéance. À défaut, le bail est reconduit
        tacitement. En cours de reconduction, chaque partie peut résilier le bail moyennant un préavis de deux (02) mois,
        conformément à l&apos;article 26 du Décret n°2022-001/PR.</p>
        <p style={{ marginTop: '6pt' }}>Le congé est signifié par tout moyen laissant une trace écrite. Le Preneur
        reste redevable du loyer pendant toute la durée du préavis.</p>
      </Article>

      {/* ── Article 14 ── */}
      <Article n={14} title="Clause résolutoire">
        <p>En cas de non-paiement du loyer ou des charges à l&apos;échéance, ou d&apos;inexécution de toute autre
        obligation du présent bail, celui-ci pourra être résilié après mise en demeure adressée au Preneur et demeurée
        infructueuse pendant un délai d&apos;un (01) mois.</p>
      </Article>

      {/* ── Article 15 ── */}
      <Article n={15} title="Continuité du bail">
        <p>Conformément aux articles 27 et 28 du Décret n°2022-001/PR, le bail ne prend fin ni par la cession des
        droits du Bailleur sur les locaux — le nouvel acquéreur étant substitué de plein droit dans les obligations
        de l&apos;ancien bailleur — ni par le décès de l&apos;une ou l&apos;autre des parties.</p>
      </Article>

      {/* ── Article 16 ── */}
      <Article n={16} title="Enregistrement">
        <p>Le présent contrat, établi sous seing privé, est soumis aux formalités d&apos;enregistrement auprès de
        l&apos;administration fiscale, conformément au Code général des impôts (article 11 du décret). Les frais
        d&apos;enregistrement sont à la charge du Preneur.</p>
      </Article>

      {/* ── Article 17 ── */}
      <Article n={17} title="Élection de domicile et règlement des litiges">
        <p>Pour l&apos;exécution des présentes, les parties élisent domicile en leurs adresses respectives ci-dessus
        indiquées. Tout différend relatif à l&apos;interprétation ou à l&apos;exécution du présent contrat sera
        recherché à l&apos;amiable ; à défaut d&apos;accord, il sera soumis aux juridictions compétentes de Lomé.</p>
      </Article>

      {/* ── Article 18 ── */}
      <Article n={18} title="Annexes">
        <p>Sont annexés au présent contrat et en font partie intégrante : (1) l&apos;état des lieux d&apos;entrée
        (Annexe 1) ; (2) la copie des pièces d&apos;identité de la personne hébergée.</p>
      </Article>

      {/* ── Signatures ── */}
      <div style={{ marginTop: '24pt', paddingTop: '12pt', borderTop: '1px solid #aaa' }}>
        <p style={{ marginBottom: '16pt' }}>
          Fait à Lomé, le <strong>{formatDateOrdinal(d.today)}</strong>, en trois (03) exemplaires originaux,
          dont un remis à chacune des parties et un destiné à l&apos;enregistrement.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20pt', marginTop: '20pt' }}>
          <SignatureBlock role="LE BAILLEUR" nom="TIDJANI Sakariyaou" />
          <SignatureBlock role="LE PRENEUR" nom={d.prenomNom ?? '…………………………………………'} />
        </div>
      </div>

      {/* ── État des lieux annex ── */}
      <div style={{ marginTop: '32pt', pageBreakBefore: 'always' }}>
        <p style={{ fontSize: '13pt', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase', marginBottom: '4pt' }}>
          Annexe 1 — État des lieux
        </p>
        <p style={{ textAlign: 'center', marginBottom: '12pt', fontSize: '9pt' }}>
          Appartement n°{d.aptNo} — {floorLabel(d.floor)} — Immeuble « JUWEIRAT »
        </p>
        <p style={{ marginBottom: '8pt', fontSize: '9pt' }}>
          Le présent état des lieux est dressé contradictoirement entre le Bailleur et le Preneur, lors de la remise
          des clés à l&apos;entrée, puis à la restitution des lieux à la sortie. Il fait partie intégrante du contrat
          de bail. À défaut d&apos;état des lieux d&apos;entrée, le Preneur est présumé avoir reçu les lieux et le
          mobilier en bon état de réparations locatives.
        </p>

        <div style={{ marginBottom: '10pt', fontSize: '9pt' }}>
          <span>Type d&apos;état des lieux :&nbsp;</span>
          <span>☐ Entrée&nbsp;&nbsp;&nbsp;☐ Sortie</span>
          <span style={{ marginLeft: '24pt' }}>Date : ………………………</span>
        </div>

        <p style={{ fontSize: '9pt', marginBottom: '6pt', fontStyle: 'italic' }}>
          Barème d&apos;appréciation : <strong>N</strong> = Neuf · <strong>TB</strong> = Très bon ·{' '}
          <strong>B</strong> = Bon · <strong>M</strong> = Moyen · <strong>MV</strong> = Mauvais / à remplacer
        </p>

        <EdlTable title="Relevé des compteurs et des clés" rows={[
          ['Compteur d\'électricité (CEET)', '', ''],
          ['Clés remises', '', ''],
        ]} headers={['Élément', 'À l\'entrée', 'À la sortie']} />

        {getPieces(d.pmsType).map((piece, i) => (
          <EdlSection key={i} title={piece.title} rows={piece.rows} />
        ))}

        <div style={{ marginTop: '12pt', fontSize: '9pt' }}>
          <p><strong>Observations générales :</strong></p>
          <div style={{ border: '1px solid #aaa', height: '60pt', marginTop: '4pt', padding: '4pt' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20pt', marginTop: '24pt' }}>
          <SignatureBlock role="LE BAILLEUR" nom="TIDJANI Sakariyaou" />
          <SignatureBlock role="LE PRENEUR" nom={d.prenomNom ?? '…………………………………………'} />
        </div>
      </div>
    </div>
  );
}

function Article({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '10pt', pageBreakInside: 'avoid' }}>
      <p style={{ fontWeight: 'bold', marginBottom: '3pt' }}>
        Article {n} — {title}
      </p>
      <div style={{ textAlign: 'justify' }}>{children}</div>
    </div>
  );
}

function SignatureBlock({ role, nom }: { role: string; nom: string }) {
  return (
    <div>
      <p style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '6pt' }}>{role}</p>
      <p style={{ fontSize: '9pt', fontStyle: 'italic', textAlign: 'center', marginBottom: '8pt' }}>
        (précédé de la mention manuscrite &laquo; Lu et approuvé &raquo;)
      </p>
      <p style={{ fontSize: '9pt', marginBottom: '4pt' }}>Nom : <strong>{nom}</strong></p>
      <p style={{ fontSize: '9pt' }}>Signature :</p>
      <div style={{ height: '50pt', border: '1px solid #ccc', marginTop: '4pt' }} />
    </div>
  );
}

function EdlTable({ title, headers, rows }: {
  title?: string; headers: string[]; rows: string[][];
}) {
  return (
    <div style={{ marginBottom: '8pt' }}>
      {title && <p style={{ fontWeight: 'bold', fontSize: '9pt', marginBottom: '3pt' }}>{title}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                border: '1px solid #aaa', padding: '3pt 5pt',
                background: '#f0f0f0', textAlign: 'left',
                width: i === 0 ? '50%' : '25%',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ border: '1px solid #aaa', padding: '3pt 5pt', height: '16pt' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EdlSection({ title, rows }: { title: string; rows: string[] }) {
  return (
    <EdlTable
      title={title}
      headers={['Élément', 'État à l\'entrée', 'État à la sortie']}
      rows={rows.map(r => [r, '', ''])}
    />
  );
}

function getPieces(pmsType: string | null) {
  const common = ['Sols', 'Murs et plafond', 'Portes et fenêtres', 'Électricité et éclairage', 'Mobilier et équipements'];
  const withWater = [...common, 'Plomberie et sanitaires'];

  const pieces = [
    { title: 'SALON', rows: common },
    { title: 'CHAMBRE 1', rows: withWater },
  ];

  if (pmsType === 'T2' || pmsType === 'T3' || pmsType === 'T4')
    pieces.push({ title: 'CHAMBRE 2', rows: withWater });
  if (pmsType === 'T3' || pmsType === 'T4')
    pieces.push({ title: 'CHAMBRE 3', rows: withWater });
  if (pmsType === 'T4')
    pieces.push({ title: 'CHAMBRE 4', rows: withWater });

  pieces.push({ title: 'CUISINE', rows: withWater });
  pieces.push({ title: 'WC VISITEUR', rows: withWater });
  pieces.push({ title: 'HALL / COULOIR', rows: common });

  return pieces;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function ContratPage() {
  const { id }                        = useParams<{ id: string }>();
  const [data,    setData]            = useState<ContractDataDto | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error,   setError]           = useState('');

  useEffect(() => {
    pmsFolios.getContractData(Number(id))
      .then(setData)
      .catch(() => setError('Erreur lors du chargement des données du contrat.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-green/30 border-t-green rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="flex items-center justify-center h-screen text-red-600">{error || 'Folio introuvable.'}</div>
  );

  const isLongStay = data.nights >= 30;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @page { size: A4; margin: 2cm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #contract-wrapper { box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="no-print bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <Link href={`/pms/folios/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-charcoal">
          <ArrowLeft size={16} /> Retour au folio
        </Link>
        <div className="flex items-center gap-3">
          {isLongStay && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              <AlertTriangle size={13} />
              Long séjour — Contrat obligatoire ({data.nights} nuits)
            </span>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 bg-green text-charcoal text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90"
          >
            <Printer size={15} /> Imprimer / Télécharger PDF
          </button>
        </div>
      </div>

      {/* Contract paper */}
      <div className="no-print min-h-screen bg-gray-100 py-8 px-4">
        <div id="contract-wrapper" className="max-w-[210mm] mx-auto bg-white shadow-xl p-[2cm]">
          <BailContract d={data} />
        </div>
      </div>

      {/* Print-only version (no wrapper) */}
      <div className="hidden print:block">
        <BailContract d={data} />
      </div>
    </>
  );
}
