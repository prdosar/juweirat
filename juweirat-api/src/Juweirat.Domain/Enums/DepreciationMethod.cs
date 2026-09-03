namespace Juweirat.Domain.Enums;

public enum DepreciationMethod
{
    Linear,    // Linéaire : (Coût - Résiduelle) / DuréeMois
    Declining  // Dégressive : VNC × taux (1/DuréeMois × 2)
}
