namespace Juweirat.Application.DTOs.ContactMessages;

public record ContactMessageDto(
    long Id,
    string Name,
    string Email,
    string? Phone,
    string Subject,
    string Message,
    string Status,
    string? ReplyMessage,
    DateTimeOffset? RepliedAt,
    string? RepliedBy,
    DateTimeOffset CreatedAt
);

public record ReplyContactMessageRequest(
    string ReplyBody
);
