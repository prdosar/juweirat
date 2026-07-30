-- ============================================================
-- Juweirat – Seed Data
-- Run AFTER: dotnet ef database update
-- ============================================================

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
