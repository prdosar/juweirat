import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:juweiratapp/app/theme.dart';
import 'package:juweiratapp/app/di.dart';
import 'package:juweiratapp/core/formatters/formatters.dart';
import 'package:juweiratapp/core/models/dtos.dart';
import 'package:juweiratapp/shared/widgets/shared_widgets.dart';
import 'package:juweiratapp/shared/widgets/main_shell.dart';

final roomsDataProvider = FutureProvider.autoDispose((ref) async {
  final roomsRepo = ref.watch(roomsRepositoryProvider);
  final pmsRepo = ref.watch(pmsRepositoryProvider);
  final results = await Future.wait([
    roomsRepo.getRooms(),
    roomsRepo.getCategories(),
    pmsRepo.getUnits(),
  ]);
  return {
    'rooms': results[0] as List<RoomDto>,
    'categories': results[1] as List<RoomCategoryDto>,
    'units': results[2] as List<UnitDto>,
  };
});

class RoomsTarifsPage extends ConsumerStatefulWidget {
  const RoomsTarifsPage({super.key});

  @override
  ConsumerState<RoomsTarifsPage> createState() => _RoomsTarifsPageState();
}

class _RoomsTarifsPageState extends ConsumerState<RoomsTarifsPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedStatus = 'all';
  int? _selectedFloor;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dataAsync = ref.watch(roomsDataProvider);

    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) {
            final canPop = Navigator.of(ctx).canPop();
            if (canPop) {
              return IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () => Navigator.of(ctx).pop(),
              );
            }
            return IconButton(
              icon: const Icon(Icons.menu_rounded),
              tooltip: 'Menu latéral',
              onPressed: () => mainScaffoldKey.currentState?.openDrawer(),
            );
          },
        ),
        title: const Text('Chambres & Tarifs'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(roomsDataProvider),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: JuweiratColors.green,
          unselectedLabelColor: const Color(0xFF9CA3AF),
          indicatorColor: JuweiratColors.green,
          indicatorWeight: 3,
          tabs: const [
            Tab(text: 'Inventaire Unités'),
            Tab(text: 'Grille Tarifaire Catégories'),
          ],
        ),
      ),
      body: dataAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Erreur: $err', style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.refresh(roomsDataProvider),
                child: const Text('Réessayer'),
              ),
            ],
          ),
        ),
        data: (data) {
          final rooms = data['rooms'] as List<RoomDto>;
          final categories = data['categories'] as List<RoomCategoryDto>;
          final units = data['units'] as List<UnitDto>;

          return TabBarView(
            controller: _tabController,
            children: [
              _buildUnitsTab(rooms, units),
              _buildCategoriesTab(categories),
            ],
          );
        },
      ),
    );
  }

  Widget _buildUnitsTab(List<RoomDto> rooms, List<UnitDto> units) {
    final floors = units.isNotEmpty
        ? (units.map((u) => u.floor).toSet().toList()..sort())
        : (rooms.map((r) => r.floor).toSet().toList()..sort());

    final filteredUnits = units.where((u) {
      if (_selectedFloor != null && u.floor != _selectedFloor) return false;
      if (_selectedStatus == 'available') return !u.horsService && u.currentFolioNumber == null;
      if (_selectedStatus == 'occupied') return u.currentFolioNumber != null;
      if (_selectedStatus == 'hs') return u.horsService;
      return true;
    }).toList();

    return Column(
      children: [
        // Filter row
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildStatusChip('all', 'Tous'),
                const SizedBox(width: 8),
                _buildStatusChip('available', 'Disponibles'),
                const SizedBox(width: 8),
                _buildStatusChip('occupied', 'Occupées'),
                const SizedBox(width: 8),
                _buildStatusChip('hs', 'Hors Service'),
                const SizedBox(width: 16),
                DropdownButton<int?>(
                  value: _selectedFloor,
                  hint: const Text('Tous étages', style: TextStyle(fontSize: 12)),
                  underline: const SizedBox(),
                  items: [
                    const DropdownMenuItem<int?>(value: null, child: Text('Tous étages', style: TextStyle(fontSize: 12))),
                    ...floors.map((f) => DropdownMenuItem<int?>(value: f, child: Text('Étage $f', style: const TextStyle(fontSize: 12)))),
                  ],
                  onChanged: (val) => setState(() => _selectedFloor = val),
                ),
              ],
            ),
          ),
        ),
        const Divider(height: 1, color: JuweiratColors.cardBorder),
        Expanded(
          child: filteredUnits.isEmpty
              ? const EmptyState(message: 'Aucune chambre ne correspond aux filtres', icon: Icons.hotel_rounded)
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: filteredUnits.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final u = filteredUnits[index];
                    final statusLabel = u.horsService
                        ? 'Hors Service'
                        : (u.currentFolioNumber != null ? 'Occupé' : 'Disponible');

                    return JuweiratCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: JuweiratColors.charcoal,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      u.pmsRoomNo ?? 'Appt ${u.id}',
                                      style: const TextStyle(color: JuweiratColors.goldLight, fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Text(
                                    'Étage ${u.floor} · Type ${u.pmsType ?? "-"}',
                                    style: const TextStyle(fontSize: 13, color: Color(0xFF6B7280), fontWeight: FontWeight.w500),
                                  ),
                                ],
                              ),
                              StatusBadge(status: statusLabel),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            u.nameFr.isNotEmpty ? u.nameFr : 'Appartement ${u.pmsRoomNo ?? ""}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: JuweiratColors.charcoal),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Nuitée: ${money(u.tarifNuit)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: JuweiratColors.greenDark)),
                              Text('15j: ${money(u.tarifN15)}', style: const TextStyle(fontSize: 12, color: Color(0xFF4B5563))),
                              Text('30j: ${money(u.tarifN30)}', style: const TextStyle(fontSize: 12, color: Color(0xFF4B5563))),
                            ],
                          ),
                          if (u.currentFolioNumber != null) ...[
                            const SizedBox(height: 8),
                            const Divider(height: 1, color: JuweiratColors.cardBorder),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                const Icon(Icons.person_pin_rounded, size: 14, color: JuweiratColors.greenDark),
                                const SizedBox(width: 6),
                                Text(
                                  'En séjour · Folio ${u.currentFolioNumber}',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: JuweiratColors.greenDark),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildCategoriesTab(List<RoomCategoryDto> categories) {
    if (categories.isEmpty) {
      return const EmptyState(message: 'Aucune catégorie configurée', icon: Icons.category_rounded);
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: categories.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final cat = categories[index];
        return JuweiratCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    cat.nameFr,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: JuweiratColors.charcoal),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDBEAFE),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${cat.roomCount} Unité(s)',
                      style: const TextStyle(color: Color(0xFF1D4ED8), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Capacité: ${cat.capacityAdults} Adulte(s), ${cat.capacityChildren} Enfant(s) · Gamme: ${cat.pmsGamme}',
                style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
              ),
              const SizedBox(height: 10),
              const Divider(height: 1, color: JuweiratColors.cardBorder),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildPriceColumn('Nuitée standard', cat.tarifNuit),
                  _buildPriceColumn('Tarif 15 Nuits', cat.tarifN15),
                  _buildPriceColumn('Tarif 30 Nuits', cat.tarifN30),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPriceColumn(String label, int amount) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF9CA3AF), fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            money(amount),
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: JuweiratColors.charcoal),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusChip(String key, String label) {
    final selected = _selectedStatus == key;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => setState(() => _selectedStatus = key),
      selectedColor: JuweiratColors.green,
      labelStyle: TextStyle(
        color: selected ? Colors.white : const Color(0xFF4B5563),
        fontWeight: selected ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
    );
  }
}
