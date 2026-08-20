using System.Security.Claims;
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

    // Grand livre par compte — mouvements chronologiques + solde progressif.
    [HttpGet("grand-livre/{accountId:long}")]
    public async Task<IActionResult> GetLedger(long accountId, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var dto = await accountingService.GetLedgerAsync(accountId, from, to);
        return dto is null ? NotFound() : Ok(dto);
    }

    // Balance générale / auxiliaire filtrable par nature (Client / CashRegister / RevenueHebergement / …).
    [HttpGet("balance")]
    public async Task<IActionResult> GetBalance([FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? kind)
        => Ok(await accountingService.GetBalanceAsync(from, to, kind));

    // État TVA — HT + TVA collectée par période avec détail par événement.
    [HttpGet("tva")]
    public async Task<IActionResult> GetTvaReport([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        => Ok(await accountingService.GetTvaReportAsync(from, to));

    // Saisie manuelle d'une opération diverse (OD). Écriture équilibrée débit=crédit.
    // Réservée aux comptables et administrateurs.
    [HttpPost("od")]
    [Authorize(Roles = "admin,comptable")]
    public async Task<IActionResult> PostOd([FromBody] CreateOdRequest req)
    {
        var uidRaw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        long? uid = long.TryParse(uidRaw, out var u) ? u : null;
        var (created, error) = await accountingService.PostManualOdAsync(req, uid);
        if (error is not null) return BadRequest(new { error });
        return Ok(new { lignes = created });
    }
}
