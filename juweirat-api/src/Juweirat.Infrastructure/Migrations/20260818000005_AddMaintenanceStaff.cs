using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Juweirat.Infrastructure.Migrations;

public partial class AddMaintenanceStaff : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "maintenanceCategories",
            columns: table => new
            {
                id        = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                name      = table.Column<string>(type: "text", nullable: false),
                isActive  = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_maintenanceCategories", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "maintenanceStaff",
            columns: table => new
            {
                id         = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                categoryId = table.Column<long>(type: "bigint", nullable: false),
                firstName  = table.Column<string>(type: "text", nullable: false),
                lastName   = table.Column<string>(type: "text", nullable: false),
                phone      = table.Column<string>(type: "text", nullable: true),
                isActive   = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                createdAt  = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                updatedAt  = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_maintenanceStaff", x => x.id);
                table.ForeignKey(
                    name: "FK_maintenanceStaff_maintenanceCategories_categoryId",
                    column: x => x.categoryId,
                    principalTable: "maintenanceCategories",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.AddColumn<long>(
            name: "staffId",
            table: "maintenanceTickets",
            type: "bigint",
            nullable: true);

        migrationBuilder.AddForeignKey(
            name: "FK_maintenanceTickets_maintenanceStaff_staffId",
            table: "maintenanceTickets",
            column: "staffId",
            principalTable: "maintenanceStaff",
            principalColumn: "id",
            onDelete: ReferentialAction.SetNull);

        migrationBuilder.CreateIndex(
            name: "IX_maintenanceStaff_categoryId",
            table: "maintenanceStaff",
            column: "categoryId");

        migrationBuilder.CreateIndex(
            name: "IX_maintenanceTickets_staffId",
            table: "maintenanceTickets",
            column: "staffId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(name: "FK_maintenanceTickets_maintenanceStaff_staffId", table: "maintenanceTickets");
        migrationBuilder.DropIndex(name: "IX_maintenanceTickets_staffId", table: "maintenanceTickets");
        migrationBuilder.DropColumn(name: "staffId", table: "maintenanceTickets");
        migrationBuilder.DropTable(name: "maintenanceStaff");
        migrationBuilder.DropTable(name: "maintenanceCategories");
    }
}
