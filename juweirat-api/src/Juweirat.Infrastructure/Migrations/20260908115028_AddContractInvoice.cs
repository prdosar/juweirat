using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Juweirat.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddContractInvoice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "contractInvoices",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    number = table.Column<string>(type: "text", nullable: false),
                    companyContractId = table.Column<long>(type: "bigint", nullable: false),
                    year = table.Column<int>(type: "integer", nullable: false),
                    month = table.Column<int>(type: "integer", nullable: false),
                    periodStart = table.Column<DateOnly>(type: "date", nullable: false),
                    periodEnd = table.Column<DateOnly>(type: "date", nullable: false),
                    totalHt = table.Column<int>(type: "integer", nullable: false),
                    tva = table.Column<int>(type: "integer", nullable: false),
                    totalTtc = table.Column<int>(type: "integer", nullable: false),
                    tvaRate = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    tvaExonere = table.Column<bool>(type: "boolean", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false, defaultValue: "Issued"),
                    issuedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    paidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    paymentMethod = table.Column<string>(type: "text", nullable: true),
                    paymentRef = table.Column<string>(type: "text", nullable: true),
                    issuedByUserId = table.Column<long>(type: "bigint", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contractInvoices", x => x.id);
                    table.CheckConstraint("ck_contractInvoiceMonthValid", "\"month\" BETWEEN 1 AND 12");
                    table.ForeignKey(
                        name: "fK_contractInvoices_companyContracts_companyContractId",
                        column: x => x.companyContractId,
                        principalTable: "companyContracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "iX_contractInvoices_companyContractId_year_month",
                table: "contractInvoices",
                columns: new[] { "companyContractId", "year", "month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "iX_contractInvoices_number",
                table: "contractInvoices",
                column: "number",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "contractInvoices");
        }
    }
}
