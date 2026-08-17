using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Juweirat.Infrastructure.Migrations;

public partial class AddContactMessages : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "contactMessages",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                name = table.Column<string>(type: "text", nullable: false),
                email = table.Column<string>(type: "text", nullable: false),
                phone = table.Column<string>(type: "text", nullable: true),
                subject = table.Column<string>(type: "text", nullable: false),
                message = table.Column<string>(type: "text", nullable: false),
                status = table.Column<string>(type: "text", nullable: false, defaultValue: "New"),
                replyMessage = table.Column<string>(type: "text", nullable: true),
                repliedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                repliedBy = table.Column<string>(type: "text", nullable: true),
                createdAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_contactMessages", x => x.id);
            });

        migrationBuilder.CreateIndex(
            name: "IX_contactMessages_status",
            table: "contactMessages",
            column: "status");

        migrationBuilder.CreateIndex(
            name: "IX_contactMessages_createdAt",
            table: "contactMessages",
            column: "createdAt");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "contactMessages");
    }
}
