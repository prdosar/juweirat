-- ============================================================
-- Juweirat – Seed Data
-- Run AFTER: dotnet ef database update
-- ============================================================

-- Default user / Sender (email: contact@juweirat.com, password: Juweirat2026)
INSERT INTO "users" ("email", "passwordHash", "firstName", "lastName", "role", "isActive", "createdAt", "updatedAt")
VALUES (
    'contact@juweirat.com',
    '$2a$11$9G76DNtcLRNOeB38lmY2uO.amoxv4mEJwBW5cMwy3vH960en4RBfm',
    'Contact',
    'Juweirat',
    'Admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- Admin user (password: Admin@2026!)
INSERT INTO "users" ("email", "passwordHash", "firstName", "lastName", "role", "isActive", "createdAt", "updatedAt")
VALUES (
    'admin@juweirat.com',
    '$2a$11$Y4BuQRtsMlFkcORIfC7ch.pJiC/Sebr/noJcbZVWb/768oS/FHVZK',
    'Admin',
    'Juweirat',
    'Admin',
    true,
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- Amenities
INSERT INTO "amenities" ("nameFr", "nameEn", "icon", "createdAt") VALUES
    ('Wi-Fi Haut Débit',    'High-Speed Wi-Fi',  'wifi',            NOW()),
    ('Climatisation',        'Air Conditioning',  'wind',            NOW()),
    ('Télévision',           'Television',         'tv',              NOW()),
    ('Cuisine équipée',      'Equipped Kitchen',   'utensils',        NOW()),
    ('Parking Couvert',      'Covered Parking',    'car',             NOW()),
    ('Sécurité 24h/24',      '24h Security',       'shield',          NOW()),
    ('Eau Chaude',           'Hot Water',          'droplets',        NOW()),
    ('Vue Panoramique',      'Panoramic View',     'mountain',        NOW()),
    ('Balcon',               'Balcony',            'door-open',       NOW()),
    ('Machine à laver',      'Washing Machine',    'washing-machine', NOW())
ON CONFLICT DO NOTHING;

-- Rooms – 2ème étage (4 appartements)
INSERT INTO "rooms" ("roomNumber", "floor", "nameFr", "nameEn", "descriptionFr", "descriptionEn",
    "capacityAdults", "capacityChildren", "sizeSqm", "pricePerNight", "pricePerWeek", "pricePerMonth",
    "status", "isFeatured", "createdAt", "updatedAt")
VALUES
    ('201', 2, 'Appartement Horizon',   'Horizon Apartment',
     'Appartement confortable au 2ème étage avec vue dégagée.',
     'Comfortable apartment on the 2nd floor with open views.',
     3, 1, 65, 45000, 270000, 900000, 'Available', false, NOW(), NOW()),
    ('202', 2, 'Appartement Sérénité',  'Serenity Apartment',
     'Espace lumineux et moderne, idéal pour les séjours prolongés.',
     'Bright and modern space, ideal for extended stays.',
     2, 0, 55, 40000, 240000, 800000, 'Available', false, NOW(), NOW()),
    ('203', 2, 'Appartement Élégance',  'Elegance Apartment',
     'Intérieur soigné avec décoration contemporaine.',
     'Carefully designed interior with contemporary decoration.',
     4, 2, 75, 55000, 330000, 1100000, 'Available', false, NOW(), NOW()),
    ('204', 2, 'Appartement Confort',   'Comfort Apartment',
     'Un havre de paix pour se ressourcer à Lomé.',
     'A haven of peace to recharge in Lomé.',
     2, 1, 60, 42000, 250000, 850000, 'Available', false, NOW(), NOW()),

-- Rooms – 4ème étage (6 appartements)
    ('401', 4, 'Suite Atlantique',       'Atlantic Suite',
     'Magnifique suite avec vue sur la ville depuis le 4ème étage.',
     'Magnificent suite with city views from the 4th floor.',
     3, 1, 80, 65000, 390000, 1300000, 'Available', true, NOW(), NOW()),
    ('402', 4, 'Appartement Lumière',   'Light Apartment',
     'Baigné de lumière naturelle, espace ouvert et chaleureux.',
     'Bathed in natural light, open and warm space.',
     2, 0, 60, 45000, 270000, 900000, 'Available', false, NOW(), NOW()),
    ('403', 4, 'Appartement Prestige',  'Prestige Apartment',
     'Notre appartement prestige avec finitions haut de gamme.',
     'Our prestige apartment with high-end finishes.',
     4, 2, 90, 75000, 450000, 1500000, 'Available', true, NOW(), NOW()),
    ('404', 4, 'Appartement Jasmin',    'Jasmine Apartment',
     'Décoration florale et atmosphère apaisante.',
     'Floral decoration and soothing atmosphere.',
     3, 1, 70, 55000, 330000, 1100000, 'Available', false, NOW(), NOW()),
    ('405', 4, 'Appartement Ivoire',    'Ivory Apartment',
     'Tons naturels et espaces généreux pour votre confort.',
     'Natural tones and generous spaces for your comfort.',
     2, 1, 65, 48000, 288000, 960000, 'Available', false, NOW(), NOW()),
    ('406', 4, 'Appartement Palme',     'Palm Apartment',
     'Style tropical élégant, en plein cœur de Lomé.',
     'Elegant tropical style, in the heart of Lomé.',
     3, 2, 75, 58000, 348000, 1160000, 'Available', false, NOW(), NOW()),

-- Rooms – 5ème étage (6 appartements)
    ('501', 5, 'Suite Panorama',         'Panorama Suite',
     'Vue à 360° sur Lomé depuis notre suite signature.',
     '360° views of Lomé from our signature suite.',
     4, 2, 100, 90000, 540000, 1800000, 'Available', true, NOW(), NOW()),
    ('502', 5, 'Appartement Émeraude',  'Emerald Apartment',
     'Tons verts et esprit nature pour une expérience unique.',
     'Green tones and nature spirit for a unique experience.',
     3, 1, 80, 65000, 390000, 1300000, 'Available', false, NOW(), NOW()),
    ('503', 5, 'Appartement Azur',      'Azure Apartment',
     'Décor inspiré par l''océan et les teintes bleues.',
     'Decor inspired by the ocean and blue tones.',
     2, 0, 70, 60000, 360000, 1200000, 'Available', false, NOW(), NOW()),
    ('504', 5, 'Appartement Soleil',    'Sun Apartment',
     'Chaleureux et lumineux, parfait pour les familles.',
     'Warm and bright, perfect for families.',
     4, 3, 95, 80000, 480000, 1600000, 'Available', false, NOW(), NOW()),
    ('505', 5, 'Suite Executive',        'Executive Suite',
     'Espace de travail intégré pour les voyageurs d''affaires.',
     'Integrated workspace for business travelers.',
     2, 0, 85, 85000, 510000, 1700000, 'Available', true, NOW(), NOW()),
    ('506', 5, 'Appartement Tropical',  'Tropical Apartment',
     'Ambiance tropicale raffinée avec terrasse privée.',
     'Refined tropical ambiance with private terrace.',
     3, 1, 80, 70000, 420000, 1400000, 'Available', false, NOW(), NOW()),

-- Rooms – 6ème étage (2 appartements + terrasse)
    ('601', 6, 'Suite Royale',           'Royal Suite',
     'Notre suite la plus exclusive avec accès privilégié à la terrasse.',
     'Our most exclusive suite with privileged access to the terrace.',
     4, 2, 120, 120000, 720000, 2400000, 'Available', true, NOW(), NOW()),
    ('602', 6, 'Penthouse Juweirat',     'Juweirat Penthouse',
     'Le summum du luxe au 6ème étage, vue imprenable et terrasse partagée.',
     'The pinnacle of luxury on the 6th floor, breathtaking view and shared terrace.',
     4, 2, 130, 130000, 780000, 2600000, 'Available', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- Catégories de chambres (9 catégories T1-T4 × standard/supérieure/privilège/suite)
-- ============================================================

INSERT INTO "roomCategories"
    ("slug","pmsType","pmsGamme","nameFr","nameEn",
     "descriptionFr","descriptionEn",
     "capacityAdults","capacityChildren",
     "tarifNuit","tarifN15","tarifN30","createdAt","updatedAt")
VALUES
    ('t1-standard',   'T1','standard',   'Studio Standard',        'Standard Studio',
     'Studio fonctionnel idéal pour un voyageur solo ou en couple.',
     'Functional studio ideal for solo or couple travelers.',
     2,0,30000,13000,10000,NOW(),NOW()),
    ('t2-standard',   'T2','standard',   'Appartement T2 Standard','Standard T2 Apartment',
     'Appartement 2 pièces confortable pour les séjours standards.',
     'Comfortable 2-room apartment for standard stays.',
     3,1,40000,20000,15000,NOW(),NOW()),
    ('t3-standard',   'T3','standard',   'Appartement T3 Standard','Standard T3 Apartment',
     'Grand appartement 3 pièces pour les familles ou groupes.',
     'Large 3-room apartment for families or groups.',
     4,2,65000,30000,25000,NOW(),NOW()),
    ('t1-superieure', 'T1','supérieure', 'Studio Supérieur',       'Superior Studio',
     'Studio supérieur avec finitions de qualité.',
     'Superior studio with quality finishes.',
     2,0,35000,16000,13333,NOW(),NOW()),
    ('t2-superieure', 'T2','supérieure', 'Appartement T2 Supérieur','Superior T2 Apartment',
     'Appartement 2 pièces supérieur avec équipements haut de gamme.',
     'Superior 2-room apartment with high-end amenities.',
     3,1,45000,20000,16667,NOW(),NOW()),
    ('t3-superieure', 'T3','supérieure', 'Appartement T3 Supérieur','Superior T3 Apartment',
     'Grand appartement 3 pièces supérieur, idéal pour familles exigeantes.',
     'Large superior 3-room apartment, ideal for discerning families.',
     4,2,80000,34000,30000,NOW(),NOW()),
    ('t1-privilege',  'T1','privilège',  'Studio Privilège',       'Privilege Studio',
     'Studio privilège avec services exclusifs.',
     'Privilege studio with exclusive services.',
     2,0,40000,20000,15000,NOW(),NOW()),
    ('t2-privilege',  'T2','privilège',  'Appartement T2 Privilège','Privilege T2 Apartment',
     'Appartement 2 pièces haut de gamme avec prestations privilège.',
     'High-end 2-room apartment with privilege services.',
     3,1,55000,25000,23333,NOW(),NOW()),
    ('t4-suite',      'T4','suite',      'Suite',                  'Suite',
     'Suite d''exception au sommet de la résidence, vue panoramique.',
     'Exceptional suite at the top of the residence, panoramic view.',
     4,2,95000,54000,50000,NOW(),NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- Grille tarifaire officielle Juweirat (août 2026)
-- tarifN15 / pricePerWeek  = tarif/nuit pour séjours 15–29 nuits (hors élec)
-- tarifN30 / pricePerMonth = tarif/nuit pour séjours ≥ 30 nuits  (hors élec)
-- ============================================================

-- Étage 2
UPDATE rooms SET "pmsRoomNo"='22',"pmsType"='T2',"pmsGamme"='supérieure',
    "tarifNuit"=45000,"tarifN15"=22000,"tarifN30"=20000,
    "pricePerNight"=45000,"pricePerWeek"=22000,"pricePerMonth"=20000,
    "planRow"=0,"planCol"=0 WHERE "roomNumber"='201';
UPDATE rooms SET "pmsRoomNo"='23',"pmsType"='T3',"pmsGamme"='supérieure',
    "tarifNuit"=80000,"tarifN15"=34000,"tarifN30"=30000,
    "pricePerNight"=80000,"pricePerWeek"=34000,"pricePerMonth"=30000,
    "planRow"=0,"planCol"=1 WHERE "roomNumber"='202';
UPDATE rooms SET "pmsRoomNo"='24',"pmsType"='T3',"pmsGamme"='supérieure',
    "tarifNuit"=80000,"tarifN15"=34000,"tarifN30"=30000,
    "pricePerNight"=80000,"pricePerWeek"=34000,"pricePerMonth"=30000,
    "planRow"=1,"planCol"=0 WHERE "roomNumber"='203';
UPDATE rooms SET "pmsRoomNo"='25',"pmsType"='T2',"pmsGamme"='privilège',
    "tarifNuit"=55000,"tarifN15"=25000,"tarifN30"=23333,
    "pricePerNight"=55000,"pricePerWeek"=25000,"pricePerMonth"=23333,
    "planRow"=1,"planCol"=1 WHERE "roomNumber"='204';

-- Étage 4
UPDATE rooms SET "pmsRoomNo"='41',"pmsType"='T1',"pmsGamme"='standard',
    "tarifNuit"=30000,"tarifN15"=13000,"tarifN30"=10000,
    "pricePerNight"=30000,"pricePerWeek"=13000,"pricePerMonth"=10000,
    "planRow"=0,"planCol"=0 WHERE "roomNumber"='401';
UPDATE rooms SET "pmsRoomNo"='42',"pmsType"='T2',"pmsGamme"='standard',
    "tarifNuit"=40000,"tarifN15"=20000,"tarifN30"=15000,
    "pricePerNight"=40000,"pricePerWeek"=20000,"pricePerMonth"=15000,
    "planRow"=0,"planCol"=1 WHERE "roomNumber"='402';
UPDATE rooms SET "pmsRoomNo"='43',"pmsType"='T3',"pmsGamme"='standard',
    "tarifNuit"=65000,"tarifN15"=30000,"tarifN30"=25000,
    "pricePerNight"=65000,"pricePerWeek"=30000,"pricePerMonth"=25000,
    "planRow"=1,"planCol"=0 WHERE "roomNumber"='403';
UPDATE rooms SET "pmsRoomNo"='44',"pmsType"='T3',"pmsGamme"='standard',
    "tarifNuit"=65000,"tarifN15"=30000,"tarifN30"=25000,
    "pricePerNight"=65000,"pricePerWeek"=30000,"pricePerMonth"=25000,
    "planRow"=1,"planCol"=1 WHERE "roomNumber"='404';
UPDATE rooms SET "pmsRoomNo"='45',"pmsType"='T2',"pmsGamme"='supérieure',
    "tarifNuit"=45000,"tarifN15"=20000,"tarifN30"=16667,
    "pricePerNight"=45000,"pricePerWeek"=20000,"pricePerMonth"=16667,
    "planRow"=2,"planCol"=0 WHERE "roomNumber"='405';
UPDATE rooms SET "pmsRoomNo"='46',"pmsType"='T1',"pmsGamme"='supérieure',
    "tarifNuit"=35000,"tarifN15"=16000,"tarifN30"=13333,
    "pricePerNight"=35000,"pricePerWeek"=16000,"pricePerMonth"=13333,
    "planRow"=2,"planCol"=1 WHERE "roomNumber"='406';

-- Étage 5
UPDATE rooms SET "pmsRoomNo"='51',"pmsType"='T1',"pmsGamme"='standard',
    "tarifNuit"=30000,"tarifN15"=14000,"tarifN30"=10000,
    "pricePerNight"=30000,"pricePerWeek"=14000,"pricePerMonth"=10000,
    "planRow"=0,"planCol"=0 WHERE "roomNumber"='501';
UPDATE rooms SET "pmsRoomNo"='52',"pmsType"='T2',"pmsGamme"='standard',
    "tarifNuit"=40000,"tarifN15"=20000,"tarifN30"=15000,
    "pricePerNight"=40000,"pricePerWeek"=20000,"pricePerMonth"=15000,
    "planRow"=0,"planCol"=1 WHERE "roomNumber"='502';
UPDATE rooms SET "pmsRoomNo"='53',"pmsType"='T3',"pmsGamme"='standard',
    "tarifNuit"=65000,"tarifN15"=30000,"tarifN30"=25000,
    "pricePerNight"=65000,"pricePerWeek"=30000,"pricePerMonth"=25000,
    "planRow"=1,"planCol"=0 WHERE "roomNumber"='503';
UPDATE rooms SET "pmsRoomNo"='54',"pmsType"='T3',"pmsGamme"='standard',
    "tarifNuit"=65000,"tarifN15"=30000,"tarifN30"=25000,
    "pricePerNight"=65000,"pricePerWeek"=30000,"pricePerMonth"=25000,
    "planRow"=1,"planCol"=1 WHERE "roomNumber"='504';
UPDATE rooms SET "pmsRoomNo"='55',"pmsType"='T2',"pmsGamme"='supérieure',
    "tarifNuit"=45000,"tarifN15"=20000,"tarifN30"=16667,
    "pricePerNight"=45000,"pricePerWeek"=20000,"pricePerMonth"=16667,
    "planRow"=2,"planCol"=0 WHERE "roomNumber"='505';
UPDATE rooms SET "pmsRoomNo"='56',"pmsType"='T1',"pmsGamme"='supérieure',
    "tarifNuit"=35000,"tarifN15"=16000,"tarifN30"=13333,
    "pricePerNight"=35000,"pricePerWeek"=16000,"pricePerMonth"=13333,
    "planRow"=2,"planCol"=1 WHERE "roomNumber"='506';

-- Étage 6
UPDATE rooms SET "pmsRoomNo"='61',"pmsType"='T1',"pmsGamme"='privilège',
    "tarifNuit"=40000,"tarifN15"=20000,"tarifN30"=15000,
    "pricePerNight"=40000,"pricePerWeek"=20000,"pricePerMonth"=15000,
    "planRow"=0,"planCol"=0 WHERE "roomNumber"='601';
UPDATE rooms SET "pmsRoomNo"='67',"pmsType"='T4',"pmsGamme"='suite',
    "tarifNuit"=95000,"tarifN15"=54000,"tarifN30"=50000,
    "pricePerNight"=95000,"pricePerWeek"=54000,"pricePerMonth"=50000,
    "planRow"=0,"planCol"=1 WHERE "roomNumber"='602';

-- Assigner les catégories aux chambres
UPDATE "rooms" SET "categoryId" = (SELECT id FROM "roomCategories" WHERE slug = 't1-standard')   WHERE "pmsType" = 'T1' AND "pmsGamme" = 'standard';
UPDATE "rooms" SET "categoryId" = (SELECT id FROM "roomCategories" WHERE slug = 't2-standard')   WHERE "pmsType" = 'T2' AND "pmsGamme" = 'standard';
UPDATE "rooms" SET "categoryId" = (SELECT id FROM "roomCategories" WHERE slug = 't3-standard')   WHERE "pmsType" = 'T3' AND "pmsGamme" = 'standard';
UPDATE "rooms" SET "categoryId" = (SELECT id FROM "roomCategories" WHERE slug = 't1-superieure') WHERE "pmsType" = 'T1' AND "pmsGamme" = 'supérieure';
UPDATE "rooms" SET "categoryId" = (SELECT id FROM "roomCategories" WHERE slug = 't2-superieure') WHERE "pmsType" = 'T2' AND "pmsGamme" = 'supérieure';
UPDATE "rooms" SET "categoryId" = (SELECT id FROM "roomCategories" WHERE slug = 't3-superieure') WHERE "pmsType" = 'T3' AND "pmsGamme" = 'supérieure';
UPDATE "rooms" SET "categoryId" = (SELECT id FROM "roomCategories" WHERE slug = 't1-privilege')  WHERE "pmsType" = 'T1' AND "pmsGamme" = 'privilège';
UPDATE "rooms" SET "categoryId" = (SELECT id FROM "roomCategories" WHERE slug = 't2-privilege')  WHERE "pmsType" = 'T2' AND "pmsGamme" = 'privilège';
UPDATE "rooms" SET "categoryId" = (SELECT id FROM "roomCategories" WHERE slug = 't4-suite')      WHERE "pmsType" = 'T4' AND "pmsGamme" = 'suite';

-- Link all rooms with base amenities (Wifi, AC, TV, Kitchen, Parking, Security, HotWater)
-- We use a subquery to get amenity IDs by name
DO $$
DECLARE
    r RECORD;
    a RECORD;
    base_amenities TEXT[] := ARRAY['Wi-Fi Haut Débit', 'Climatisation', 'Télévision', 'Cuisine équipée', 'Parking Couvert', 'Sécurité 24h/24', 'Eau Chaude'];
BEGIN
    FOR r IN SELECT id FROM "rooms" LOOP
        FOR a IN SELECT id FROM "amenities" WHERE "nameFr" = ANY(base_amenities) LOOP
            INSERT INTO "roomAmenities" ("roomsId", "amenitiesId")
            VALUES (r.id, a.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- Add "Vue Panoramique" to floors 5 and 6
DO $$
DECLARE
    r RECORD;
    amenity_id BIGINT;
BEGIN
    SELECT id INTO amenity_id FROM "amenities" WHERE "nameFr" = 'Vue Panoramique';
    FOR r IN SELECT id FROM "rooms" WHERE "floor" >= 5 LOOP
        INSERT INTO "roomAmenities" ("roomsId", "amenitiesId")
        VALUES (r.id, amenity_id)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
