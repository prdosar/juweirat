using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Juweirat.Infrastructure.Migrations
{
    // Migration nettoyée : on ignore volontairement le bruit du snapshot désynchronisé
    // (renames de FK, alter de colonnes, categoryId de roomImages déjà appliqué en prod
    // via catchup_migrations_2026-08-18.sql). Cette migration ajoute UNIQUEMENT les 4
    // nouvelles tables du module Compta pour éviter les crashs sur les alter/add existants.
    /// <inheritdoc />
    public partial class AddAccounting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "accounts",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    kind = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    ownerRefId = table.Column<long>(type: "bigint", nullable: true),
                    balance = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false, defaultValue: 0m),
                    isActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accounts", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "cashRegisters",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    location = table.Column<string>(type: "text", nullable: true),
                    isActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cashRegisters", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "cashSessions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    registerId = table.Column<long>(type: "bigint", nullable: false),
                    openedByUserId = table.Column<long>(type: "bigint", nullable: false),
                    openedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    openingFloat = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    closedByUserId = table.Column<long>(type: "bigint", nullable: true),
                    closedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    closingCountedTotal = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: true),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "Open"),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cashSessions", x => x.id);
                    table.ForeignKey(
                        name: "fK_cashSessions_cashRegisters_registerId",
                        column: x => x.registerId,
                        principalTable: "cashRegisters",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "accountMovements",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    fromAccountId = table.Column<long>(type: "bigint", nullable: false),
                    toAccountId = table.Column<long>(type: "bigint", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    reason = table.Column<string>(type: "text", nullable: false),
                    sourceType = table.Column<string>(type: "text", nullable: true),
                    sourceId = table.Column<long>(type: "bigint", nullable: true),
                    sessionId = table.Column<long>(type: "bigint", nullable: true),
                    createdByUserId = table.Column<long>(type: "bigint", nullable: true),
                    label = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accountMovements", x => x.id);
                    table.ForeignKey(
                        name: "fK_accountMovements_CashSessions_sessionId",
                        column: x => x.sessionId,
                        principalTable: "cashSessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fK_accountMovements_accounts_fromAccountId",
                        column: x => x.fromAccountId,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fK_accountMovements_accounts_toAccountId",
                        column: x => x.toAccountId,
                        principalTable: "accounts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "iX_accountMovements_date",
                table: "accountMovements",
                column: "date");

            migrationBuilder.CreateIndex(
                name: "iX_accountMovements_fromAccountId_date",
                table: "accountMovements",
                columns: new[] { "fromAccountId", "date" });

            migrationBuilder.CreateIndex(
                name: "iX_accountMovements_sessionId",
                table: "accountMovements",
                column: "sessionId");

            migrationBuilder.CreateIndex(
                name: "iX_accountMovements_sourceType_sourceId",
                table: "accountMovements",
                columns: new[] { "sourceType", "sourceId" });

            migrationBuilder.CreateIndex(
                name: "iX_accountMovements_toAccountId_date",
                table: "accountMovements",
                columns: new[] { "toAccountId", "date" });

            migrationBuilder.CreateIndex(
                name: "iX_accounts_kind",
                table: "accounts",
                column: "kind",
                unique: true,
                filter: "\"ownerRefId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "iX_accounts_kind_ownerRefId",
                table: "accounts",
                columns: new[] { "kind", "ownerRefId" },
                unique: true,
                filter: "\"ownerRefId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "iX_cashRegisters_name",
                table: "cashRegisters",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "iX_cashSessions_registerId_openedByUserId_status",
                table: "cashSessions",
                columns: new[] { "registerId", "openedByUserId", "status" },
                unique: true,
                filter: "\"status\" = 'Open'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "accountMovements");
            migrationBuilder.DropTable(name: "cashSessions");
            migrationBuilder.DropTable(name: "accounts");
            migrationBuilder.DropTable(name: "cashRegisters");
        }
    }
}
