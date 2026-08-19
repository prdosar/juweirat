-- =============================================================================
-- Seed Compagnies + Réservations en cours — Résidence Juweirat
-- =============================================================================
-- Idempotent : peut être ré-exécuté sans doublons.
--   - Compagnies : dédup par nom exact
--   - Clients    : dédup par (companyId, notes = 'SEED-APT-XX')
--   - Réservations : dédup par référence unique 'SEED-APT-XX-2026'
--
-- Statut « HS » de l'apt 67 (Abdoul Tidjani) : UPDATE idempotent.
--
-- Rooms lookup : par colonne roomNumber (texte). Si un apt n'existe pas en base,
--   un NOTICE est émis et la ligne est ignorée. Adapter les numéros si votre
--   convention diffère (ex. '42' vs '402').
--
-- Rates :
--   - 600 000 FCFA/mois → per-night = 600000 * 12 / 365 ≈ 19726
--   - 900 000 FCFA/mois → per-night = 900000 * 12 / 365 ≈ 29589
--   - Rates inconnus (???) : perNight = 0, totalPrice = 0,
--     internalNotes = 'Tarif à confirmer'. La retenue no-show/annulation
--     se calculera à 0 tant que le tarif n'est pas renseigné.
--
-- Résas ignorées (période inconnue) : Apt 52 Ahmed, Apt 54 SOROBAT, Apt 25 CICR
-- =============================================================================

BEGIN;

-- ─── 1. Compagnies ──────────────────────────────────────────────────────────
INSERT INTO companies (name, "isActive", "createdAt", "updatedAt")
SELECT 'Yas',      TRUE, NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = 'Yas');
INSERT INTO companies (name, "isActive", "createdAt", "updatedAt")
SELECT 'BESSAC',   TRUE, NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = 'BESSAC');
INSERT INTO companies (name, "isActive", "createdAt", "updatedAt")
SELECT 'CICR',     TRUE, NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = 'CICR');
INSERT INTO companies (name, "isActive", "createdAt", "updatedAt")
SELECT 'SOROBAT',  TRUE, NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = 'SOROBAT');

-- ─── 2. Apt 67 : Hors Service (Abdoul Tidjani) ─────────────────────────────
UPDATE rooms
SET "horsService"  = TRUE,
    "statutMenage" = 'Occupé',
    "updatedAt"    = NOW()
WHERE "roomNumber" = '67';

-- ─── 3. Fonction d'aide : upsert client + résa pour un apt ──────────────────
-- On utilise un DO block avec une table (VALUES ...) plutôt qu'une fonction
-- pour rester simple à lire et pouvoir logger via RAISE NOTICE.
DO $$
DECLARE
    v_apt         text;
    v_company     text;
    v_check_in    date;
    v_check_out   date;
    v_monthly     int;      -- 0 si tarif inconnu
    v_room_id     bigint;
    v_category_id bigint;
    v_company_id  bigint;
    v_client_id   bigint;
    v_nights      int;
    v_total       numeric(10,2);
    v_per_night   numeric(10,2);
    v_notes       text;
    v_seed_marker text;
    v_reference   text;
    v_default_cat bigint;
BEGIN
    -- Catégorie par défaut (fallback si la chambre n'a pas de categoryId)
    SELECT id INTO v_default_cat FROM "roomCategories" ORDER BY id LIMIT 1;

    FOR v_apt, v_company, v_check_in, v_check_out, v_monthly IN
        SELECT * FROM (VALUES
            ('42', 'Yas',     DATE '2026-06-15', DATE '2027-06-14',  600000),
            ('43', 'Yas',     DATE '2026-06-15', DATE '2027-06-14',  900000),
            ('44', 'BESSAC',  DATE '2026-01-08', DATE '2027-01-07',       0),  -- ???
            ('45', 'BESSAC',  DATE '2026-01-17', DATE '2027-01-16',       0),  -- ???
            ('46', 'CICR',    DATE '2026-08-12', DATE '2026-08-18',       0),  -- ???
            ('53', 'Yas',     DATE '2026-06-15', DATE '2027-06-14',       0),  -- ???
            ('55', 'CICR',    DATE '2026-03-01', DATE '2027-02-28',       0),  -- ???
            ('61', 'Yas',     DATE '2026-06-15', DATE '2027-06-14',  600000),
            ('22', 'CICR',    DATE '2026-08-18', DATE '2026-08-20',       0),  -- ???
            ('23', 'BESSAC',  DATE '2026-02-25', DATE '2027-02-24',  900000),
            ('24', 'BESSAC',  DATE '2026-02-25', DATE '2027-02-24',  900000)
        ) AS t(apt, company, ci, co, monthly)
    LOOP
        -- Lookup room
        SELECT id, COALESCE("categoryId", v_default_cat)
          INTO v_room_id, v_category_id
          FROM rooms
         WHERE "roomNumber" = v_apt
         LIMIT 1;

        IF v_room_id IS NULL THEN
            RAISE NOTICE '[SEED] Apt % introuvable dans rooms (colonne roomNumber). Ignoré.', v_apt;
            CONTINUE;
        END IF;

        -- Lookup company
        SELECT id INTO v_company_id FROM companies WHERE name = v_company LIMIT 1;
        IF v_company_id IS NULL THEN
            RAISE NOTICE '[SEED] Compagnie % introuvable. Résa apt % ignorée.', v_company, v_apt;
            CONTINUE;
        END IF;

        -- Marker de dédup (stocké dans clients.notes ET reservations.reference)
        v_seed_marker := 'SEED-APT-' || v_apt;
        v_reference   := 'SEED-APT-' || v_apt || '-' || to_char(v_check_in, 'YYYY');

        -- Client placeholder (nom "Client" à modifier plus tard)
        SELECT id INTO v_client_id
          FROM clients
         WHERE notes = v_seed_marker
         LIMIT 1;

        IF v_client_id IS NULL THEN
            INSERT INTO clients ("firstName", "lastName", "companyId", notes, "createdAt", "updatedAt")
            VALUES ('Client', v_company || ' — Apt ' || v_apt, v_company_id, v_seed_marker, NOW(), NOW())
            RETURNING id INTO v_client_id;
            RAISE NOTICE '[SEED] Client créé pour apt % (%) → id=%', v_apt, v_company, v_client_id;
        ELSE
            -- rattacher au cas où la compagnie a changé
            UPDATE clients SET "companyId" = v_company_id, "updatedAt" = NOW()
             WHERE id = v_client_id;
        END IF;

        -- Compute nights + prices
        v_nights := (v_check_out - v_check_in)::int;
        IF v_monthly > 0 THEN
            -- Total = mensualité * 12 pour un séjour ~1 an ;
            -- pour un séjour partiel : monthly * nights / 30.
            IF v_nights BETWEEN 350 AND 380 THEN
                v_total := (v_monthly::numeric * 12);
            ELSE
                v_total := ROUND((v_monthly::numeric * v_nights) / 30, 2);
            END IF;
            v_per_night := ROUND(v_total / v_nights, 2);
            v_notes := 'Tarif négocié : ' || to_char(v_monthly, 'FM999G999G999') || ' FCFA/mois (' || v_company || ')';
        ELSE
            v_total     := 0;
            v_per_night := 0;
            v_notes     := 'Tarif à confirmer (' || v_company || ')';
        END IF;

        -- Insert reservation (idempotent par reference)
        INSERT INTO reservations (
            reference, "roomId", "clientId", "categoryId",
            "checkInDate", "checkOutDate", nights,
            adults, children,
            "pricePerNightSnapshot", "totalPrice", currency,
            status, source, "internalNotes",
            "confirmedAt", "createdAt", "updatedAt"
        )
        SELECT
            v_reference, v_room_id, v_client_id, v_category_id,
            v_check_in, v_check_out, v_nights,
            1, 0,
            v_per_night, v_total, 'XOF',
            'Confirmed', 'admin-seed', v_notes,
            NOW(), NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM reservations WHERE reference = v_reference);

        IF FOUND THEN
            RAISE NOTICE '[SEED] Résa apt % (%) créée : % nuits, % FCFA total', v_apt, v_company, v_nights, v_total;
        ELSE
            RAISE NOTICE '[SEED] Résa apt % (%) déjà présente, ignorée.', v_apt, v_company;
        END IF;
    END LOOP;
END $$;

-- ─── 4. Récapitulatif ──────────────────────────────────────────────────────
DO $$
DECLARE
    v_cnt_companies   int;
    v_cnt_clients     int;
    v_cnt_reservations int;
BEGIN
    SELECT COUNT(*) INTO v_cnt_companies   FROM companies WHERE name IN ('Yas','BESSAC','CICR','SOROBAT');
    SELECT COUNT(*) INTO v_cnt_clients     FROM clients WHERE notes LIKE 'SEED-APT-%';
    SELECT COUNT(*) INTO v_cnt_reservations FROM reservations WHERE reference LIKE 'SEED-APT-%';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE '  Compagnies présentes : %', v_cnt_companies;
    RAISE NOTICE '  Clients seedés       : %', v_cnt_clients;
    RAISE NOTICE '  Réservations seedées : %', v_cnt_reservations;
    RAISE NOTICE '════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  À faire manuellement :';
    RAISE NOTICE '   - Apt 52 (Ahmed, 1 mois — dates non précisées)';
    RAISE NOTICE '   - Apt 54 (SOROBAT, 1 an — période non précisée)';
    RAISE NOTICE '   - Apt 25 (CICR, 1 an — période non précisée)';
    RAISE NOTICE '   - Tarifs des résas marquées « Tarif à confirmer »';
    RAISE NOTICE '   - Renommer les clients "Client" avec les vraies identités';
END $$;

COMMIT;
