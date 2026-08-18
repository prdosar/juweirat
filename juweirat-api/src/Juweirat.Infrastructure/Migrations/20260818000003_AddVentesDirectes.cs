using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Juweirat.Infrastructure.Migrations;

public partial class AddVentesDirectes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "ventesDirectes",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                prestationId         = table.Column<long>(type: "bigint", nullable: false),
                clientId             = table.Column<long>(type: "bigint", nullable: true),
                clientNom            = table.Column<string>(type: "text", nullable: true),
                folioId              = table.Column<long>(type: "bigint", nullable: true),
                quantite             = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                prixUnitaireSnapshot = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                total                = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                mode                 = table.Column<string>(type: "text", nullable: false, defaultValue: "Encaissement"),
                paymentMethod        = table.Column<string>(type: "text", nullable: true),
                notes                = table.Column<string>(type: "text", nullable: true),
                createdAt            = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ventesDirectes", x => x.id);
                table.ForeignKey(
                    name: "FK_ventesDirectes_prestationsAnnexes_prestationId",
                    column: x => x.prestationId,
                    principalTable: "prestationsAnnexes",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_ventesDirectes_clients_clientId",
                    column: x => x.clientId,
                    principalTable: "clients",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_ventesDirectes_folios_folioId",
                    column: x => x.folioId,
                    principalTable: "folios",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_ventesDirectes_prestationId",
            table: "ventesDirectes",
            column: "prestationId");

        migrationBuilder.CreateIndex(
            name: "IX_ventesDirectes_clientId",
            table: "ventesDirectes",
            column: "clientId");

        migrationBuilder.CreateIndex(
            name: "IX_ventesDirectes_folioId",
            table: "ventesDirectes",
            column: "folioId");

        migrationBuilder.CreateIndex(
            name: "IX_ventesDirectes_createdAt",
            table: "ventesDirectes",
            column: "createdAt");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "ventesDirectes");
    }
}
