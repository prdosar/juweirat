using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Juweirat.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReservationChangeLogAndTarifSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "tarifN15Snapshot",
                table: "reservations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "tarifN30Snapshot",
                table: "reservations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "tarifNuitSnapshot",
                table: "reservations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "reservationChangeLogs",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    reservationId = table.Column<long>(type: "bigint", nullable: false),
                    changedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    changedByUserId = table.Column<long>(type: "bigint", nullable: true),
                    reason = table.Column<string>(type: "text", nullable: false),
                    diffJson = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "{}")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reservationChangeLogs", x => x.id);
                    table.ForeignKey(
                        name: "fK_reservationChangeLogs_reservations_reservationId",
                        column: x => x.reservationId,
                        principalTable: "reservations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "iX_reservationChangeLogs_reservationId_changedAt",
                table: "reservationChangeLogs",
                columns: new[] { "reservationId", "changedAt" });

            // Backfill : peupler les 3 tarifs snapshot des réservations existantes
            // depuis leur roomCategory (les tarifs compagnie négociés ne sont pas connus
            // rétroactivement, donc on part sur les tarifs catégorie standard — acceptable
            // pour l'historique déjà figé, les prochaines modifs recalculeront proprement).
            migrationBuilder.Sql(@"
                UPDATE reservations r
                SET
                  ""tarifNuitSnapshot"" = c.""tarifNuit"",
                  ""tarifN15Snapshot""  = c.""tarifN15"",
                  ""tarifN30Snapshot""  = c.""tarifN30""
                FROM ""roomCategories"" c
                WHERE r.""categoryId"" = c.id
                  AND r.""tarifNuitSnapshot"" = 0;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "reservationChangeLogs");

            migrationBuilder.DropColumn(
                name: "tarifN15Snapshot",
                table: "reservations");

            migrationBuilder.DropColumn(
                name: "tarifN30Snapshot",
                table: "reservations");

            migrationBuilder.DropColumn(
                name: "tarifNuitSnapshot",
                table: "reservations");
        }
    }
}
