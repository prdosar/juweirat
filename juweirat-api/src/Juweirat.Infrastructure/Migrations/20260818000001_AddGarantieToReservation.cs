using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juweirat.Infrastructure.Migrations;

public partial class AddGarantieToReservation : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "garantieType",
            table: "reservations",
            type: "text",
            nullable: true);

        migrationBuilder.AddColumn<decimal>(
            name: "garantieMontantCash",
            table: "reservations",
            type: "numeric(10,2)",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "carteNom",
            table: "reservations",
            type: "text",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "carteSuffix",
            table: "reservations",
            type: "character varying(4)",
            maxLength: 4,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "carteExpiration",
            table: "reservations",
            type: "character varying(7)",
            maxLength: 7,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "garantieType",        table: "reservations");
        migrationBuilder.DropColumn(name: "garantieMontantCash", table: "reservations");
        migrationBuilder.DropColumn(name: "carteNom",            table: "reservations");
        migrationBuilder.DropColumn(name: "carteSuffix",         table: "reservations");
        migrationBuilder.DropColumn(name: "carteExpiration",     table: "reservations");
    }
}
