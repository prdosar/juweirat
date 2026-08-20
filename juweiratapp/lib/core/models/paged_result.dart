int _toInt(dynamic value, [int defaultValue = 0]) {
  if (value == null) return defaultValue;
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) {
    final n = num.tryParse(value);
    if (n != null) return n.toInt();
  }
  return defaultValue;
}

class PagedResult<T> {
  final List<T> items;
  final int pageNumber;
  final int pageSize;
  final int totalCount;
  final int totalPages;
  final bool hasPreviousPage;
  final bool hasNextPage;

  const PagedResult({
    required this.items,
    required this.pageNumber,
    required this.pageSize,
    required this.totalCount,
    required this.totalPages,
    required this.hasPreviousPage,
    required this.hasNextPage,
  });

  factory PagedResult.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic json) fromJsonT,
  ) {
    final rawList = json['items'] as List<dynamic>? ?? [];
    return PagedResult<T>(
      items: rawList.map((e) => fromJsonT(e)).toList(),
      pageNumber: _toInt(json['pageNumber'], 1),
      pageSize: _toInt(json['pageSize'], 10),
      totalCount: _toInt(json['totalCount'], 0),
      totalPages: _toInt(json['totalPages'], 0),
      hasPreviousPage: json['hasPreviousPage'] as bool? ?? false,
      hasNextPage: json['hasNextPage'] as bool? ?? false,
    );
  }
}
