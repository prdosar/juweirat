# Spécification technique — PMS « Gestion Juweirat »

Document de reprise à destination d'un développeur informatique. Il décrit l'intégralité du logiciel de gestion de l'immeuble **Juweirat** (Lomé, Togo) : modèle de données, règles métier, modules, moteur tarifaire, calculs et rendus. Le prototype de référence est une application React mono-fichier (~1470 lignes). Cette spec permet de le réimplémenter dans n'importe quelle stack.

> Version : parc à **19 logements** (étages 2, 4, 5, 6), grille tarifaire à **3 paliers de durée**, facturation adaptée automatiquement au type de séjour.

---

## 1. Objectif & contexte

Immeuble de **19 logements** exploités en **location nightly / courte & moyenne durée**. L'outil couvre le cycle complet : réservation → check-in → séjour → facturation → check-out → clôture, plus gouvernante (ménage), maintenance technique, débiteurs et édition de rapports par chambre.

L'ergonomie et la logique s'inspirent d'un PMS hôtelier (spécification type FOLS/Accor) : cinq concepts structurants (§4) et une **clôture journalière** qui fait avancer la date métier.

---

## 2. Stack & contraintes du prototype

- **Front** : React (un composant racine `App` + sous-composants). Pas de router : navigation par onglets via un état `tab`.
- **Styles** : inline, à partir d'une palette (§12). Aucune dépendance UI externe requise.
- **Persistance** : couche clé-valeur asynchrone (`window.storage.get/set`, valeurs JSON), une clé par collection (§3). À remplacer en production par une base (§15).
- **Aucun backend** dans le prototype.
- **Monnaie** : configurable ; défaut **FCFA** sans décimales (entiers).
- **Langue** : FR.

---

## 3. Persistance (clés de stockage)

Préfixe `juweirat:`. Neuf collections :

| Clé | Contenu |
|---|---|
| `juweirat:config` | Configuration + compteurs séquentiels + **date hôtel** |
| `juweirat:units` | Les 19 logements (parc) |
| `juweirat:folios` | Séjours / réservations |
| `juweirat:monthly` | Rôle mensuel longue durée — *vestige (voir §14)* |
| `juweirat:debtors` | Créances diverses |
| `juweirat:postings` | Main courante (générée à la clôture) |
| `juweirat:clotures` | Indicateurs figés par date hôtel clôturée |
| `juweirat:factures` | Factures émises (avec snapshot figé) |
| `juweirat:maintenance` | Tickets techniques |

**Chargement** (au démarrage, avec valeurs par défaut) et migrations :
- `config.dateHotel` absent → date du jour.
- **units** : si aucune unité n'a de champ `floor` (ancien jeu générique), remplacer par le parc réel (`genUnits()`). Sinon : conserver les unités existantes, **rétro-remplir** `tarifs`/`gamme` manquants, forcer `mode="court"`, et **ajouter les logements du plan absents** (ex. un nouvel étage) par différence d'`id`. Ainsi l'ajout d'un logement se propage aux installations existantes sans écraser les données.

**Sauvegarde** : persister chaque collection à chaque changement.

---

## 4. Concepts structurants (FOLS)

1. **Date hôtel** (`config.dateHotel`) : date métier distincte de l'horloge système. N'avance **que** par la clôture journalière. Toutes les opérations se lisent par rapport à elle.
2. **Séjour (folio)** = unité atomique. `[arrival, departure[` (le jour de départ n'est pas facturé). *Limite : séjour stocké comme intervalle, pas éclaté en nuitées (voir §15).* 
3. **Folio = conteneur financier** : identité client + prestations + encaissements + solde + état de réservation.
4. **Main courante** (`postings`) : journal des prestations généré à la clôture (« passage des prix »). Archive/figement, ne recalcule pas le solde.
5. **Deux axes de statut indépendants** :
   - **Statut ménage** du logement : `propre` / `sale` (+ hors service).
   - **Statut réservation** du folio : dérivé de la date hôtel (Option, Confirmée, Garantie, Arrivée prévue, En cours, Départ prévu, Parti, No-show, Annulée).

---

## 5. Parc & grille tarifaire (données de référence)

### 5.1 Plan (19 logements, 2 colonnes séparées par un couloir)

`id = numéro de chambre`.

| Étage | Colonne gauche | Colonne droite |
|---|---|---|
| **2** | 24 (T3), 22 (T2), 21 (T1) | 25 (T2), 23 (T3) |
| **4** | 44 (T3), 42 (T2), 41 (T1) | 46 (T1), 45 (T2), 43 (T3) |
| **5** | 54 (T3), 52 (T2), 51 (T1) | 56 (T1), 55 (T2), 53 (T3) |
| **6** | 61 (T1) | 67 (T4) |

```
JUWEIRAT_FLOORS = [
  { floor:2, rooms:[{no:"24",type:"T3",col:0,row:0},{no:"22",type:"T2",col:0,row:1},{no:"21",type:"T1",col:0,row:2},
                    {no:"25",type:"T2",col:1,row:0},{no:"23",type:"T3",col:1,row:1}] },
  { floor:4, rooms:[{no:"44",type:"T3",col:0,row:0},{no:"42",type:"T2",col:0,row:1},{no:"41",type:"T1",col:0,row:2},
                    {no:"46",type:"T1",col:1,row:0},{no:"45",type:"T2",col:1,row:1},{no:"43",type:"T3",col:1,row:2}] },
  { floor:5, rooms:[{no:"54",type:"T3",col:0,row:0},{no:"52",type:"T2",col:0,row:1},{no:"51",type:"T1",col:0,row:2},
                    {no:"56",type:"T1",col:1,row:0},{no:"55",type:"T2",col:1,row:1},{no:"53",type:"T3",col:1,row:2}] },
  { floor:6, rooms:[{no:"61",type:"T1",col:0,row:0},{no:"67",type:"T4",col:1,row:0}] },
]
```

### 5.2 Grille tarifaire (FCFA) — 3 tarifs par logement

Trois tarifs selon la **durée du séjour** : **nuitée** (électricité incluse), **forfait 15 nuits** et **forfait 30 nuits** (tous deux **hors électricité**, à la charge du client).

| Logement | Type / gamme | Nuitée (élec incl.) | 15 nuits (hors élec) | 30 nuits (hors élec) |
|---|---|---:|---:|---:|
| 22 | T2 supérieure | 45 000 | 325 000 | 600 000 |
| 23 | T3 supérieure | 80 000 | 500 000 | 900 000 |
| 24 | T3 supérieure | 80 000 | 500 000 | 900 000 |
| 25 | T2 privilège | 55 000 | 350 000 | 700 000 |
| 41 | T1 standard | 30 000 | 200 000 | 300 000 |
| 42 | T2 standard | 40 000 | 300 000 | 450 000 |
| 43 | T3 standard | 65 000 | 450 000 | 750 000 |
| 44 | T3 standard | 65 000 | 450 000 | 750 000 |
| 45 | T2 supérieure | 45 000 | 300 000 | 500 000 |
| 46 | T1 supérieur | 35 000 | 250 000 | 400 000 |
| 51 | T1 standard | 30 000 | 200 000 | 300 000 |
| 52 | T2 standard | 40 000 | 300 000 | 450 000 |
| 53 | T3 standard | 65 000 | 450 000 | 750 000 |
| 54 | T3 standard | 65 000 | 450 000 | 750 000 |
| 55 | T2 supérieure | 45 000 | 300 000 | 500 000 |
| 56 | T1 supérieure | 35 000 | 250 000 | 400 000 |
| 61 | T1 privilège | 40 000 | 300 000 | 450 000 |
| 67 | T4 suite | 95 000 | 800 000 | 1 500 000 |

> **21 (T1, 2ᵉ étage)** n'a pas de ligne officielle dans la grille fournie : valeur par défaut T1 standard (30 000 / 200 000 / 300 000) — à confirmer.

Fallback par type (si un logement n'a pas de grille) :
```
FALLBACK_TARIF = { T1:{nuit:30000,n15:200000,n30:300000}, T2:{nuit:40000,n15:300000,n30:450000},
                   T3:{nuit:65000,n15:450000,n30:750000}, T4:{nuit:95000,n15:800000,n30:1500000} }
```

### 5.3 Moteur tarifaire (sélection par durée)

```
tarifForStay(tarifs, nights):
  si nights >= 30 → { tier:"30 nuits", perNight: n30/30, elec:false }
  si nights >= 15 → { tier:"15 nuits", perNight: n15/15, elec:false }
  sinon           → { tier:"nuitée",   perNight: nuit,    elec:true  }
```

Le **tarif/nuit effectif** appliqué au folio est `perNight` (le forfait proratisé par la taille du palier). Pour 15 ou 30 nuits pile, on retombe exactement sur le prix de la grille ; entre les deux, c'est interpolé. Le champ reste **modifiable manuellement**. *(Variante possible : forfait en bloc fixe plutôt que proraté — à décider avec le métier.)*

**Électricité** : incluse pour la nuitée, exclue pour les forfaits 15/30 (mention portée sur le folio et la facture ; non métrée par l'app — la facturer via « débiteur divers » si besoin).

---

## 6. Modèle de données

### 6.1 config
```
{ buildingName, ownerName, city,
  currency:{ code, decimals },        // { code:"FCFA", decimals:0 }
  dateHotel:"YYYY-MM-DD",             // date métier (avancée par la clôture)
  resaSeq:number, factureSeq:number } // compteurs de numérotation continue
```

### 6.2 unit (logement) — 19
```
{ id:string,                          // = numéro de chambre, ex. "67"
  label:"Logement 67", type:"T1"|"T2"|"T3"|"T4", gamme:string, // "suite","supérieure"…
  mode:"court",                       // tous folio-based désormais
  rate:number,                        // = tarifs.nuit (tarif nuitée)
  rent:number,                        // = tarifs.n30 (réf. mensuelle)
  tarifs:{ nuit, n15, n30 },          // grille 3 paliers
  hs:boolean, statutMenage:"propre"|"sale", lastCleaned?:"YYYY-MM-DD",
  floor:number, roomNo:string, planCol:0|1, planRow:number,
  tenant, leaseStart, phone, note }
```

### 6.3 folio (séjour)
```
{ id:number, number:"FL-AAAA-####",   // resaSeq, attribué à la création
  unitId, guest, nom, prenom, societe, reservataire,
  cardNumber, cardExpiry, cardHolder, // en prod : 4 derniers chiffres + empreinte
  segment:"Direct"|"OTA"|"Société"|"Agence"|"Autre",
  pax, arrival:"YYYY-MM-DD", departure:"YYYY-MM-DD",
  rate:number, heb:number,            // heb=0 → calculé rate*nuits
  tarifTier:"nuitée"|"15 nuits"|"30 nuits", elecIncluded:boolean, // auto (moteur tarifaire)
  pdjParJour, pdjPrix, debiteur, dependances,
  arrhes, paid, payMode?, factRecipient?:"client"|"societe",
  resaStatus:"option"|"confirmée"|"garantie"|"no-show"|"annulée",
  checkedIn:boolean, closed:boolean, checkoutDate?, factureId?, note }
```

### 6.4 facture
```
{ id, number:"FAC-AAAA-####",         // factureSeq, attribué à l'émission
  folioId, date, status:"émise"|"annulée",
  printCount, corrections, corrigeeLe?,
  snapshot:{ lines:[{label,montant}], total, arrhes, paid, payMode,
             recipient:"client"|"societe", client, societe, reservataire,
             unitLabel, arrival, departure, nights, pax } }  // FIGÉ à l'émission
```

### 6.5 ticket maintenance
```
{ id, createdAt, zone:"logement"|"commun", unitId?, spot?,
  category, priority:"basse"|"normale"|"haute"|"urgente",
  title, description, tech, cost,
  status:"ouvert"|"en_cours"|"resolu"|"annule", resolvedAt?, note }
```

### 6.6 posting / cloture / debtor / monthly
```
posting : { id, dateHotel, folioId, unitId, famille:"Hébergement"|"Petit-déjeuner", libelle, montant, horodatage }
cloture : { dateHotel, executedAt, indicators:{occupation,dispo,occ,caHeb,caPdj,caTotal,pm,revpar}, nbArrivals, nbDeparts, nbNoShow, nbLignes, montant }
debtor  : { id, client, label, dueDate, amount, paid }
monthly : { "YYYY-MM": { [unitId]: { leased, rentDue, rentPaid, paidDate? } } }   // vestige longue durée
```

### 6.7 Constantes
```
SEGMENTS      = ["Direct","OTA","Société","Agence","Autre"]
RESA_STATUS   = ["option","confirmée","garantie","no-show","annulée"]
CLEAN_CADENCE = 3   // jours
MAINT_CATS    = ["Plomberie","Électricité","Climatisation","Mobilier / Literie","Serrurerie",
                 "Peinture / Murs","Sanitaire","Électroménager","Internet / TV","Autre"]
MAINT_STATUS  = ouvert | en_cours | resolu | annule
MAINT_PRIO    = basse | normale | haute | urgente
```

---

## 7. Règles métier (impératives)

1. **Numérotation continue** via compteurs persistés : `FL-AAAA-####` (folios, `resaSeq`, à la création) et `FAC-AAAA-####` (factures, `factureSeq`, **à l'émission**). Jamais basée sur la taille d'un tableau.
2. **Tarif par durée** : à la création/édition d'un folio, `rate` est recalculé par `tarifForStay` selon le nombre de nuits ; `tarifTier` et `elecIncluded` en découlent. Se recalcule au changement de dates ou de logement. Reste éditable manuellement.
3. **Check-in impossible si logement non propre** (blocage dur, sans forçage) : refus si `statutMenage==="sale"` ou `hs`. Bouton désactivé.
4. **Check-out impossible si folio non soldé** : refus si `folioCalc(f).solde > 0`. Alternatives : encaisser, ou **transférer le solde en débiteur** (crée la créance et solde le folio). Le check-out passe le logement en `sale`.
5. **Double réservation** : deux folios actifs sur le même logement avec dates chevauchantes → signalé partout (bandeau, cartes, tags, surlignage), non bloquant.
6. **Cadence ménage 3 jours** : un logement occupé repasse automatiquement « à rafraîchir » (occupée sale) tous les 3 jours. Ancre = `lastCleaned` (ou l'arrivée du séjour). Marquer « propre » écrit `lastCleaned=dateHotel` et réinitialise.
7. **Hors service → sale à la réactivation**.
8. **Trop-perçu → arrhes** : à l'encaissement d'un montant reçu, on impute d'abord le solde puis on verse l'excédent en arrhes. `solde = max(0, total − paid − arrhes)` (jamais négatif) ; `avoir = max(0, paid + arrhes − total)`.
9. **Clôture journalière** (point de non-retour) : contrôle arrivées (arrivé **ou** no-show), contrôle départs (check-out **ou** prolongation), passage des prix (main courante), figement des indicateurs, incrémentation de la date hôtel. Une date clôturée ne peut être rejouée.
10. **Statut réservation dérivé** de la date hôtel (`resaLifecycle`).

---

## 8. Modules / onglets

Navigation horizontale (barre supérieure défilante). **Bandeau permanent** sous la barre, sur tous les écrans : Date hôtel · Occupation · Arrivées restantes · Départs restants · À nettoyer · (⚠ Conflits) · (⚒ Maintenance actifs).

| Onglet | Rôle |
|---|---|
| **Écran journée** | KPI du jour + listes Présents / Arrivées / Départs, actions check-in/out ; noms clients cliquables → folio. |
| **Planning** | Calendrier rack (logements × jours), barres de séjour cliquables. |
| **Réservations** | Grille de disponibilité par dates **avec filtre de type (Tous/T1/T2/T3/T4)** sur les 19 logements ; affiche nuitée + forfaits 15/30 ; crée le folio. Liste des réservations (check-in/out, tags conflit). *Seul point de création de folio.* |
| **Folios** | **Recherche** (nom/prénom/société + date de séjour). Liste des séjours + hub folio. Pas de création. |
| **Gouvernante** | Plan visuel (étages 2/4/5/6, 2 colonnes + couloir). Statut par logement, boutons Propre/Sale et HS. Cadence 3 j appliquée. |
| **Maintenance** | Tickets techniques : signalement, catégories, priorités, cycle, technicien, coût ; Mettre HS / Réactiver ; filtres + KPI + coût cumulé. |
| **Statistiques** | Occupation, RevPAR, prix moyen, indice fréquentation, captage, CA, sur une plage de mois ; export CSV. |
| **Édition** | **Calendrier des évènements par chambre** sur une période : séjours, ménages (cadence 3 j + départ), maintenance. **Filtre par n° de chambre** appliqué à toute la section. Par chambre : **prix moyen (ADR), durée moyenne des séjours, CA**. KPI + synthèse par chambre + détail + export CSV + impression HTML. |
| **Débiteurs** | Créances diverses éditables + arriérés de loyer (dérivés de `monthly`, désormais généralement vides) ; export. |
| **Factures** | Liste + **recherche par nom/prénom/société et par dates** ; Modifier (rectifier), Annuler, Télécharger (duplicata). |
| **Clôture** | Assistant séquentiel (§7.9) + historique des clôtures figées. |
| **Paramètres** | Immeuble, propriétaire, ville, **date hôtel**, devise/décimales. |

> Onglets **Loyers** et **Logements** retirés (le modèle est unifié autour des folios + tarifs par durée).

### Hub folio (modal global)
Modal unique ouvert au clic sur tout élément client (nom, n° folio, barre planning, ligne de clôture). Contient : identité & réservation, **bloc tarif** (palier appliqué, tarif/nuit effectif, mention électricité, rappel de la grille du logement), garantie CB, prestations & solde, et **Facturation & encaissement** : mode de paiement (dont « Débiteur divers »), destinataire (client/société), **Encaisser un montant reçu** (trop-perçu → arrhes), **Encaisser le solde**, **Éditer la facture**, **Transférer le solde en débiteur**, aperçu extrait. Bannière rouge si double réservation.

---

## 9. Calculs (formules de référence)

**folioCalc(f)** :
```
nights = departure − arrival
heb    = f.heb>0 ? f.heb : rate*nights
pdjTot = pdjParJour*pdjPrix*nights
total  = heb + pdjTot + debiteur + dependances
brut   = paid + arrhes
solde  = max(0, total − brut)     // jamais négatif
avoir  = max(0, brut − total)     // trop-perçu
```

**resaLifecycle(f, D)** (D = date hôtel) : annulée/no-show/parti ; arrival>D → Option/Confirmée/Garantie ; departure<D → Départ en retard ; departure=D → Départ prévu ; arrival=D && !checkedIn → Arrivée prévue ; sinon En cours.

**unitDayInfo(u, D)** : `hs` | `occ` | `attendu` | `dispo`. In-house = folio actif non clos, `arrival<=D<departure` et (`checkedIn` ou `arrival<D`).

**dayIndicators** : occupation, caHeb, caPdj, caTotal, **pm = caHeb/occ**, **revpar = caHeb/dispo**.

**Édition — par chambre sur [from, to]** :
```
on = nuitées de chevauchement avec la période
heb   += (heb_folio/nights_folio) * on          // prorata
pdj   += pdjParJour*pdjPrix * on ;  nights += on
si le séjour touche la période : stays++ ; losTot += (departure − arrival)
si arrival ∈ période : extra += debiteur + dependances
total = heb + pdj + extra
pm    = nights ? heb/nights : 0                 // prix moyen (ADR)
los   = stays  ? losTot/stays : 0               // durée moyenne des séjours
```

**cleaningEvents(folios, from, to)** : par séjour, ménage mi-séjour à `arrival+3, +6, …` (< departure) + ménage après départ à `departure`.

**menageDue(unit, folios, D)** : occupé && `dayDiff(lastCleaned || arrival, D) >= 3`.

---

## 10. Cycle de vie

Réservation (Réservations, avec type + tarif auto) → **Check-in** (si propre) → séjour (ménage auto tous les 3 j) → **Check-out** (si soldé → logement sale) → **Clôture** (avance la date hôtel). Facture émise depuis le folio (snapshot figé), rééditable (duplicata), rectifiable (même n°), annulable (archivée, libère le folio).

---

## 11. Facturation (détail)

- **Émission** : fige un `snapshot` (source du document) ; n° `FAC-AAAA-####`. La ligne hébergement mentionne le **forfait** appliqué et « (hors électricité) » le cas échéant.
- **Document** : HTML autonome imprimable (marque, destinataire, lignes, total, arrhes, réglé, solde, **avoir**). Bannières : DUPLICATA / FACTURE RECTIFIÉE / FACTURE ANNULÉE.
- **Rectification** : édition du snapshot, **même numéro**, `corrections++`.
- **Annulation** : `status="annulée"`, archivée, `folio.factureId` libéré.
- **Recherche** : par nom/prénom/société et plage de dates.

---

## 12. Identité visuelle

```
green  #1B4332  green2 #2D5A45  gold  #B08D57  gold2 #C9A227
cream  #F7F4EC  paper  #FFFFFF  ink   #2A2622  muted #8A8172
line   #E4DCCB  rowAlt #FBF8F1  danger#9B2C2C  ok    #2D6A4F
warn   #B5761F  blue   #2C5A7A
```
En-têtes verts, filets dorés, lignes alternées crème, tableaux à en-tête vert, tags de statut colorés. Formatage monétaire selon `currency`.

---

## 13. Génération de documents (sorties)

- Extrait de compte (folio) : `.txt`.
- Facture / duplicata : `.html` imprimable.
- Édition évènements : export **CSV** (évènements + synthèse par chambre : séjours, nuits, durée moyenne, prix moyen, hébergement, PDJ, extras, CA) et impression **HTML** (par chambre : CA, prix moyen, durée moyenne).
- Statistiques, Débiteurs : export CSV.

---

## 14. Points ouverts / à confirmer avec le métier

1. **Logement 21** : hors grille officielle (valeurs T1 standard par défaut) — fournir ses vrais tarifs ou le retirer.
2. **Forfaits 15/30 nuits** : proratés par nuit (implémentation actuelle) vs bloc forfaitaire fixe — arbitrage métier.
3. **Électricité** : non métrée ; à facturer manuellement (débiteur divers) pour les forfaits. Prévoir un relevé/index si automatisation souhaitée.
4. **Longue durée / `monthly`** : logique conservée mais non exposée (onglet Loyers retiré). Réactiver si des baux mensuels reviennent.

---

## 15. Recommandations production (industrialisation)

1. **Backend transactionnel** (PostgreSQL, ACID) : une table par collection (§3), séquences SQL pour la numérotation.
2. **Nuitée atomique** : éclater chaque séjour en N lignes de nuitée (tarif variable par nuit, changement de chambre en cours de séjour). Aujourd'hui le séjour est un intervalle et le tarif un `perNight` unique par palier.
3. **Main courante inaltérable** : journal append-only, chaînage par empreinte (hash), numérotation légale continue ; corrections par **avoir** plutôt qu'édition en place.
4. **Rôles & droits** (réception, gouvernante, direction, maintenance) + journal d'audit.
5. **Sécurité CB** : ne stocker que 4 derniers chiffres + empreinte de pré-autorisation (PCI-DSS).
6. **Maintenance préventive récurrente** (génération auto de tickets à échéance).
7. **Moteur tarifaire étendu** : saisonnalité, remises, tarifs négociés société, électricité indexée.
8. **Multi-immeuble / multi-devise** si extension.

---

*Le prototype de référence (`juweirat-gestion.jsx`) implémente les points 1 à 13. Les §14 et §15 listent les arbitrages métier et l'industrialisation restant à traiter.*
