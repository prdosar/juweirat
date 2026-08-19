using Juweirat.Domain.Entities;
using Juweirat.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Juweirat.Infrastructure.Data;

// Seed initial du module Compta + backfill des comptes auxiliaires pour les
// tiers déjà présents en base au moment de l'activation.
// Idempotent : safe à ré-exécuter à chaque démarrage.
public static class AccountingSeeder
{
    // Libellés stables pour les comptes système (utilisés côté UI comptable).
    private static readonly (AccountKind Kind, string Name)[] SystemAccounts =
    [
        (AccountKind.RevenueHebergement,  "Revenus Hébergement"),
        (AccountKind.RevenueNoShow,       "Revenus No Show"),
        (AccountKind.RevenueCancellation, "Revenus Annulation"),
        (AccountKind.TvaCollected,        "TVA Collectée"),
        (AccountKind.Expense,             "Sorties / Dépenses diverses"),
    ];

    public static async Task SeedAsync(AppDbContext db)
    {
        await SeedSystemAccountsAsync(db);
        await SeedDefaultCashRegisterAsync(db);
        await BackfillClientAccountsAsync(db);
        await BackfillCompanyAccountsAsync(db);
        await BackfillPrestationAccountsAsync(db);
    }

    private static async Task SeedSystemAccountsAsync(AppDbContext db)
    {
        var existing = await db.Accounts
            .Where(a => a.OwnerRefId == null)
            .Select(a => a.Kind)
            .ToListAsync();

        foreach (var (kind, name) in SystemAccounts)
        {
            if (existing.Contains(kind)) continue;
            db.Accounts.Add(new Account
            {
                Kind       = kind,
                Name       = name,
                OwnerRefId = null,
                Balance    = 0m,
            });
        }
        await db.SaveChangesAsync();
    }

    private static async Task SeedDefaultCashRegisterAsync(AppDbContext db)
    {
        var reception = await db.CashRegisters.FirstOrDefaultAsync(r => r.Name == "Réception");
        if (reception is null)
        {
            reception = new CashRegister
            {
                Name     = "Réception",
                Location = "Comptoir accueil",
                IsActive = true,
            };
            db.CashRegisters.Add(reception);
            await db.SaveChangesAsync();
        }

        var registerAccount = await db.Accounts.FirstOrDefaultAsync(
            a => a.Kind == AccountKind.CashRegister && a.OwnerRefId == reception.Id);
        if (registerAccount is null)
        {
            db.Accounts.Add(new Account
            {
                Kind       = AccountKind.CashRegister,
                Name       = $"Caisse {reception.Name}",
                OwnerRefId = reception.Id,
                Balance    = 0m,
            });
            await db.SaveChangesAsync();
        }
    }

    private static async Task BackfillClientAccountsAsync(AppDbContext db)
    {
        var withAccount = await db.Accounts
            .Where(a => a.Kind == AccountKind.Client && a.OwnerRefId != null)
            .Select(a => a.OwnerRefId!.Value)
            .ToListAsync();
        var withAccountSet = withAccount.ToHashSet();

        var missing = await db.Clients
            .Where(c => !withAccountSet.Contains(c.Id))
            .Select(c => new { c.Id, c.FirstName, c.LastName })
            .ToListAsync();

        foreach (var c in missing)
        {
            var fullName = $"{c.FirstName} {c.LastName}".Trim();
            db.Accounts.Add(new Account
            {
                Kind       = AccountKind.Client,
                Name       = string.IsNullOrEmpty(fullName) ? $"Client #{c.Id}" : fullName,
                OwnerRefId = c.Id,
                Balance    = 0m,
            });
        }
        if (missing.Count > 0) await db.SaveChangesAsync();
    }

    private static async Task BackfillCompanyAccountsAsync(AppDbContext db)
    {
        var withAccount = await db.Accounts
            .Where(a => a.Kind == AccountKind.Company && a.OwnerRefId != null)
            .Select(a => a.OwnerRefId!.Value)
            .ToListAsync();
        var withAccountSet = withAccount.ToHashSet();

        var missing = await db.Companies
            .Where(c => !withAccountSet.Contains(c.Id))
            .Select(c => new { c.Id, c.Name })
            .ToListAsync();

        foreach (var c in missing)
        {
            db.Accounts.Add(new Account
            {
                Kind       = AccountKind.Company,
                Name       = string.IsNullOrEmpty(c.Name) ? $"Compagnie #{c.Id}" : c.Name,
                OwnerRefId = c.Id,
                Balance    = 0m,
            });
        }
        if (missing.Count > 0) await db.SaveChangesAsync();
    }

    private static async Task BackfillPrestationAccountsAsync(AppDbContext db)
    {
        var withAccount = await db.Accounts
            .Where(a => a.Kind == AccountKind.Prestation && a.OwnerRefId != null)
            .Select(a => a.OwnerRefId!.Value)
            .ToListAsync();
        var withAccountSet = withAccount.ToHashSet();

        var missing = await db.PrestationsAnnexes
            .Where(p => !withAccountSet.Contains(p.Id))
            .Select(p => new { p.Id, p.NameFr })
            .ToListAsync();

        foreach (var p in missing)
        {
            db.Accounts.Add(new Account
            {
                Kind       = AccountKind.Prestation,
                Name       = string.IsNullOrEmpty(p.NameFr) ? $"Prestation #{p.Id}" : $"Prestation — {p.NameFr}",
                OwnerRefId = p.Id,
                Balance    = 0m,
            });
        }
        if (missing.Count > 0) await db.SaveChangesAsync();
    }
}
