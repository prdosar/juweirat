using Juweirat.Application.DTOs.Pms;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/pms")]
[Authorize]
public class PmsController(PmsService pms, ClotureService cloture, FactureService facture, MaintenanceService maintenance, DebiteurService debiteur, MaintenanceStaffService maintenanceStaff) : ControllerBase
{
    // ── Config ────────────────────────────────────────────────────────────────

    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
    {
        var dto = await pms.GetConfigAsync();
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPut("config")]
    public async Task<IActionResult> UpdateConfig([FromBody] UpdateHotelConfigRequest req)
    {
        var dto = await pms.UpdateConfigAsync(req);
        return dto is null ? NotFound() : Ok(dto);
    }

    // ── Units ─────────────────────────────────────────────────────────────────

    [HttpGet("units")]
    public async Task<IActionResult> GetUnits()
        => Ok(await pms.GetUnitsAsync());

    [HttpGet("units/{id:long}")]
    public async Task<IActionResult> GetUnit(long id)
    {
        var dto = await pms.GetUnitByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPatch("units/{id:long}/menage")]
    public async Task<IActionResult> PatchMenage(long id, [FromBody] PatchMenageRequest req)
    {
        var (dto, error) = await pms.PatchMenageAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPatch("units/{id:long}/hs")]
    public async Task<IActionResult> PatchHorsService(long id, [FromBody] PatchHorsServiceRequest req)
    {
        var (dto, error) = await pms.PatchHorsServiceAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpGet("units/{id:long}/history")]
    public async Task<IActionResult> GetUnitHistory(long id, [FromQuery] int limit = 50)
    {
        var dto = await pms.GetRoomHistoryAsync(id, limit);
        return dto is null ? NotFound() : Ok(dto);
    }

    // ── Folios ────────────────────────────────────────────────────────────────

    [HttpGet("folios")]
    public async Task<IActionResult> GetFolios(
        [FromQuery] bool? closed = null,
        [FromQuery] long? unitId = null,
        [FromQuery] string? status = null)
        => Ok(await pms.GetFoliosAsync(closed, unitId, status));

    [HttpGet("folios/paged")]
    public async Task<IActionResult> GetPagedFolios([FromQuery] FolioFilterParams filter)
        => Ok(await pms.GetPagedFoliosAsync(filter));

    [HttpGet("folios/{id:long}")]
    public async Task<IActionResult> GetFolio(long id)
    {
        var dto = await pms.GetFolioByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpGet("folios/{id:long}/contract-data")]
    public async Task<IActionResult> GetContractData(long id)
    {
        var dto = await pms.GetContractDataAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("folios")]
    public async Task<IActionResult> CreateFolio([FromBody] CreateFolioRequest req)
    {
        var (dto, error) = await pms.CreateFolioAsync(req);
        if (error is not null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetFolio), new { id = dto!.Id }, dto);
    }

    [HttpPatch("folios/{id:long}")]
    public async Task<IActionResult> UpdateFolio(long id, [FromBody] UpdateFolioRequest req)
    {
        var (dto, error) = await pms.UpdateFolioAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("folios/{id:long}/checkin")]
    public async Task<IActionResult> CheckIn(long id)
    {
        var (dto, error) = await pms.CheckInAsync(id);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("folios/{id:long}/checkout")]
    public async Task<IActionResult> CheckOut(long id)
    {
        var (dto, error) = await pms.CheckOutAsync(id);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("folios/{id:long}/encaisser")]
    public async Task<IActionResult> Encaisser(long id, [FromBody] EncaisserRequest req)
    {
        var (dto, error) = await pms.EncaisserAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("folios/{id:long}/transfer-debiteur")]
    public async Task<IActionResult> TransferDebiteur(long id, [FromBody] TransfertDebiteurRequest req)
    {
        var (dto, error) = await pms.TransferDebiteurAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    // ── Facturation (depuis un folio) ─────────────────────────────────────────

    [HttpPost("folios/{id:long}/facturer")]
    public async Task<IActionResult> Facturer(long id)
    {
        var (dto, error) = await facture.EmettreAsync(id);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    // ── Clôture ───────────────────────────────────────────────────────────────

    [HttpGet("cloture/preview")]
    public async Task<IActionResult> GetCloturePreview()
    {
        var dto = await cloture.GetPreviewAsync();
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("cloture")]
    public async Task<IActionResult> ExecuteCloture()
    {
        var (dto, error) = await cloture.ExecuteAsync();
        if (error is not null) return UnprocessableEntity(new { error });
        return Ok(dto);
    }

    [HttpGet("cloture/history")]
    public async Task<IActionResult> GetClotureHistory([FromQuery] int limit = 90)
        => Ok(await cloture.GetHistoryAsync(limit));

    [HttpGet("cloture/{date}")]
    public async Task<IActionResult> GetClotureByDate(DateOnly date)
    {
        var dto = await cloture.GetByDateAsync(date);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpGet("postings")]
    public async Task<IActionResult> GetPostings(
        [FromQuery] DateOnly? date = null,
        [FromQuery] long? folioId = null)
        => Ok(await cloture.GetPostingsAsync(date, folioId));

    // ── Factures ──────────────────────────────────────────────────────────────

    [HttpGet("factures")]
    public async Task<IActionResult> GetFactures(
        [FromQuery] string? search = null,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null)
        => Ok(await facture.GetAllAsync(search, from, to));

    [HttpGet("factures/{id:long}")]
    public async Task<IActionResult> GetFacture(long id)
    {
        var dto = await facture.GetByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("factures/{id:long}/annuler")]
    public async Task<IActionResult> AnnulerFacture(long id)
    {
        var (dto, error) = await facture.AnnulerAsync(id);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPatch("factures/{id:long}/rectifier")]
    public async Task<IActionResult> RectifierFacture(long id, [FromBody] RectifierRequest req)
    {
        var (dto, error) = await facture.RectifierAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("factures/{id:long}/print")]
    public async Task<IActionResult> PrintFacture(long id)
    {
        var dto = await facture.IncrementPrintAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    // ── Maintenance ───────────────────────────────────────────────────────────

    [HttpGet("maintenance")]
    public async Task<IActionResult> GetTickets(
        [FromQuery] string? status = null,
        [FromQuery] string? priority = null,
        [FromQuery] long? unitId = null)
        => Ok(await maintenance.GetAllAsync(status, priority, unitId));

    [HttpGet("maintenance/{id:long}")]
    public async Task<IActionResult> GetTicket(long id)
    {
        var dto = await maintenance.GetByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("maintenance")]
    public async Task<IActionResult> CreateTicket([FromBody] CreateMaintenanceRequest req)
    {
        var (dto, error) = await maintenance.CreateAsync(req);
        if (error is not null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetTicket), new { id = dto!.Id }, dto);
    }

    [HttpPatch("maintenance/{id:long}")]
    public async Task<IActionResult> UpdateTicket(long id, [FromBody] UpdateMaintenanceRequest req)
    {
        var (dto, error) = await maintenance.UpdateAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpDelete("maintenance/{id:long}")]
    public async Task<IActionResult> DeleteTicket(long id)
        => await maintenance.DeleteAsync(id) ? NoContent() : NotFound();

    // ── Maintenance Categories ─────────────────────────────────────────────────

    [HttpGet("maintenance-categories")]
    public async Task<IActionResult> GetCategories()
        => Ok(await maintenanceStaff.GetCategoriesAsync());

    [HttpPost("maintenance-categories")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateMaintenanceCategoryRequest req)
    {
        var dto = await maintenanceStaff.CreateCategoryAsync(req);
        return CreatedAtAction(nameof(GetCategories), dto);
    }

    [HttpPatch("maintenance-categories/{id:long}")]
    public async Task<IActionResult> UpdateCategory(long id, [FromBody] UpdateMaintenanceCategoryRequest req)
    {
        var dto = await maintenanceStaff.UpdateCategoryAsync(id, req);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpDelete("maintenance-categories/{id:long}")]
    public async Task<IActionResult> DeleteCategory(long id)
    {
        var ok = await maintenanceStaff.DeleteCategoryAsync(id);
        return ok ? NoContent() : Conflict(new { error = "Cannot delete category with existing staff" });
    }

    // ── Maintenance Staff ─────────────────────────────────────────────────────

    [HttpGet("maintenance-staff")]
    public async Task<IActionResult> GetStaff([FromQuery] long? categoryId, [FromQuery] bool activeOnly = false)
        => Ok(await maintenanceStaff.GetStaffAsync(categoryId, activeOnly));

    [HttpPost("maintenance-staff")]
    public async Task<IActionResult> CreateStaff([FromBody] CreateMaintenanceStaffRequest req)
    {
        var (dto, error) = await maintenanceStaff.CreateStaffAsync(req);
        if (error is not null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetStaff), dto);
    }

    [HttpPatch("maintenance-staff/{id:long}")]
    public async Task<IActionResult> UpdateStaff(long id, [FromBody] UpdateMaintenanceStaffRequest req)
    {
        var dto = await maintenanceStaff.UpdateStaffAsync(id, req);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpDelete("maintenance-staff/{id:long}")]
    public async Task<IActionResult> DeleteStaff(long id)
        => await maintenanceStaff.DeleteStaffAsync(id) ? NoContent() : NotFound();

    // ── Débiteurs ─────────────────────────────────────────────────────────────

    [HttpGet("debiteurs")]
    public async Task<IActionResult> GetDebiteurs()
        => Ok(await debiteur.GetAllAsync());

    [HttpGet("debiteurs/{id:long}")]
    public async Task<IActionResult> GetDebiteur(long id)
    {
        var dto = await debiteur.GetByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("debiteurs")]
    public async Task<IActionResult> CreateDebiteur([FromBody] CreateDebiteurRequest req)
    {
        var (dto, error) = await debiteur.CreateAsync(req);
        if (error is not null) return BadRequest(new { error });
        return CreatedAtAction(nameof(GetDebiteur), new { id = dto!.Id }, dto);
    }

    [HttpPatch("debiteurs/{id:long}")]
    public async Task<IActionResult> UpdateDebiteur(long id, [FromBody] UpdateDebiteurRequest req)
    {
        var (dto, error) = await debiteur.UpdateAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("debiteurs/{id:long}/payer")]
    public async Task<IActionResult> PayDebiteur(long id, [FromBody] PayDebiteurRequest req)
    {
        var (dto, error) = await debiteur.PayAsync(id, req);
        if (error is not null) return BadRequest(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpDelete("debiteurs/{id:long}")]
    public async Task<IActionResult> DeleteDebiteur(long id)
        => await debiteur.DeleteAsync(id) ? NoContent() : NotFound();
}
