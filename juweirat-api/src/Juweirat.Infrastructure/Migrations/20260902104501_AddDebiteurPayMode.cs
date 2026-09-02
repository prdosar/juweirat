using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juweirat.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDebiteurPayMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "payMode",
                table: "debtors",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "payMode",
                table: "debtors");
        }
    }
}
