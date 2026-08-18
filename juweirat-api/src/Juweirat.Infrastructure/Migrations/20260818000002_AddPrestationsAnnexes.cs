using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Juweirat.Infrastructure.Migrations;

public partial class AddPrestationsAnnexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "prestationsAnnexes",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                nameFr    = table.Column<string>(type: "text", nullable: false),
                nameEn    = table.Column<string>(type: "text", nullable: false),
                icon      = table.Column<string>(type: "text", nullable: true),
                mode      = table.Column<string>(type: "text", nullable: false, defaultValue: "ParPersonneParNuit"),
                prixInclus = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                prixSeule  = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                isActive  = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                sortOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_prestationsAnnexes", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "reservationPrestations",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                reservationId        = table.Column<long>(type: "bigint", nullable: false),
                prestationId         = table.Column<long>(type: "bigint", nullable: false),
                quantite             = table.Column<int>(type: "integer", nullable: false),
                prixUnitaireSnapshot = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                totalLigne           = table.Column<decimal>(type: "numeric(10,2)", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_reservationPrestations", x => x.id);
                table.ForeignKey(
                    name: "FK_reservationPrestations_reservations_reservationId",
                    column: x => x.reservationId,
                    principalTable: "reservations",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_reservationPrestations_prestationsAnnexes_prestationId",
                    column: x => x.prestationId,
                    principalTable: "prestationsAnnexes",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_reservationPrestations_reservationId",
            table: "reservationPrestations",
            column: "reservationId");

        migrationBuilder.CreateIndex(
            name: "IX_reservationPrestations_prestationId",
            table: "reservationPrestations",
            column: "prestationId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "reservationPrestations");
        migrationBuilder.DropTable(name: "prestationsAnnexes");
    }
}
