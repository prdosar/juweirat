using System.Security.Claims;
using Juweirat.Application.DTOs.CompanyContracts;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/company-contracts")]
[Authorize]
public class CompanyContractsController(
    CompanyContractService contractService,
    ContractInvoiceService invoiceService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] CompanyContractFilterParams filter)
        => Ok(await contractService.GetPagedAsync(filter));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var dto = await contractService.GetByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    // ── Factures mensuelles (sous-ressource) ─────────────────────────────

    [HttpGet("{id:long}/invoices")]
    public async Task<IActionResult> GetInvoices(long id)
    {
        var contract = await contractService.GetByIdAsync(id);
        if (contract is null) return NotFound();
        return Ok(await invoiceService.GetByContractAsync(id));
    }

    [HttpPost("{id:long}/invoices")]
    [Authorize(Roles = "admin,receptionniste,comptable")]
    public async Task<IActionResult> GenerateInvoice(long id, [FromBody] GenerateContractInvoiceRequest req)
    {
        var (dto, error) = await invoiceService.GenerateAsync(id, req.Year, req.Month, GetCurrentUserId());
        if (error is not null)
            return error.Contains("introuvable") ? NotFound(new { error }) : Conflict(new { error });
        return CreatedAtAction(nameof(ContractInvoicesController.GetById), "ContractInvoices", new { invoiceId = dto!.Id }, dto);
    }

    [HttpPost]
    [Authorize(Roles = "admin,receptionniste,comptable")]
    public async Task<IActionResult> Create([FromBody] CreateCompanyContractRequest req)
    {
        var userId = GetCurrentUserId();
        var (dto, error) = await contractService.CreateAsync(req, userId);
        if (error is not null) return Conflict(new { error });
        return CreatedAtAction(nameof(GetById), new { id = dto!.Id }, dto);
    }

    [HttpPatch("{id:long}")]
    [Authorize(Roles = "admin,receptionniste,comptable")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateCompanyContractRequest req)
    {
        var (dto, error) = await contractService.UpdateAsync(id, req);
        if (error is not null) return Conflict(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("{id:long}/end")]
    [Authorize(Roles = "admin,receptionniste,comptable")]
    public async Task<IActionResult> End(long id, [FromBody] EndContractRequest? req)
    {
        var (success, error) = await contractService.EndAsync(id, req?.EndedOn);
        if (!success) return error is not null && error.Contains("introuvable") ? NotFound(new { error }) : BadRequest(new { error });
        return NoContent();
    }

    [HttpPost("{id:long}/cancel")]
    [Authorize(Roles = "admin,receptionniste,comptable")]
    public async Task<IActionResult> Cancel(long id)
    {
        var (success, error) = await contractService.CancelAsync(id);
        if (!success) return error is not null && error.Contains("introuvable") ? NotFound(new { error }) : BadRequest(new { error });
        return NoContent();
    }

    private long? GetCurrentUserId()
    {
        var val = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
        return long.TryParse(val, out var id) ? id : null;
    }
}

public record EndContractRequest(DateOnly? EndedOn);

[ApiController]
[Route("api/contract-invoices")]
[Authorize]
public class ContractInvoicesController(ContractInvoiceService invoiceService) : ControllerBase
{
    [HttpGet("{invoiceId:long}")]
    public async Task<IActionResult> GetById(long invoiceId)
    {
        var dto = await invoiceService.GetByIdAsync(invoiceId);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("{invoiceId:long}/pay")]
    [Authorize(Roles = "admin,receptionniste,comptable")]
    public async Task<IActionResult> Pay(long invoiceId, [FromBody] MarkInvoicePaidRequest req)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? User.FindFirst("sub")?.Value;
        var uid = long.TryParse(userId, out var id) ? (long?)id : null;

        var (dto, error) = await invoiceService.MarkPaidAsync(invoiceId, req, uid);
        if (error is not null) return Conflict(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost("{invoiceId:long}/cancel")]
    [Authorize(Roles = "admin,receptionniste,comptable")]
    public async Task<IActionResult> Cancel(long invoiceId)
    {
        var (dto, error) = await invoiceService.CancelAsync(invoiceId);
        if (error is not null) return Conflict(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }
}
