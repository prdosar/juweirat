using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Juweirat.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPmsSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "horsService",
                table: "rooms",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "lastCleaned",
                table: "rooms",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "planCol",
                table: "rooms",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "planRow",
                table: "rooms",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "pmsGamme",
                table: "rooms",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "pmsRoomNo",
                table: "rooms",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "pmsType",
                table: "rooms",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "statutMenage",
                table: "rooms",
                type: "text",
                nullable: false,
                defaultValue: "Propre");

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

            migrationBuilder.CreateTable(
                name: "clotures",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    dateHotel = table.Column<DateOnly>(type: "date", nullable: false),
                    executedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    dispo = table.Column<int>(type: "integer", nullable: false),
                    occ = table.Column<int>(type: "integer", nullable: false),
                    occupation = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    caHeb = table.Column<int>(type: "integer", nullable: false),
                    caPdj = table.Column<int>(type: "integer", nullable: false),
                    caTotal = table.Column<int>(type: "integer", nullable: false),
                    pm = table.Column<int>(type: "integer", nullable: false),
                    revPar = table.Column<int>(type: "integer", nullable: false),
                    nbArrivals = table.Column<int>(type: "integer", nullable: false),
                    nbDeparts = table.Column<int>(type: "integer", nullable: false),
                    nbNoShow = table.Column<int>(type: "integer", nullable: false),
                    nbLignes = table.Column<int>(type: "integer", nullable: false),
                    montant = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_clotures", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "folios",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    number = table.Column<string>(type: "text", nullable: false),
                    unitId = table.Column<long>(type: "bigint", nullable: false),
                    guest = table.Column<string>(type: "text", nullable: true),
                    nom = table.Column<string>(type: "text", nullable: true),
                    prenom = table.Column<string>(type: "text", nullable: true),
                    societe = table.Column<string>(type: "text", nullable: true),
                    reservataire = table.Column<string>(type: "text", nullable: true),
                    cardNumber = table.Column<string>(type: "text", nullable: true),
                    cardExpiry = table.Column<string>(type: "text", nullable: true),
                    cardHolder = table.Column<string>(type: "text", nullable: true),
                    segment = table.Column<string>(type: "text", nullable: false),
                    pax = table.Column<int>(type: "integer", nullable: false),
                    arrival = table.Column<DateOnly>(type: "date", nullable: false),
                    departure = table.Column<DateOnly>(type: "date", nullable: false),
                    rate = table.Column<int>(type: "integer", nullable: false),
                    heb = table.Column<int>(type: "integer", nullable: false),
                    tarifTier = table.Column<string>(type: "text", nullable: false),
                    elecIncluded = table.Column<bool>(type: "boolean", nullable: false),
                    pdjParJour = table.Column<int>(type: "integer", nullable: false),
                    pdjPrix = table.Column<int>(type: "integer", nullable: false),
                    debiteur = table.Column<int>(type: "integer", nullable: false),
                    dependances = table.Column<int>(type: "integer", nullable: false),
                    arrhes = table.Column<int>(type: "integer", nullable: false),
                    paid = table.Column<int>(type: "integer", nullable: false),
                    payMode = table.Column<string>(type: "text", nullable: true),
                    factRecipient = table.Column<string>(type: "text", nullable: true),
                    resaStatus = table.Column<string>(type: "text", nullable: false),
                    checkedIn = table.Column<bool>(type: "boolean", nullable: false),
                    closed = table.Column<bool>(type: "boolean", nullable: false),
                    checkoutDate = table.Column<DateOnly>(type: "date", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    factureId = table.Column<long>(type: "bigint", nullable: true),
                    reservationId = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_folios", x => x.id);
                    table.ForeignKey(
                        name: "fK_folios_Reservations_reservationId",
                        column: x => x.reservationId,
                        principalTable: "reservations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fK_folios_Rooms_unitId",
                        column: x => x.unitId,
                        principalTable: "rooms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "hotelConfig",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    buildingName = table.Column<string>(type: "text", nullable: false),
                    ownerName = table.Column<string>(type: "text", nullable: false),
                    city = table.Column<string>(type: "text", nullable: false),
                    currencyCode = table.Column<string>(type: "text", nullable: false),
                    currencyDecimals = table.Column<int>(type: "integer", nullable: false),
                    dateHotel = table.Column<DateOnly>(type: "date", nullable: false),
                    resaSeq = table.Column<int>(type: "integer", nullable: false),
                    factureSeq = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hotelConfig", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "maintenanceTickets",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    zone = table.Column<string>(type: "text", nullable: false),
                    unitId = table.Column<long>(type: "bigint", nullable: true),
                    spot = table.Column<string>(type: "text", nullable: true),
                    category = table.Column<string>(type: "text", nullable: false),
                    priority = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    tech = table.Column<string>(type: "text", nullable: true),
                    cost = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    resolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_maintenanceTickets", x => x.id);
                    table.ForeignKey(
                        name: "fK_maintenanceTickets_Rooms_unitId",
                        column: x => x.unitId,
                        principalTable: "rooms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "debtors",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    client = table.Column<string>(type: "text", nullable: false),
                    label = table.Column<string>(type: "text", nullable: false),
                    dueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    amount = table.Column<int>(type: "integer", nullable: false),
                    paid = table.Column<int>(type: "integer", nullable: false),
                    folioId = table.Column<long>(type: "bigint", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_debtors", x => x.id);
                    table.ForeignKey(
                        name: "fK_debtors_Folios_folioId",
                        column: x => x.folioId,
                        principalTable: "folios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "factures",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    number = table.Column<string>(type: "text", nullable: false),
                    folioId = table.Column<long>(type: "bigint", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    printCount = table.Column<int>(type: "integer", nullable: false),
                    corrections = table.Column<int>(type: "integer", nullable: false),
                    corrigeeLe = table.Column<DateOnly>(type: "date", nullable: true),
                    createdAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    snapshot = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_factures", x => x.id);
                    table.ForeignKey(
                        name: "fK_factures_Folios_folioId",
                        column: x => x.folioId,
                        principalTable: "folios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "postings",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    dateHotel = table.Column<DateOnly>(type: "date", nullable: false),
                    folioId = table.Column<long>(type: "bigint", nullable: false),
                    unitId = table.Column<long>(type: "bigint", nullable: false),
                    famille = table.Column<string>(type: "text", nullable: false),
                    libelle = table.Column<string>(type: "text", nullable: false),
                    montant = table.Column<int>(type: "integer", nullable: false),
                    horodatage = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_postings", x => x.id);
                    table.ForeignKey(
                        name: "fK_postings_Rooms_unitId",
                        column: x => x.unitId,
                        principalTable: "rooms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fK_postings_folios_folioId",
                        column: x => x.folioId,
                        principalTable: "folios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "iX_rooms_pmsRoomNo",
                table: "rooms",
                column: "pmsRoomNo",
                unique: true,
                filter: "\"pmsRoomNo\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "iX_clotures_dateHotel",
                table: "clotures",
                column: "dateHotel",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "iX_debtors_folioId",
                table: "debtors",
                column: "folioId");

            migrationBuilder.CreateIndex(
                name: "iX_factures_folioId",
                table: "factures",
                column: "folioId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "iX_factures_number",
                table: "factures",
                column: "number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "iX_folios_number",
                table: "folios",
                column: "number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "iX_folios_reservationId",
                table: "folios",
                column: "reservationId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "iX_folios_unitId",
                table: "folios",
                column: "unitId");

            migrationBuilder.CreateIndex(
                name: "iX_maintenanceTickets_unitId",
                table: "maintenanceTickets",
                column: "unitId");

            migrationBuilder.CreateIndex(
                name: "iX_postings_folioId",
                table: "postings",
                column: "folioId");

            migrationBuilder.CreateIndex(
                name: "iX_postings_unitId",
                table: "postings",
                column: "unitId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "clotures");

            migrationBuilder.DropTable(
                name: "debtors");

            migrationBuilder.DropTable(
                name: "factures");

            migrationBuilder.DropTable(
                name: "hotelConfig");

            migrationBuilder.DropTable(
                name: "maintenanceTickets");

            migrationBuilder.DropTable(
                name: "postings");

            migrationBuilder.DropTable(
                name: "folios");

            migrationBuilder.DropIndex(
                name: "iX_rooms_pmsRoomNo",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "horsService",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "lastCleaned",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "planCol",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "planRow",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "pmsGamme",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "pmsRoomNo",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "pmsType",
                table: "rooms");

            migrationBuilder.DropColumn(
                name: "statutMenage",
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
    }
}
