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

    public static int ComputeSolde(int totalHeb, int totalPdj, int totalDebiteur, int totalDependances, int paid, int arrhes)
        => Math.Max(0, totalHeb + totalPdj + totalDebiteur + totalDependances - paid - arrhes);
}
