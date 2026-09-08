using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Juweirat.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyContract : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "companyContractId",
                table: "reservations",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "companyContractId",
                table: "factures",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "companyContracts",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    reference = table.Column<string>(type: "text", nullable: false),
                    companyId = table.Column<long>(type: "bigint", nullable: false),
                    roomId = table.Column<long>(type: "bigint", nullable: false),
                    startDate = table.Column<DateOnly>(type: "date", nullable: false),
                    endDate = table.Column<DateOnly>(type: "date", nullable: false),
                    monthlyRate = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "Active"),
                    tvaExonere = table.Column<bool>(type: "boolean", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    createdByUserId = table.Column<long>(type: "bigint", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_companyContracts", x => x.id);
                    table.CheckConstraint("ck_contractEndAfterStart", "\"endDate\" > \"startDate\"");
                    table.ForeignKey(
                        name: "fK_companyContracts_Rooms_roomId",
                        column: x => x.roomId,
                        principalTable: "rooms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fK_companyContracts_companies_companyId",
                        column: x => x.companyId,
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "iX_reservations_companyContractId",
                table: "reservations",
                column: "companyContractId",
                filter: "\"companyContractId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "iX_factures_companyContractId",
                table: "factures",
                column: "companyContractId",
                filter: "\"companyContractId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "iX_companyContracts_companyId",
                table: "companyContracts",
                column: "companyId");

            migrationBuilder.CreateIndex(
                name: "iX_companyContracts_reference",
                table: "companyContracts",
                column: "reference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "iX_companyContracts_roomId_startDate_endDate",
                table: "companyContracts",
                columns: new[] { "roomId", "startDate", "endDate" });

            migrationBuilder.AddForeignKey(
                name: "fK_factures_companyContracts_companyContractId",
                table: "factures",
                column: "companyContractId",
                principalTable: "companyContracts",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fK_reservations_companyContracts_companyContractId",
                table: "reservations",
                column: "companyContractId",
                principalTable: "companyContracts",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fK_factures_companyContracts_companyContractId",
                table: "factures");

            migrationBuilder.DropForeignKey(
                name: "fK_reservations_companyContracts_companyContractId",
                table: "reservations");

            migrationBuilder.DropTable(
                name: "companyContracts");

            migrationBuilder.DropIndex(
                name: "iX_reservations_companyContractId",
                table: "reservations");

            migrationBuilder.DropIndex(
                name: "iX_factures_companyContractId",
                table: "factures");

            migrationBuilder.DropColumn(
                name: "companyContractId",
                table: "reservations");

            migrationBuilder.DropColumn(
                name: "companyContractId",
                table: "factures");
        }
    }
}
