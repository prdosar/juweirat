using Juweirat.Application.DTOs.Accounting;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

// Accessible à tous les utilisateurs authentifiés pour le moment.
// Les restrictions par rôle (comptable/admin uniquement pour l'accès en
// écriture) seront introduites plus tard.
[ApiController]
[Route("api/comptabilite")]
[Authorize]
public class ComptabiliteController(AccountingService accountingService, BackfillService backfillService) : ControllerBase
{
    // Journal de caisse — agrégation par événement (Payment / VenteDirecte / Facture) avec HT/TVA/TTC.
    [HttpGet("journal")]
    public async Task<IActionResult> GetJournal([FromQuery] JournalFilterParams filter)
        => Ok(await accountingService.GetJournalAsync(filter));

    // Rejeu comptable des événements antérieurs (idempotent). Admin uniquement.
    [HttpPost("backfill")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Backfill()
    {
        var result = await backfillService.RunAsync();
        return Ok(new
        {
            payments      = result.Payments,
            ventes        = result.Ventes,
            factures      = result.Factures,
            noShow        = result.NoShow,
            cancellations = result.Cancellations,
        });
    }
}
