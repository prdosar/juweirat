# Handoff : Tunnel « Nouvelle réservation » (5 étapes)

## Overview
Refonte de la page `/reservations/new`. La création/sélection du **client** devient la **première étape** du tunnel (elle était en étape 5 dans la version actuelle). Le formulaire est un assistant en 5 étapes avec un récapitulatif tarifaire collant à droite qui se recalcule en direct (nuits, prestations, remise, total, reste à payer). Devise par défaut : **XOF (F CFA)**.

## About the Design Files
Le fichier `Nouvelle réservation.dc.html` de ce bundle est une **référence de design réalisée en HTML** : un prototype montrant l'apparence et le comportement attendus, **pas du code de production à copier**. La tâche est de **recréer ce design dans le codebase cible** (Next.js/React ici, d'après l'URL `localhost:3000`) avec ses patterns, composants et librairies existants (form state, date picker, composants de champ, etc.). `support.js` n'est que le runtime du prototype — à ignorer.

## Fidelity
**Hi-fi.** Couleurs, typographie, espacements, états et copie sont définitifs et doivent être reproduits fidèlement, en réutilisant les primitives UI du codebase quand elles existent.

## Layout global
- Fond page `#f3f5f3`. Police `DM Sans` (fallback Helvetica/system), antialiasing.
- **Header** sticky, `background:#fff`, `border-bottom:1px solid #e5e9e6`, padding `16px 36px`, `display:flex; justify-content:space-between; align-items:center`.
  - Gauche : lien `← Retour aux réservations`, 14px, `#5c6660`.
  - Droite : `TUNNEL GUIDÉ EN 5 ÉTAPES` — 12px, weight 700, `letter-spacing:.1em`, uppercase, `#14181a`.
- **Corps** : `max-width:1200px; margin:0 auto; padding:32px 36px 72px;` `display:grid; grid-template-columns: minmax(0,1fr) 324px; gap:32px; align-items:start`.
- Colonne gauche : `display:flex; flex-direction:column; gap:22px`.
- Titre `h1` : 30px / weight 700 / `letter-spacing:-.02em`. Sous-titre : `Étape N sur 5 — <titre d'étape>`, 15px `#6b7570`.

### Barre d'étapes (stepper)
`display:flex; flex-wrap:wrap; gap:2px; background:#fff; border:1px solid #e5e9e6; border-radius:14px; padding:8px`.
Chaque étape est un bouton cliquable (navigation libre) : `display:flex; align-items:center; gap:9px; padding:10px 14px; border-radius:10px; white-space:nowrap; font-size:13px`.
- Actif : `font-weight:700`, texte `#14181a`, fond `#eef5f0`.
- Fait : texte `#5c6660`, fond transparent, puce `✓`.
- À venir : texte `#a3aca7`.
- Puce : 22×22, `border-radius:999px`, 11px/700 ; actif ou fait → fond `#15803d`, texte `#fff` ; sinon fond `#edf0ee`, texte `#a3aca7`.
Libellés : `Client`, `Séjour`, `Occupants`, `Logement`, `Garantie`.

### Carte d'étape (commun à toutes)
`background:#fff; border:1px solid #e5e9e6; border-radius:16px; padding:26px 28px; box-shadow:0 1px 2px rgba(20,24,26,.03)`.
En-tête de carte : `display:flex; align-items:center; gap:12px; padding-bottom:18px; border-bottom:1px solid #eef1ef; margin-bottom:22px` — puce numérotée 24×24 fond `#15803d` texte `#fff` 12px/700 ; titre 13px/700 uppercase `letter-spacing:.09em` ; méta à droite `margin-left:auto`, 12px `#98a29c`.

### Champs
Label : 11px, weight 700, uppercase, `letter-spacing:.08em`, `#6b7570` ; `*` pour requis.
Input/select/textarea : `padding:12px 14px; border:1px solid #dfe4e0; border-radius:10px; background:#fff`.
Focus : `border-color:#15803d; box-shadow:0 0 0 3px rgba(21,128,61,.13); outline:none`.
Grilles de champs : `display:grid; grid-template-columns:1fr 1fr; gap:16px`.

## Étapes

### Étape 1 — Client titulaire du séjour (méta : « Obligatoire »)
Deux onglets segmentés dans un conteneur `background:#f1f4f2; border-radius:10px; padding:3px; gap:3px` ; bouton `padding:8px 16px; border-radius:8px; 14px/500` ; actif → `background:#fff; color:#14181a; box-shadow:0 1px 2px rgba(20,24,26,.1)` ; inactif → transparent, `#6b7570`.

**Onglet « Client existant »**
- Champ `RECHERCHER UN CLIENT *`, placeholder « Rechercher par nom, téléphone ou email… », filtrage live sur nom + email + téléphone.
- Liste de résultats dans un conteneur `border:1px solid #eef1ef; border-radius:12px; overflow:hidden`. Chaque ligne : bouton pleine largeur, `padding:13px 16px`, `border-bottom:1px solid #eef1ef`, `justify-content:space-between`.
  - Avatar initiales 34×34 rond, 12px/700 : sélectionné → fond `#15803d`/texte `#fff`, sinon `#edf0ee`/`#6b7570`.
  - Nom 15px/500 ; méta 13px `#8b958f` (`email · téléphone`), ellipsis.
  - Badge à droite (`Fidèle`, `3 séjours`, `Agence`, `Nouveau`) : 12px, `padding:4px 10px`, rond ; sélectionné → fond `#15803d`/`#fff`, sinon `#f1f4f2`/`#6b7570`.
  - Ligne sélectionnée : fond `#f2f8f4` + `box-shadow: inset 3px 0 0 #15803d`.
- Sous la liste : « Client introuvable ? **+ Créer un nouveau client** » (lien qui bascule sur l'onglet création).

**Onglet « Créer un client »** — grille 2 colonnes :
`Nom complet *` (ex. Awa Diop), `Téléphone *` (+225 07 00 00 00 00), `E-mail`, `Pièce d'identité` (CNI · n° 00 000 000), `Pays` (Côte d'Ivoire, Sénégal, Burkina Faso, France, Autre), `Type de client` (Particulier, Entreprise, Agence / TO).
Puis, sur toute la largeur, case à cocher (`accent-color:#15803d`) dans un bloc `border:1px solid #eef1ef; border-radius:10px; background:#f8faf9; padding:13px 14px` : « Enregistrer cette fiche dans le répertoire clients pour les prochains séjours. »

### Étape 2 — Période du séjour (méta : « N nuits »)
`Date d'arrivée *` et `Date de départ *` (`input[type=date]`), grille 2 colonnes.
Raccourcis de durée en chips : `1 nuit`, `2 nuits`, `3 nuits`, `7 nuits` — appliquent `départ = arrivée + n`. Chip actif quand la durée courante correspond.
**Chip** : `padding:9px 15px; border-radius:999px; font-size:14px` ; off → `background:#fff; color:#5c6660; border:1px solid #dfe4e0` ; on → `background:#15803d; color:#fff; border-color:#15803d`.

### Étape 3 — Nombre d'occupants (méta : « Total : N personnes »)
Deux steppers numériques (`Nombre d'adultes *` min 1, `Nombre d'enfants` min 0) : conteneur `padding:8px 10px 8px 14px; border:1px solid #dfe4e0; border-radius:10px`, valeur 16px/500 à gauche, deux boutons 32×32 `border-radius:8px; border:1px solid #dfe4e0` (`−` / `+`), hover `background:#f1f4f2`.

### Étape 4 — Logement & prestations
`CATÉGORIE DE LOGEMENT *` — liste de cartes sélectionnables (`gap:10px`) : `padding:15px 18px; border-radius:12px; border:1px solid #e8ebe9` ; sélectionnée → `background:#f2f8f4; border-color:#15803d`. Nom 15px/500, détail 13px `#8b958f`, prix à droite 15px/500 + « par nuit » 12px `#8b958f`.
- Chambre Standard — 20 m² · lit double · ventilée — 28 000 F
- Chambre Climatisée — 24 m² · lit queen · balcon — 42 000 F
- Suite Familiale — 40 m² · salon séparé · 2 chambres — 68 000 F

`PRESTATIONS ANNEXES` — chips multi-sélection (même style que 2) :
- Petit-déjeuner · 3 500 / pers → `3500 × occupants × nuits`
- Transfert aéroport · 15 000 → forfait
- Blanchisserie · 5 000 / nuit → `5000 × nuits`
- Lit bébé · offert → 0

`NOTE INTERNE` — textarea 3 lignes, placeholder « Arrivée tardive, préférences, transfert aéroport… ».

### Étape 5 — Garantie & tarif
`GARANTIE DE LA RÉSERVATION` — 2 cartes en grille `1fr 1fr`, `gap:12px`, contenu aligné à gauche, `padding:15px 18px; border-radius:12px` ; sélectionnée → `background:#f2f8f4; border-color:#15803d` :
- **Dépôt en espèces** — « Montant versé à l'accueil »
- **Carte bancaire** — « Empreinte de garantie »

Puis grille 2 colonnes : `Canal d'origine` (Direct, Téléphone, Agence, Site web, OTA), `Devise` (XOF, EUR, USD), `Remise` (montant), `Acompte encaissé` (montant).

## Récapitulatif latéral (sticky, `top:84px`)
Carte sombre : `background:#14181a; color:#eef2ef; border-radius:16px; padding:24px; gap:18px`.
- Sur-titre `RÉCAPITULATIF` 11px/700 uppercase `letter-spacing:.1em` `#8c9691`.
- Nom du client 19px/500 (ou « Nouveau client »), puis `N personnes · N nuits` 13px `#8c9691`.
- Séparateurs `height:1px; background:#2a2f31`.
- Lignes 14px `justify-content:space-between`, libellé `#8c9691` : Dates (`12 sept. → 15 sept.`), Logement, Hébergement, Prestations, Remise (`− 5 000 F` ou `—`).
- Total : libellé 13px `#8c9691`, montant 26px/700.
- Reste à payer : 13px, valeur `#7fc79b`.
- CTA `Confirmer la réservation` : `padding:13px; border-radius:10px; background:#22a15a; color:#062d17; font-weight:700`, hover `#2cb968`.
Sous la carte : encart blanc `border:1px solid #e5e9e6; border-radius:14px; padding:16px 18px`, 13px `#6b7570` : « La fiche client est créée dès l'étape 1 : elle reste liée à toutes les réservations suivantes. »

## Interactions & Behavior
- Navigation : `← Précédent` (masqué via `visibility:hidden` à l'étape 1, style `border:1px solid #dfe4e0; background:#fff; color:#5c6660; padding:12px 20px; border-radius:10px`) et bouton primaire `Continuer` (`background:#15803d`, hover `#116830`), libellé `Créer la réservation` à l'étape 5. Clic sur une puce du stepper = saut direct à l'étape.
- Transitions : `.15s` sur `background`, `border-color`, `box-shadow`. Aucune animation lourde.
- Validation attendue côté implémentation : client requis (fiche sélectionnée ou champs `Nom complet` + `Téléphone` remplis), `date de départ > date d'arrivée`, adultes ≥ 1, catégorie de logement requise. Bloquer `Continuer` avec message d'erreur inline sous le champ (rouge du design system du codebase).
- Le récapitulatif se met à jour à chaque changement, sans rechargement.

## State Management
```
step: 0..4
clientMode: 'existing' | 'new'
clientQuery: string
clientId: number | null
newClient: { name, phone, email, idDoc, country, type, saveToDirectory }
checkIn: 'YYYY-MM-DD'   checkOut: 'YYYY-MM-DD'
adults: number (min 1)  kids: number (min 0)
roomId: string          extras: string[]
guarantee: 'cash' | 'card'
channel, currency, discount, deposit, internalNote
```
Dérivés : `nights`, `guests = adults + kids`, `roomTotal = prix × nights`, `extrasTotal` (règles ci-dessus), `total = max(0, roomTotal + extrasTotal − discount)`, `balance = max(0, total − deposit)`.

**Piège dates (important)** : ne pas faire `new Date('2026-09-12')` puis un formatage local — la chaîne est parsée en UTC et affiche un jour de moins. Parser depuis les composants locaux (`new Date(y, m-1, d)`) et reconstruire l'ISO depuis `getFullYear/getMonth/getDate`.

Données à brancher sur l'API : répertoire clients (recherche serveur, debounce ~250 ms), catégories de logement + tarifs, prestations annexes, disponibilités sur la période.

## Design Tokens
Couleurs : `#15803d` (primaire), `#116830` (hover), `#22a15a` / `#2cb968` (CTA récap), `#f2f8f4` (fond sélectionné), `#eef5f0` (étape active), `#14181a` (texte / carte sombre), `#5c6660`, `#6b7570`, `#8b958f`, `#98a29c`, `#a3aca7` (textes secondaires), `#dfe4e0` (bordure champ), `#e5e9e6` (bordure carte), `#eef1ef` / `#e8ebe9` (séparateurs), `#f1f4f2` / `#edf0ee` (fonds neutres), `#f3f5f3` (fond page), `#fff`. Récap sombre : `#2a2f31` (séparateur), `#8c9691` (label), `#7fc79b` (solde), `#062d17` (texte CTA).
Espacements : 2, 3, 6, 8, 10, 12, 14, 16, 18, 22, 26, 32, 36, 72.
Rayons : 8, 10, 12, 14, 16, 999.
Typo : 30/700 (h1) · 19/500 · 16/500 · 15/400-500 · 14/400-500 · 13/400-700 · 12/400-700 · 11/700 uppercase.
Ombres : `0 1px 2px rgba(20,24,26,.03)` (cartes), `0 1px 2px rgba(20,24,26,.1)` (onglet actif), `0 0 0 3px rgba(21,128,61,.13)` (focus), `inset 3px 0 0 #15803d` (ligne client sélectionnée).
Devise : montants entiers, séparateur d'espace, suffixe ` F` (ex. `126 000 F`).

## Assets
Aucun asset binaire. Police **DM Sans** via Google Fonts. Icônes : à prendre dans la librairie d'icônes du codebase (le prototype utilise `←`, `✓`, `−`, `+` en texte) ; les pictos de section de la version actuelle (calendrier, occupants, colis, bouclier, maison) peuvent être conservés.

## Files
- `Nouvelle réservation.dc.html` — le prototype complet (5 étapes + récap), ouvrable directement dans un navigateur.
- `support.js` — runtime du prototype, non pertinent pour l'implémentation.
