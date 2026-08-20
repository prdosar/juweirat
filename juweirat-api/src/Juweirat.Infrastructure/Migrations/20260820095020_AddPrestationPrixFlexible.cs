using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juweirat.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPrestationPrixFlexible : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "prixFlexible",
                table: "prestationsAnnexes",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "prixFlexible",
                table: "prestationsAnnexes");
        }
    }
}
