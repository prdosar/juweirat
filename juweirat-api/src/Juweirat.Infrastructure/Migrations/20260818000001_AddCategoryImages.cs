using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

using Microsoft.EntityFrameworkCore.Infrastructure;

namespace Juweirat.Infrastructure.Migrations
{
    [DbContext(typeof(Juweirat.Infrastructure.Data.AppDbContext))]
    [Migration("20260818000001_AddCategoryImages")]
    public partial class AddCategoryImages : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<long>(
                name: "roomId",
                table: "roomImages",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AddColumn<long>(
                name: "categoryId",
                table: "roomImages",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_roomImages_categoryId",
                table: "roomImages",
                column: "categoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_roomImages_roomCategories_categoryId",
                table: "roomImages",
                column: "categoryId",
                principalTable: "roomCategories",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_roomImages_roomCategories_categoryId",
                table: "roomImages");

            migrationBuilder.DropIndex(
                name: "IX_roomImages_categoryId",
                table: "roomImages");

            migrationBuilder.DropColumn(
                name: "categoryId",
                table: "roomImages");

            migrationBuilder.AlterColumn<long>(
                name: "roomId",
                table: "roomImages",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);
        }
    }
}
