using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Juweirat.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SyncModelSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_reservations_roomCategories_categoryId",
                table: "reservations");

            migrationBuilder.DropForeignKey(
                name: "FK_rooms_roomCategories_categoryId",
                table: "rooms");

            migrationBuilder.RenameIndex(
                name: "IX_rooms_categoryId",
                table: "rooms",
                newName: "iX_rooms_categoryId");

            migrationBuilder.RenameIndex(
                name: "IX_roomCategories_slug",
                table: "roomCategories",
                newName: "iX_roomCategories_slug");

            migrationBuilder.RenameIndex(
                name: "IX_reservations_categoryId",
                table: "reservations",
                newName: "iX_reservations_categoryId");

            migrationBuilder.AddForeignKey(
                name: "fK_reservations_RoomCategories_categoryId",
                table: "reservations",
                column: "categoryId",
                principalTable: "roomCategories",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fK_rooms_RoomCategories_categoryId",
                table: "rooms",
                column: "categoryId",
                principalTable: "roomCategories",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fK_reservations_RoomCategories_categoryId",
                table: "reservations");

            migrationBuilder.DropForeignKey(
                name: "fK_rooms_RoomCategories_categoryId",
                table: "rooms");

            migrationBuilder.RenameIndex(
                name: "iX_rooms_categoryId",
                table: "rooms",
                newName: "IX_rooms_categoryId");

            migrationBuilder.RenameIndex(
                name: "iX_roomCategories_slug",
                table: "roomCategories",
                newName: "IX_roomCategories_slug");

            migrationBuilder.RenameIndex(
                name: "iX_reservations_categoryId",
                table: "reservations",
                newName: "IX_reservations_categoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_reservations_roomCategories_categoryId",
                table: "reservations",
                column: "categoryId",
                principalTable: "roomCategories",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_rooms_roomCategories_categoryId",
                table: "rooms",
                column: "categoryId",
                principalTable: "roomCategories",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
