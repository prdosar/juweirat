using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Juweirat.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHousekeepingLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "housekeepingLogs",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    roomId = table.Column<long>(type: "bigint", nullable: false),
                    staffId = table.Column<long>(type: "bigint", nullable: false),
                    cleanedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_housekeepingLogs", x => x.id);
                    table.ForeignKey(
                        name: "fK_housekeepingLogs_MaintenanceStaff_staffId",
                        column: x => x.staffId,
                        principalTable: "maintenanceStaff",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fK_housekeepingLogs_Rooms_roomId",
                        column: x => x.roomId,
                        principalTable: "rooms",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "iX_housekeepingLogs_roomId_cleanedAt",
                table: "housekeepingLogs",
                columns: new[] { "roomId", "cleanedAt" });

            migrationBuilder.CreateIndex(
                name: "iX_housekeepingLogs_staffId",
                table: "housekeepingLogs",
                column: "staffId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "housekeepingLogs");
        }
    }
}
