using Juweirat.Application.DTOs.Accounting;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AccountsController(AccountingService accountingService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] AccountFilterParams filter)
        => Ok(await accountingService.GetAccountsAsync(filter));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id)
    {
        var dto = await accountingService.GetAccountByIdAsync(id);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpGet("{id:long}/movements")]
    public async Task<IActionResult> GetMovements(long id, [FromQuery] MovementFilterParams filter)
    {
        filter.AccountId = id;
        return Ok(await accountingService.GetMovementsAsync(filter));
    }

    [HttpGet("movements")]
    public async Task<IActionResult> GetAllMovements([FromQuery] MovementFilterParams filter)
        => Ok(await accountingService.GetMovementsAsync(filter));
}
