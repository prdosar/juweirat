using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juweirat.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBillingFrequency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "iX_contractInvoices_companyContractId_year_month",
                table: "contractInvoices");

            migrationBuilder.DropCheckConstraint(
                name: "ck_contractInvoiceMonthValid",
                table: "contractInvoices");

            migrationBuilder.RenameColumn(
                name: "month",
                table: "contractInvoices",
                newName: "periodIndex");

            migrationBuilder.AddColumn<int>(
                name: "monthsCovered",
                table: "contractInvoices",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "billingFrequency",
                table: "companyContracts",
                type: "text",
                nullable: false,
                defaultValue: "Monthly");

            migrationBuilder.CreateIndex(
                name: "iX_contractInvoices_companyContractId_periodIndex",
                table: "contractInvoices",
                columns: new[] { "companyContractId", "periodIndex" },
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_contractInvoicePeriodValid",
                table: "contractInvoices",
                sql: "\"periodIndex\" > 0 AND \"monthsCovered\" IN (1, 3, 6, 12)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "iX_contractInvoices_companyContractId_periodIndex",
                table: "contractInvoices");

            migrationBuilder.DropCheckConstraint(
                name: "ck_contractInvoicePeriodValid",
                table: "contractInvoices");

            migrationBuilder.DropColumn(
                name: "monthsCovered",
                table: "contractInvoices");

            migrationBuilder.DropColumn(
                name: "billingFrequency",
                table: "companyContracts");

            migrationBuilder.RenameColumn(
                name: "periodIndex",
                table: "contractInvoices",
                newName: "month");

            migrationBuilder.CreateIndex(
                name: "iX_contractInvoices_companyContractId_year_month",
                table: "contractInvoices",
                columns: new[] { "companyContractId", "year", "month" },
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_contractInvoiceMonthValid",
                table: "contractInvoices",
                sql: "\"month\" BETWEEN 1 AND 12");
        }
    }
}
