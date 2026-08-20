using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juweirat.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveRoomPrices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "pricePerMonth",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "pricePerNight",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "pricePerWeek",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "tarifN15",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "tarifN30",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "tarifNuit",
                table: "rooms");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "pricePerMonth",
                table: "rooms",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "pricePerNight",
                table: "rooms",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "pricePerWeek",
                table: "rooms",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "tarifN15",
                table: "rooms",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "tarifN30",
                table: "rooms",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "tarifNuit",
                table: "rooms",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
