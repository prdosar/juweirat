namespace Juweirat.Domain.Enums;

// Fréquence de facturation d'un contrat compagnie long terme.
// La valeur numérique = nombre de mois couverts par une facture.
public enum BillingFrequency
{
    Monthly    = 1,
    Quarterly  = 3,
    SemiAnnual = 6,
    Annual     = 12,
}

public static class BillingFrequencyExtensions
{
    public static int MonthsPerPeriod(this BillingFrequency f) => (int)f;
}
