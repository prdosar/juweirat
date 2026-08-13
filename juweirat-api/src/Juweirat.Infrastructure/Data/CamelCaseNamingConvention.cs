using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Conventions;

namespace Juweirat.Infrastructure.Data;

/// <summary>
/// Converts all EF Core table and column names to camelCase for PostgreSQL.
/// PascalCase entity/property names → camelCase DB names.
/// </summary>
public static class CamelCaseNamingExtensions
{
    public static ModelBuilder ApplyCamelCaseNaming(this ModelBuilder modelBuilder)
    {
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            // Skip entity types mapped to JSON — they use JSON property names, not column names.
            if (entity.IsMappedToJson())
                continue;

            // Table name
            var tableName = entity.GetTableName();
            if (tableName is not null)
                entity.SetTableName(ToCamelCase(tableName));

            // Column names
            foreach (var property in entity.GetProperties())
            {
                var columnName = property.GetColumnName();
                if (columnName is not null)
                    property.SetColumnName(ToCamelCase(columnName));
            }

            // Foreign key constraint names
            foreach (var fk in entity.GetForeignKeys())
            {
                var name = fk.GetConstraintName();
                if (name is not null)
                    fk.SetConstraintName(ToCamelCase(name));
            }

            // Index names
            foreach (var index in entity.GetIndexes())
            {
                var name = index.GetDatabaseName();
                if (name is not null)
                    index.SetDatabaseName(ToCamelCase(name));
            }
        }

        return modelBuilder;
    }

    private static string ToCamelCase(string name)
    {
        if (string.IsNullOrEmpty(name) || char.IsLower(name[0]))
            return name;

        return char.ToLowerInvariant(name[0]) + name[1..];
    }
}
