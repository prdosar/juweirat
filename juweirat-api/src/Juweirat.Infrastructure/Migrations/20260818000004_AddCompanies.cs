using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Juweirat.Infrastructure.Migrations;

public partial class AddCompanies : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "companies",
            columns: table => new
            {
                id             = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                name           = table.Column<string>(type: "text", nullable: false),
                responsableNom = table.Column<string>(type: "text", nullable: true),
                phone          = table.Column<string>(type: "text", nullable: true),
                email          = table.Column<string>(type: "text", nullable: true),
                adresse        = table.Column<string>(type: "text", nullable: true),
                ville          = table.Column<string>(type: "text", nullable: true),
                notes          = table.Column<string>(type: "text", nullable: true),
                isActive       = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                createdAt      = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                updatedAt      = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_companies", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "companyTarifs",
            columns: table => new
            {
                id         = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                companyId  = table.Column<long>(type: "bigint", nullable: false),
                categoryId = table.Column<long>(type: "bigint", nullable: false),
                tarifNuit  = table.Column<int>(type: "integer", nullable: false),
                tarifN15   = table.Column<int>(type: "integer", nullable: false),
                tarifN30   = table.Column<int>(type: "integer", nullable: false),
                createdAt  = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                updatedAt  = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_companyTarifs", x => x.id);
                table.ForeignKey(
                    name: "FK_companyTarifs_companies_companyId",
                    column: x => x.companyId,
                    principalTable: "companies",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_companyTarifs_roomCategories_categoryId",
                    column: x => x.categoryId,
                    principalTable: "roomCategories",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.AddColumn<long>(
            name: "companyId",
            table: "clients",
            type: "bigint",
            nullable: true);

        migrationBuilder.AddForeignKey(
            name: "FK_clients_companies_companyId",
            table: "clients",
            column: "companyId",
            principalTable: "companies",
            principalColumn: "id",
            onDelete: ReferentialAction.SetNull);

        migrationBuilder.CreateIndex(
            name: "IX_companyTarifs_companyId_categoryId",
            table: "companyTarifs",
            columns: new[] { "companyId", "categoryId" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_companyTarifs_categoryId",
            table: "companyTarifs",
            column: "categoryId");

        migrationBuilder.CreateIndex(
            name: "IX_clients_companyId",
            table: "clients",
            column: "companyId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(name: "FK_clients_companies_companyId", table: "clients");
        migrationBuilder.DropIndex(name: "IX_clients_companyId", table: "clients");
        migrationBuilder.DropColumn(name: "companyId", table: "clients");
        migrationBuilder.DropTable(name: "companyTarifs");
        migrationBuilder.DropTable(name: "companies");
    }
}
