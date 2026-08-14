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
            // Drop old-named FKs if they exist (may not exist if AddRoomCategories rolled back)
            migrationBuilder.Sql(@"
                ALTER TABLE ""reservations"" DROP CONSTRAINT IF EXISTS ""FK_reservations_roomCategories_categoryId"";
                ALTER TABLE ""rooms""         DROP CONSTRAINT IF EXISTS ""FK_rooms_roomCategories_categoryId"";
            ");

            // Rename indexes only if the old name still exists
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IX_rooms_categoryId') THEN
                        ALTER INDEX ""IX_rooms_categoryId"" RENAME TO ""iX_rooms_categoryId"";
                    END IF;
                END $$;

                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IX_roomCategories_slug') THEN
                        ALTER INDEX ""IX_roomCategories_slug"" RENAME TO ""iX_roomCategories_slug"";
                    END IF;
                END $$;

                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IX_reservations_categoryId') THEN
                        ALTER INDEX ""IX_reservations_categoryId"" RENAME TO ""iX_reservations_categoryId"";
                    END IF;
                END $$;
            ");

            // Add new-named FKs only if they don't exist yet
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fK_reservations_RoomCategories_categoryId') THEN
                        ALTER TABLE ""reservations""
                            ADD CONSTRAINT ""fK_reservations_RoomCategories_categoryId""
                            FOREIGN KEY (""categoryId"") REFERENCES ""roomCategories"" (""id"") ON DELETE RESTRICT;
                    END IF;
                END $$;

                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fK_rooms_RoomCategories_categoryId') THEN
                        ALTER TABLE ""rooms""
                            ADD CONSTRAINT ""fK_rooms_RoomCategories_categoryId""
                            FOREIGN KEY (""categoryId"") REFERENCES ""roomCategories"" (""id"");
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop new-named FKs if they exist
            migrationBuilder.Sql(@"
                ALTER TABLE ""reservations"" DROP CONSTRAINT IF EXISTS ""fK_reservations_RoomCategories_categoryId"";
                ALTER TABLE ""rooms""         DROP CONSTRAINT IF EXISTS ""fK_rooms_RoomCategories_categoryId"";
            ");

            // Rename indexes back only if the new name still exists
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'iX_rooms_categoryId') THEN
                        ALTER INDEX ""iX_rooms_categoryId"" RENAME TO ""IX_rooms_categoryId"";
                    END IF;
                END $$;

                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'iX_roomCategories_slug') THEN
                        ALTER INDEX ""iX_roomCategories_slug"" RENAME TO ""IX_roomCategories_slug"";
                    END IF;
                END $$;

                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'iX_reservations_categoryId') THEN
                        ALTER INDEX ""iX_reservations_categoryId"" RENAME TO ""IX_reservations_categoryId"";
                    END IF;
                END $$;
            ");

            // Re-add old-named FKs only if they don't exist yet
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_reservations_roomCategories_categoryId') THEN
                        ALTER TABLE ""reservations""
                            ADD CONSTRAINT ""FK_reservations_roomCategories_categoryId""
                            FOREIGN KEY (""categoryId"") REFERENCES ""roomCategories"" (""id"") ON DELETE RESTRICT;
                    END IF;
                END $$;

                DO $$ BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_rooms_roomCategories_categoryId') THEN
                        ALTER TABLE ""rooms""
                            ADD CONSTRAINT ""FK_rooms_roomCategories_categoryId""
                            FOREIGN KEY (""categoryId"") REFERENCES ""roomCategories"" (""id"") ON DELETE SET NULL;
                    END IF;
                END $$;
            ");
        }
    }
}
