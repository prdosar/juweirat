using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Juweirat.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRoomCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Create roomCategories table ─────────────────────────────────────
            migrationBuilder.CreateTable(
                name: "roomCategories",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    slug = table.Column<string>(type: "text", nullable: false),
                    pmsType = table.Column<string>(type: "text", nullable: false),
                    pmsGamme = table.Column<string>(type: "text", nullable: false),
                    nameFr = table.Column<string>(type: "text", nullable: false),
                    nameEn = table.Column<string>(type: "text", nullable: false),
                    descriptionFr = table.Column<string>(type: "text", nullable: true),
                    descriptionEn = table.Column<string>(type: "text", nullable: true),
                    capacityAdults = table.Column<int>(type: "integer", nullable: false),
                    capacityChildren = table.Column<int>(type: "integer", nullable: false),
                    tarifNuit = table.Column<int>(type: "integer", nullable: false),
                    tarifN15 = table.Column<int>(type: "integer", nullable: false),
                    tarifN30 = table.Column<int>(type: "integer", nullable: false),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                },
                constraints: table => table.PrimaryKey("PK_roomCategories", x => x.id));

            migrationBuilder.CreateIndex(
                name: "IX_roomCategories_slug",
                table: "roomCategories",
                column: "slug",
                unique: true);

            // ── 2. Seed 9 categories from the official tariff grid ─────────────────
            migrationBuilder.Sql(@"
                INSERT INTO ""roomCategories""
                    (""slug"", ""pmsType"", ""pmsGamme"", ""nameFr"", ""nameEn"",
                     ""descriptionFr"", ""descriptionEn"",
                     ""capacityAdults"", ""capacityChildren"",
                     ""tarifNuit"", ""tarifN15"", ""tarifN30"",
                     ""createdAt"", ""updatedAt"")
                VALUES
                    ('t1-standard',   'T1', 'standard',   'Studio Standard',       'Standard Studio',
                     'Studio fonctionnel idéal pour un voyageur solo ou en couple.',
                     'Functional studio ideal for solo or couple travelers.',
                     2, 0, 30000, 13000, 10000, NOW(), NOW()),

                    ('t2-standard',   'T2', 'standard',   'Appartement T2 Standard', 'Standard T2 Apartment',
                     'Appartement 2 pièces confortable pour les séjours standards.',
                     'Comfortable 2-room apartment for standard stays.',
                     3, 1, 40000, 20000, 15000, NOW(), NOW()),

                    ('t3-standard',   'T3', 'standard',   'Appartement T3 Standard', 'Standard T3 Apartment',
                     'Grand appartement 3 pièces pour les familles ou groupes.',
                     'Large 3-room apartment for families or groups.',
                     4, 2, 65000, 30000, 25000, NOW(), NOW()),

                    ('t1-superieure', 'T1', 'supérieure', 'Studio Supérieur',       'Superior Studio',
                     'Studio supérieur avec finitions de qualité.',
                     'Superior studio with quality finishes.',
                     2, 0, 35000, 16000, 13333, NOW(), NOW()),

                    ('t2-superieure', 'T2', 'supérieure', 'Appartement T2 Supérieur', 'Superior T2 Apartment',
                     'Appartement 2 pièces supérieur avec équipements haut de gamme.',
                     'Superior 2-room apartment with high-end amenities.',
                     3, 1, 45000, 20000, 16667, NOW(), NOW()),

                    ('t3-superieure', 'T3', 'supérieure', 'Appartement T3 Supérieur', 'Superior T3 Apartment',
                     'Grand appartement 3 pièces supérieur, idéal pour familles exigeantes.',
                     'Large superior 3-room apartment, ideal for discerning families.',
                     4, 2, 80000, 34000, 30000, NOW(), NOW()),

                    ('t1-privilege',  'T1', 'privilège',  'Studio Privilège',       'Privilege Studio',
                     'Studio privilège avec services exclusifs.',
                     'Privilege studio with exclusive services.',
                     2, 0, 40000, 20000, 15000, NOW(), NOW()),

                    ('t2-privilege',  'T2', 'privilège',  'Appartement T2 Privilège', 'Privilege T2 Apartment',
                     'Appartement 2 pièces haut de gamme avec prestations privilège.',
                     'High-end 2-room apartment with privilege services.',
                     3, 1, 55000, 25000, 23333, NOW(), NOW()),

                    ('t4-suite',      'T4', 'suite',      'Suite',                  'Suite',
                     'Suite d''exception au sommet de la résidence, vue panoramique.',
                     'Exceptional suite at the top of the residence, panoramic view.',
                     4, 2, 95000, 54000, 50000, NOW(), NOW());
            ");

            // ── 3. Add categoryId FK to rooms ──────────────────────────────────────
            migrationBuilder.AddColumn<long>(
                name: "categoryId",
                table: "rooms",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_rooms_roomCategories_categoryId",
                table: "rooms",
                column: "categoryId",
                principalTable: "roomCategories",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.CreateIndex(
                name: "IX_rooms_categoryId",
                table: "rooms",
                column: "categoryId");

            // ── 4. Populate categoryId on existing rooms ───────────────────────────
            migrationBuilder.Sql(@"
                UPDATE ""rooms"" SET ""categoryId"" = (SELECT id FROM ""roomCategories"" WHERE slug = 't1-standard')
                WHERE ""pmsType"" = 'T1' AND ""pmsGamme"" = 'standard';

                UPDATE ""rooms"" SET ""categoryId"" = (SELECT id FROM ""roomCategories"" WHERE slug = 't2-standard')
                WHERE ""pmsType"" = 'T2' AND ""pmsGamme"" = 'standard';

                UPDATE ""rooms"" SET ""categoryId"" = (SELECT id FROM ""roomCategories"" WHERE slug = 't3-standard')
                WHERE ""pmsType"" = 'T3' AND ""pmsGamme"" = 'standard';

                UPDATE ""rooms"" SET ""categoryId"" = (SELECT id FROM ""roomCategories"" WHERE slug = 't1-superieure')
                WHERE ""pmsType"" = 'T1' AND ""pmsGamme"" = 'supérieure';

                UPDATE ""rooms"" SET ""categoryId"" = (SELECT id FROM ""roomCategories"" WHERE slug = 't2-superieure')
                WHERE ""pmsType"" = 'T2' AND ""pmsGamme"" = 'supérieure';

                UPDATE ""rooms"" SET ""categoryId"" = (SELECT id FROM ""roomCategories"" WHERE slug = 't3-superieure')
                WHERE ""pmsType"" = 'T3' AND ""pmsGamme"" = 'supérieure';

                UPDATE ""rooms"" SET ""categoryId"" = (SELECT id FROM ""roomCategories"" WHERE slug = 't1-privilege')
                WHERE ""pmsType"" = 'T1' AND ""pmsGamme"" = 'privilège';

                UPDATE ""rooms"" SET ""categoryId"" = (SELECT id FROM ""roomCategories"" WHERE slug = 't2-privilege')
                WHERE ""pmsType"" = 'T2' AND ""pmsGamme"" = 'privilège';

                UPDATE ""rooms"" SET ""categoryId"" = (SELECT id FROM ""roomCategories"" WHERE slug = 't4-suite')
                WHERE ""pmsType"" = 'T4' AND ""pmsGamme"" = 'suite';
            ");

            // ── 5. Add categoryId FK to reservations, make roomId nullable ─────────
            migrationBuilder.AlterColumn<long>(
                name: "roomId",
                table: "reservations",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AddColumn<long>(
                name: "categoryId",
                table: "reservations",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            // Backfill categoryId on existing reservations from their room's category
            migrationBuilder.Sql(@"
                UPDATE ""reservations"" r
                SET ""categoryId"" = rm.""categoryId""
                FROM ""rooms"" rm
                WHERE r.""roomId"" = rm.""id""
                  AND rm.""categoryId"" IS NOT NULL;

                -- Assign any remaining 0s (reservations without a room or unmatched) to the first category
                UPDATE ""reservations""
                SET ""categoryId"" = (SELECT MIN(id) FROM ""roomCategories"")
                WHERE ""categoryId"" = 0;
            ");

            migrationBuilder.AddForeignKey(
                name: "FK_reservations_roomCategories_categoryId",
                table: "reservations",
                column: "categoryId",
                principalTable: "roomCategories",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.CreateIndex(
                name: "IX_reservations_categoryId",
                table: "reservations",
                column: "categoryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey("FK_reservations_roomCategories_categoryId", "reservations");
            migrationBuilder.DropIndex("IX_reservations_categoryId", "reservations");
            migrationBuilder.DropColumn("categoryId", "reservations");

            migrationBuilder.AlterColumn<long>(
                name: "roomId",
                table: "reservations",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldNullable: true);

            migrationBuilder.DropForeignKey("FK_rooms_roomCategories_categoryId", "rooms");
            migrationBuilder.DropIndex("IX_rooms_categoryId", "rooms");
            migrationBuilder.DropColumn("categoryId", "rooms");

            migrationBuilder.DropTable("roomCategories");
        }
    }
}
