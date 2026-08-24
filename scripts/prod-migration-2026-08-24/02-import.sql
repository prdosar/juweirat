-- ═══════════════════════════════════════════════════════════════════════
-- Import données réelles — Juweirat 2026-08-24
--
-- Prérequis : 01-cleanup.sql exécuté (tables vides, séquences resettées).
--
-- Crée 13 occupations en cours (clients + reservations CheckedIn + folios ouverts).
-- Source : PDF "etat de synthèse d'occupation de l'immeuble.pdf" moins chambres 22 et 61.
--
-- Règles appliquées :
--   • Prix stockés en HT (TVA 18% ajoutée à l'affichage).
--   • 1 adulte / 0 enfant pour toutes.
--   • Nom = 1er mot du nom complet, Prénom = reste (règle utilisateur).
--   • Discount = prix_catalogue × nuits − prix_négocié (pour matcher le contrat).
--   • HS gouvernance (ch 21 et 67) : TotalPrice=0, Discount=catalogue complet.
--   • YAS occupations (ch 42, 43, 53) : ElecIncluded=true.
--   • Séjours ≥ 30 nuits : TarifTier=N30Nuits, sinon Nuitee.
--   • Le waterfall CompanyTarif > Category est appliqué pour le prix catalogue.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
DECLARE
  r RECORD;
  v_client_id BIGINT;
  v_resa_id BIGINT;
  v_room_id BIGINT;
  v_cat_id BIGINT;
  v_company_id BIGINT;
  v_nights INT;
  v_cat_per_night INT;
  v_cat_total INT;
  v_per_night INT;
  v_discount INT;
  v_seq INT;
  v_ref TEXT;
  v_folio_num TEXT;
  v_reservation_count INT;
BEGIN
  -- ── Table temporaire avec les 13 lignes à importer ─────────────────
  CREATE TEMP TABLE tmp_import (
    ord            INT,
    pms_room       TEXT,
    company_name   TEXT,  -- NULL si individuel
    nom            TEXT,
    prenom         TEXT,
    checkin        DATE,
    checkout       DATE,
    negociated_ht  INT,   -- 0 = gratuit (HS gouvernance)
    elec_incluse   BOOL,
    tarif_tier     TEXT,  -- 'Nuitee' | 'N15Nuits' | 'N30Nuits'
    internal_note  TEXT
  ) ON COMMIT DROP;

  INSERT INTO tmp_import VALUES
    ( 1, '21', NULL,       'Yasfir',     '',                    '2026-08-20', '2026-12-31',        0, true,  'N30Nuits', 'HS gouvernance — gratuit'),
    ( 2, '23', 'BESSAC',   'Michaël',    'Loïc Franck',         '2026-02-25', '2027-02-24', 10920000, false, 'N30Nuits', NULL),
    ( 3, '24', 'BESSAC',   'Jean',       'Christophe Rassel',   '2025-11-10', '2026-11-09', 10950000, false, 'N30Nuits', NULL),
    ( 4, '25', 'CICR',     'Condo',      'Ndoli Said',          '2026-04-07', '2027-04-06',  7886667, false, 'N30Nuits', NULL),
    ( 5, '42', 'YAS',      'Salah',      'Hazem',               '2026-06-15', '2027-06-14',  7280000, true,  'N30Nuits', 'Tarif incluant électricité'),
    ( 6, '43', 'YAS',      'HAIDERASIF', '',                    '2026-06-15', '2027-06-14', 10920000, true,  'N30Nuits', 'Tarif incluant électricité'),
    ( 7, '44', 'BESSAC',   'Khaled',     'Abo Chahda',          '2026-01-08', '2027-01-07',  9100000, false, 'N30Nuits', NULL),
    ( 8, '45', 'BESSAC',   'Migisha',    'Séréna Doemi',        '2026-01-17', '2027-01-16',  7280000, false, 'N30Nuits', NULL),
    ( 9, '52', NULL,       'Ahmed',      'Khaled Fouad Abbas',  '2026-08-03', '2026-08-29',   390000, false, 'Nuitee',   'Tarif mensuel 450k négocié, séjour 26 nuits'),
    (10, '53', 'YAS',      'Shérif',     'Sayed Ahmed',         '2026-06-15', '2027-06-14', 10920000, true,  'N30Nuits', 'Tarif incluant électricité'),
    (11, '54', 'SOROUBAT', 'Gaaiech',    'Mohamed Habib',       '2026-08-06', '2027-08-05',  7886667, false, 'N30Nuits', NULL),
    (12, '55', 'CICR',     'Gisella',    '',                    '2026-03-01', '2027-02-28',  6066667, false, 'N30Nuits', NULL),
    (13, '67', NULL,       'Abdoul',     'Tidjani',             '2026-07-31', '2026-08-31',        0, true,  'N30Nuits', 'HS gouvernance — gratuit');

  -- ── Vérif compagnies obligatoires ──────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM "companies" WHERE LOWER("name") = 'bessac')   THEN RAISE EXCEPTION 'Compagnie BESSAC introuvable';   END IF;
  IF NOT EXISTS (SELECT 1 FROM "companies" WHERE LOWER("name") = 'cicr')     THEN RAISE EXCEPTION 'Compagnie CICR introuvable';     END IF;
  IF NOT EXISTS (SELECT 1 FROM "companies" WHERE LOWER("name") = 'yas')      THEN RAISE EXCEPTION 'Compagnie YAS introuvable';      END IF;
  IF NOT EXISTS (SELECT 1 FROM "companies" WHERE LOWER("name") = 'soroubat') THEN RAISE EXCEPTION 'Compagnie SOROUBAT introuvable'; END IF;

  -- Point de départ pour la numérotation JW-2026-XXXXX (0 si base propre)
  SELECT COUNT(*) INTO v_reservation_count FROM "reservations";

  -- ── Boucle sur les 13 lignes ───────────────────────────────────────
  FOR r IN SELECT * FROM tmp_import ORDER BY ord LOOP

    -- Résoudre chambre + catégorie
    SELECT "id", "categoryId" INTO v_room_id, v_cat_id
    FROM "rooms" WHERE "pmsRoomNo" = r.pms_room;
    IF v_room_id IS NULL THEN
      RAISE EXCEPTION 'Chambre PMS % introuvable', r.pms_room;
    END IF;
    IF v_cat_id IS NULL THEN
      RAISE EXCEPTION 'Chambre PMS % sans catégorie — corriger avant import', r.pms_room;
    END IF;

    -- Résoudre compagnie (NULL si client individuel)
    v_company_id := NULL;
    IF r.company_name IS NOT NULL THEN
      SELECT "id" INTO v_company_id FROM "companies" WHERE LOWER("name") = LOWER(r.company_name);
    END IF;

    -- Nombre de nuits
    v_nights := r.checkout - r.checkin;

    -- Prix catalogue par nuit : waterfall CompanyTarif > Category
    v_cat_per_night := NULL;
    IF v_company_id IS NOT NULL THEN
      SELECT
        CASE WHEN v_nights >= 30 THEN "tarifN30"
             WHEN v_nights >= 15 THEN "tarifN15"
             ELSE "tarifNuit" END
      INTO v_cat_per_night
      FROM "companyTarifs"
      WHERE "companyId" = v_company_id
        AND "categoryId" = v_cat_id
        AND (CASE WHEN v_nights >= 30 THEN "tarifN30"
                  WHEN v_nights >= 15 THEN "tarifN15"
                  ELSE "tarifNuit" END) > 0;
    END IF;
    IF v_cat_per_night IS NULL THEN
      SELECT
        CASE WHEN v_nights >= 30 THEN "tarifN30"
             WHEN v_nights >= 15 THEN "tarifN15"
             ELSE "tarifNuit" END
      INTO v_cat_per_night
      FROM "roomCategories" WHERE "id" = v_cat_id;
    END IF;
    IF v_cat_per_night IS NULL OR v_cat_per_night = 0 THEN
      RAISE EXCEPTION 'Prix catalogue absent pour room % (category %) — waterfall vide', r.pms_room, v_cat_id;
    END IF;

    v_cat_total := v_cat_per_night * v_nights;
    v_per_night := v_cat_per_night;

    -- Calcul discount pour matcher le prix négocié
    IF r.negociated_ht = 0 THEN
      -- HS gouvernance : gratuit → discount = tout
      v_discount := v_cat_total;
    ELSIF r.negociated_ht < v_cat_total THEN
      v_discount := v_cat_total - r.negociated_ht;
    ELSE
      -- Prix négocié ≥ catalogue → pas de discount (le catalogue est déjà le tarif)
      v_discount := 0;
    END IF;

    -- ── Insert client ─────────────────────────────────────────────────
    INSERT INTO "clients" ("firstName", "lastName", "companyId", "notes", "createdAt", "updatedAt")
    VALUES (r.prenom, r.nom, v_company_id, 'Import prod 2026-08-24', NOW(), NOW())
    RETURNING "id" INTO v_client_id;

    -- ── Génère référence JW-2026-XXXXX ────────────────────────────────
    v_reservation_count := v_reservation_count + 1;
    v_ref := 'JW-2026-' || LPAD(v_reservation_count::TEXT, 5, '0');

    -- ── Insert reservation (CheckedIn) ────────────────────────────────
    INSERT INTO "reservations" (
      "reference", "roomId", "categoryId", "clientId",
      "checkInDate", "checkOutDate", "nights", "adults", "children",
      "pricePerNightSnapshot", "totalPrice", "discount", "currency",
      "status", "source", "internalNotes", "tvaExonere",
      "confirmedAt", "createdAt", "updatedAt"
    ) VALUES (
      v_ref, v_room_id, v_cat_id, v_client_id,
      r.checkin, r.checkout, v_nights, 1, 0,
      v_per_night, r.negociated_ht, v_discount, 'XOF',
      'CheckedIn', 'phone', r.internal_note, false,
      NOW(), NOW(), NOW()
    ) RETURNING "id" INTO v_resa_id;

    -- ── Génère numéro folio FL-2026-XXXX (via hotelConfig.resaSeq) ────
    UPDATE "hotelConfig" SET "resaSeq" = "resaSeq" + 1 WHERE "id" = 1
    RETURNING "resaSeq" INTO v_seq;
    v_folio_num := 'FL-2026-' || LPAD(v_seq::TEXT, 4, '0');

    -- ── Insert folio (CheckedIn, ouvert) ──────────────────────────────
    INSERT INTO "folios" (
      "number", "unitId",
      "guest", "nom", "prenom", "societe",
      "segment", "pax", "arrival", "departure",
      "rate", "heb", "tarifTier", "elecIncluded",
      "pdjParJour", "pdjPrix", "kwh", "debiteur", "dependances",
      "arrhes", "paid",
      "tvaExonere",
      "resaStatus", "checkedIn", "closed", "note",
      "createdAt", "updatedAt",
      "reservationId"
    ) VALUES (
      v_folio_num, v_room_id,
      TRIM(BOTH ' ' FROM COALESCE(r.prenom, '') || ' ' || COALESCE(r.nom, '')),
      r.nom, r.prenom, r.company_name,
      'Direct', 1, r.checkin, r.checkout,
      v_per_night, 0, r.tarif_tier, r.elec_incluse,
      0, 0, 0, 0, 0,
      0, 0,
      false,
      'Confirmee', true, false, COALESCE(r.internal_note, ''),
      NOW(), NOW(),
      v_resa_id
    );

    RAISE NOTICE 'Ch % : % % (% nuits) → catalogue %/nuit, négocié %, discount %',
      r.pms_room, r.prenom, r.nom, v_nights, v_cat_per_night, r.negociated_ht, v_discount;

  END LOOP;

END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════
-- Vérifications post-import
-- ═══════════════════════════════════════════════════════════════════════
\echo '── 13 clients + 13 réservations + 13 folios attendus ──────────────'
SELECT 'clients' AS tbl, COUNT(*) FROM "clients"
UNION ALL SELECT 'reservations', COUNT(*) FROM "reservations"
UNION ALL SELECT 'folios', COUNT(*) FROM "folios";

\echo '── Détail des occupations importées ────────────────────────────────'
SELECT
  res."reference",
  rm."pmsRoomNo" AS ch,
  cl."firstName", cl."lastName",
  co."name" AS compagnie,
  res."checkInDate", res."checkOutDate", res."nights",
  res."pricePerNightSnapshot" AS "prix_cat_nuit",
  res."discount",
  res."totalPrice" AS "total_ht",
  f."number" AS folio, f."elecIncluded", f."tarifTier"
FROM "reservations" res
JOIN "rooms" rm ON rm."id" = res."roomId"
JOIN "clients" cl ON cl."id" = res."clientId"
LEFT JOIN "companies" co ON co."id" = cl."companyId"
LEFT JOIN "folios" f ON f."reservationId" = res."id"
ORDER BY rm."pmsRoomNo";

\echo '── hotelConfig.resaSeq (devrait être 13) ───────────────────────────'
SELECT "resaSeq", "factureSeq", "dateHotel" FROM "hotelConfig" WHERE "id" = 1;
