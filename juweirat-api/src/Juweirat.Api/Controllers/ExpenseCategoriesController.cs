using Juweirat.Application.DTOs.Expenses;
using Juweirat.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juweirat.Api.Controllers;

[ApiController]
[Route("api/expense-categories")]
[Authorize]
public class ExpenseCategoriesController(ExpenseCategoryService categoryService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
        => Ok(await categoryService.GetAllAsync(includeInactive));

    [HttpPost]
    [Authorize(Roles = "admin,comptable")]
    public async Task<IActionResult> Create([FromBody] CreateExpenseCategoryRequest req)
    {
        var (dto, error) = await categoryService.CreateAsync(req);
        if (error is not null) return Conflict(new { error });
        return Ok(dto);
    }

    [HttpPatch("{id:long}")]
    [Authorize(Roles = "admin,comptable")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateExpenseCategoryRequest req)
    {
        var (dto, error) = await categoryService.UpdateAsync(id, req);
        if (error is not null) return Conflict(new { error });
        return dto is null ? NotFound() : Ok(dto);
    }
}
