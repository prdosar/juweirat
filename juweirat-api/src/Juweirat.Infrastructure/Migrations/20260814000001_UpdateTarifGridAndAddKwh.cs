using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juweirat.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTarifGridAndAddKwh : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Ajouter la colonne kwh dans folios ──────────────────────────────
            migrationBuilder.AddColumn<int>(
                name: "kwh",
                table: "folios",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // ── 2. Mettre à jour les données tarifaires des chambres ───────────────
            // Nouvelle grille tarifaire Juweirat (août 2026) :
            //   tarifNuit  = tarif/nuit, électricité incluse (< 15 nuits)
            //   tarifN15   = tarif/nuit pour séjours 15–29 nuits (hors élec) ← NOUVEAU SENS
            //   tarifN30   = tarif/nuit pour séjours ≥ 30 nuits  (hors élec) ← NOUVEAU SENS
            //   pricePerNight = tarif/nuit nuitée (web booking)
            //   pricePerWeek  = tarif/nuit 15 jours (web booking)
            //   pricePerMonth = tarif/nuit mensuel  (web booking)

            // Étage 2 ──────────────────────────────────────────────────────────────
            migrationBuilder.Sql(@"
                UPDATE rooms SET
                    ""pmsRoomNo"" = '22', ""pmsType"" = 'T2', ""pmsGamme"" = 'supérieure',
                    ""tarifNuit"" = 45000, ""tarifN15"" = 22000, ""tarifN30"" = 20000,
                    ""pricePerNight"" = 45000, ""pricePerWeek"" = 22000, ""pricePerMonth"" = 20000,
                    ""planRow"" = 0, ""planCol"" = 0
                WHERE ""roomNumber"" = '201';

                UPDATE rooms SET
                    ""pmsRoomNo"" = '23', ""pmsType"" = 'T3', ""pmsGamme"" = 'supérieure',
                    ""tarifNuit"" = 80000, ""tarifN15"" = 34000, ""tarifN30"" = 30000,
                    ""pricePerNight"" = 80000, ""pricePerWeek"" = 34000, ""pricePerMonth"" = 30000,
                    ""planRow"" = 0, ""planCol"" = 1
                WHERE ""roomNumber"" = '202';

                UPDATE rooms SET
                    ""pmsRoomNo"" = '24', ""pmsType"" = 'T3', ""pmsGamme"" = 'supérieure',
                    ""tarifNuit"" = 80000, ""tarifN15"" = 34000, ""tarifN30"" = 30000,
                    ""pricePerNight"" = 80000, ""pricePerWeek"" = 34000, ""pricePerMonth"" = 30000,
                    ""planRow"" = 1, ""planCol"" = 0
                WHERE ""roomNumber"" = '203';

                UPDATE rooms SET
                    ""pmsRoomNo"" = '25', ""pmsType"" = 'T2', ""pmsGamme"" = 'privilège',
                    ""tarifNuit"" = 55000, ""tarifN15"" = 25000, ""tarifN30"" = 23333,
                    ""pricePerNight"" = 55000, ""pricePerWeek"" = 25000, ""pricePerMonth"" = 23333,
                    ""planRow"" = 1, ""planCol"" = 1
                WHERE ""roomNumber"" = '204';
            ");

            // Étage 4 ──────────────────────────────────────────────────────────────
            migrationBuilder.Sql(@"
                UPDATE rooms SET
                    ""pmsRoomNo"" = '41', ""pmsType"" = 'T1', ""pmsGamme"" = 'standard',
                    ""tarifNuit"" = 30000, ""tarifN15"" = 13000, ""tarifN30"" = 10000,
                    ""pricePerNight"" = 30000, ""pricePerWeek"" = 13000, ""pricePerMonth"" = 10000,
                    ""planRow"" = 0, ""planCol"" = 0
                WHERE ""roomNumber"" = '401';

                UPDATE rooms SET
                    ""pmsRoomNo"" = '42', ""pmsType"" = 'T2', ""pmsGamme"" = 'standard',
                    ""tarifNuit"" = 40000, ""tarifN15"" = 20000, ""tarifN30"" = 15000,
                    ""pricePerNight"" = 40000, ""pricePerWeek"" = 20000, ""pricePerMonth"" = 15000,
                    ""planRow"" = 0, ""planCol"" = 1
                WHERE ""roomNumber"" = '402';

                UPDATE rooms SET
                    ""pmsRoomNo"" = '43', ""pmsType"" = 'T3', ""pmsGamme"" = 'standard',
                    ""tarifNuit"" = 65000, ""tarifN15"" = 30000, ""tarifN30"" = 25000,
                    ""pricePerNight"" = 65000, ""pricePerWeek"" = 30000, ""pricePerMonth"" = 25000,
                    ""planRow"" = 1, ""planCol"" = 0
                WHERE ""roomNumber"" = '403';

                UPDATE rooms SET
                    ""pmsRoomNo"" = '44', ""pmsType"" = 'T3', ""pmsGamme"" = 'standard',
                    ""tarifNuit"" = 65000, ""tarifN15"" = 30000, ""tarifN30"" = 25000,
                    ""pricePerNight"" = 65000, ""pricePerWeek"" = 30000, ""pricePerMonth"" = 25000,
                    ""planRow"" = 1, ""planCol"" = 1
                WHERE ""roomNumber"" = '404';

                UPDATE rooms SET
                    ""pmsRoomNo"" = '45', ""pmsType"" = 'T2', ""pmsGamme"" = 'supérieure',
                    ""tarifNuit"" = 45000, ""tarifN15"" = 20000, ""tarifN30"" = 16667,
                    ""pricePerNight"" = 45000, ""pricePerWeek"" = 20000, ""pricePerMonth"" = 16667,
                    ""planRow"" = 2, ""planCol"" = 0
                WHERE ""roomNumber"" = '405';

                UPDATE rooms SET
                    ""pmsRoomNo"" = '46', ""pmsType"" = 'T1', ""pmsGamme"" = 'supérieure',
                    ""tarifNuit"" = 35000, ""tarifN15"" = 16000, ""tarifN30"" = 13333,
                    ""pricePerNight"" = 35000, ""pricePerWeek"" = 16000, ""pricePerMonth"" = 13333,
                    ""planRow"" = 2, ""planCol"" = 1
                WHERE ""roomNumber"" = '406';
            ");

            // Étage 5 ──────────────────────────────────────────────────────────────
            migrationBuilder.Sql(@"
                UPDATE rooms SET
                    ""pmsRoomNo"" = '51', ""pmsType"" = 'T1', ""pmsGamme"" = 'standard',
                    ""tarifNuit"" = 30000, ""tarifN15"" = 14000, ""tarifN30"" = 10000,
                    ""pricePerNight"" = 30000, ""pricePerWeek"" = 14000, ""pricePerMonth"" = 10000,
                    ""planRow"" = 0, ""planCol"" = 0
                WHERE ""roomNumber"" = '501';

                UPDATE rooms SET
                    ""pmsRoomNo"" = '52', ""pmsType"" = 'T2', ""pmsGamme"" = 'standard',
                    ""tarifNuit"" = 40000, ""tarifN15"" = 20000, ""tarifN30"" = 15000,
                    ""pricePerNight"" = 40000, ""pricePerWeek"" = 20000, ""pricePerMonth"" = 15000,
                    ""planRow"" = 0, ""planCol"" = 1
                WHERE ""roomNumber"" = '502';

                UPDATE rooms SET
                    ""pmsRoomNo"" = '53', ""pmsType"" = 'T3', ""pmsGamme"" = 'standard',
                    ""tarifNuit"" = 65000, ""tarifN15"" = 30000, ""tarifN30"" = 25000,
                    ""pricePerNight"" = 65000, ""pricePerWeek"" = 30000, ""pricePerMonth"" = 25000,
                    ""planRow"" = 1, ""planCol"" = 0
                WHERE ""roomNumber"" = '503';

                UPDATE rooms SET
                    ""pmsRoomNo"" = '54', ""pmsType"" = 'T3', ""pmsGamme"" = 'standard',
                    ""tarifNuit"" = 65000, ""tarifN15"" = 30000, ""tarifN30"" = 25000,
                    ""pricePerNight"" = 65000, ""pricePerWeek"" = 30000, ""pricePerMonth"" = 25000,
                    ""planRow"" = 1, ""planCol"" = 1
                WHERE ""roomNumber"" = '504';

                UPDATE rooms SET
                    ""pmsRoomNo"" = '55', ""pmsType"" = 'T2', ""pmsGamme"" = 'supérieure',
                    ""tarifNuit"" = 45000, ""tarifN15"" = 20000, ""tarifN30"" = 16667,
                    ""pricePerNight"" = 45000, ""pricePerWeek"" = 20000, ""pricePerMonth"" = 16667,
                    ""planRow"" = 2, ""planCol"" = 0
                WHERE ""roomNumber"" = '505';

                UPDATE rooms SET
                    ""pmsRoomNo"" = '56', ""pmsType"" = 'T1', ""pmsGamme"" = 'supérieure',
                    ""tarifNuit"" = 35000, ""tarifN15"" = 16000, ""tarifN30"" = 13333,
                    ""pricePerNight"" = 35000, ""pricePerWeek"" = 16000, ""pricePerMonth"" = 13333,
                    ""planRow"" = 2, ""planCol"" = 1
                WHERE ""roomNumber"" = '506';
            ");

            // Étage 6 ──────────────────────────────────────────────────────────────
            migrationBuilder.Sql(@"
                UPDATE rooms SET
                    ""pmsRoomNo"" = '61', ""pmsType"" = 'T1', ""pmsGamme"" = 'privilège',
                    ""tarifNuit"" = 40000, ""tarifN15"" = 20000, ""tarifN30"" = 15000,
                    ""pricePerNight"" = 40000, ""pricePerWeek"" = 20000, ""pricePerMonth"" = 15000,
                    ""planRow"" = 0, ""planCol"" = 0
                WHERE ""roomNumber"" = '601';

                UPDATE rooms SET
                    ""pmsRoomNo"" = '67', ""pmsType"" = 'T4', ""pmsGamme"" = 'suite',
                    ""tarifNuit"" = 95000, ""tarifN15"" = 54000, ""tarifN30"" = 50000,
                    ""pricePerNight"" = 95000, ""pricePerWeek"" = 54000, ""pricePerMonth"" = 50000,
                    ""planRow"" = 0, ""planCol"" = 1
                WHERE ""roomNumber"" = '602';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "kwh",
                table: "folios");

            // Restauration partielle — remet les anciens totaux forfaitaires
            // (pricePerNight/Week/Month non restaurés car valeurs d'origine distinctes)
            migrationBuilder.Sql(@"
                UPDATE rooms SET ""tarifN15"" = ""tarifNuit"" * 15, ""tarifN30"" = ""tarifNuit"" * 30
                WHERE ""pmsRoomNo"" IS NOT NULL;
            ");
        }
    }
}
