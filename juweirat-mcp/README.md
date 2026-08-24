# juweirat-mcp

Serveur MCP **read-only** exposant les données Juweirat (Postgres) à un agent Claude.

## Ce qu'il expose (Sprint 1 — 13 tools)

**Occupation & revenus**
| Tool              | Description |
|-------------------|-------------|
| `get_occupancy`   | Taux d'occupation (nuit-chambres occupées / disponibles) sur une période, filtrable par catégorie T1..T4. Source : `folios`. |
| `get_revenue`     | CA encaissé (FCFA) sur une période depuis `accountMovements` (reason='Encaissement'). Breakdown : `day`/`cash_register`/`source_type`. |
| `compare_periods` | Compare 2 périodes sur `occupancy` ou `revenue`, retourne delta absolu et %. |

**Réservations**
| Tool                  | Description |
|-----------------------|-------------|
| `search_reservations` | Recherche multi-filtres (statut, dates check-in, catégorie, client). |
| `get_reservation`     | Détail complet (par ID ou référence JW-YYYY-NNNNN) + paiements + prestations. |
| `get_client_history`  | Historique complet d'un client + totaux (séjours, nuits, dépensé, payé). |
| `get_no_show_stats`   | Compte + valeur perdue + retenues (folios NoShow) par période, ventilé par catégorie. |

**Folios & compta**
| Tool                  | Description |
|-----------------------|-------------|
| `get_folio`           | Détail folio par numéro / ID / `res:{id}` + postings (main courante). |
| `list_unpaid_folios`  | Folios non-clôturés avec solde restant dû, tri décroissant. |
| `get_cash_report`     | Rapport journalier des mouvements de caisse (par raison + par caisse). |
| `get_tva_report`      | CA HT/TVA/TTC période, séparé exonéré vs assujetti (18%). |

**Housekeeping & maintenance**
| Tool                          | Description |
|-------------------------------|-------------|
| `list_rooms_by_status`        | État des 19 chambres PMS par (statut × ménage × hors service). |
| `list_maintenance_incidents`  | Tickets ouverts + en cours par défaut, triés par priorité. |

## Installation

```bash
cd juweirat-mcp
npm install
cp .env.example .env
# éditer .env avec le mot de passe du user RO
```

## Créer le user Postgres read-only

Une seule fois, sur la base cible :

```bash
docker exec -i juweirat-postgres psql -U juweirat -d juweirat \
  -v mcp_password="'MOT_DE_PASSE_FORT'" \
  < scripts/create_mcp_ro_user.sql
```

Le rôle `juweirat_mcp_ro` obtient `SELECT` sur les tables métier uniquement — pas sur `users` (comptes admin), et pas de `INSERT`/`UPDATE`/`DELETE` nulle part.

## Lancement

```bash
npm run dev              # dev, TS direct via tsx
npm run build && npm start # build puis exécution du JS compilé
```

Le serveur communique via **stdio** (protocole MCP standard). Il n'écoute sur aucun port.

## Tester avec mcp-inspector

```bash
npm run inspect
```

Ouvre une UI web (par défaut sur http://localhost:6274) qui liste les tools, permet d'appeler chacun avec des paramètres et affiche la réponse JSON.

Exemples de payloads :

```json
// get_occupancy
{ "from": "2026-08-01", "to": "2026-08-24" }

// get_occupancy filtré T3
{ "from": "2026-08-01", "to": "2026-08-24", "category": "T3" }

// get_revenue avec ventilation par caisse
{ "from": "2026-08-01", "to": "2026-08-24", "breakdown": "cash_register" }

// compare_periods : août vs juillet
{
  "metric": "revenue",
  "a": { "from": "2026-07-01", "to": "2026-07-31" },
  "b": { "from": "2026-08-01", "to": "2026-08-31" }
}
```

## Sécurité

- Connexion Postgres via un rôle dédié `juweirat_mcp_ro`, `SELECT` uniquement, `users` explicitement révoqué.
- `statement_timeout` fixé côté pool (5 s par défaut) → aucune requête ne peut geler la base.
- Toutes les valeurs paramétrables passent par des `$n` (jamais de concaténation SQL).
- Tables résultats bornées via `MCP_MAX_ROWS` (200 par défaut).

## Conventions techniques

- Tables et colonnes en **camelCase** (voir `AppDbContext.ApplyCamelCaseNaming`), donc `"roomCategories"`, `"checkInDate"`, etc. — les identifiants case-sensitive sont toujours entre guillemets doubles dans les requêtes.
- Enums stockés en **string** (`Status = 'Confirmed'`, `Reason = 'Encaissement'`).
- Devise unique **XOF** (FCFA), montants entiers ou 2 décimales max.
