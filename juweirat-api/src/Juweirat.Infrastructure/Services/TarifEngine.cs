using Juweirat.Domain.Enums;

namespace Juweirat.Infrastructure.Services;

public static class TarifEngine
{
    public readonly record struct TarifResult(TarifTier Tier, int PerNight, bool ElecIncluded);

    // Spec §5.3: tier selection by stay length
    public static TarifResult ForStay(int tarifNuit, int tarifN15, int tarifN30, int nights)
    {
        if (nights >= 30) return new(TarifTier.N30Nuits, tarifN30, false);
        if (nights >= 15) return new(TarifTier.N15Nuits, tarifN15, false);
        return new(TarifTier.Nuitee, tarifNuit, true);
    }

    public static int ComputeHeb(int rate, int heb, int nights)
        => heb > 0 ? heb : rate * nights;

    // Taux TVA appliqué à l'hôtellerie au Togo.
    public const decimal TVA_RATE = 0.18m;

    // Solde à régler par le client (TTC). Convention : les montants passés
    // (totalHeb, totalPdj, totalDebiteur, totalDependances) sont HT.
    // paid et arrhes sont l'argent reçu du client (TTC).
    // Retourne : max(0, TTC_total - paid - arrhes).
    public static int ComputeSolde(int totalHeb, int totalPdj, int totalDebiteur, int totalDependances, int paid, int arrhes, bool tvaExonere = false)
    {
        var totalHt  = totalHeb + totalPdj + totalDebiteur + totalDependances;
        var tva      = tvaExonere ? 0 : (int)Math.Round(totalHt * TVA_RATE);
        var totalTtc = totalHt + tva;
        return Math.Max(0, totalTtc - paid - arrhes);
    }
}
