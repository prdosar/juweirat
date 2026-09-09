# Déploiement agent MCP sur le VPS

Le schéma est géré automatiquement : les fichiers `migrations/*.sql` sont
appliqués au boot du container (voir `src/migrations.ts`). **Aucune commande
`psql` manuelle** à lancer à chaque deploy — juste `.env` + `docker compose`.

## Setup initial (une seule fois par env)

1. **User Postgres READ-ONLY** — création + mot de passe fort :
   ```bash
   MCP_RO_PW='<openssl rand -base64 24>'
   cat juweirat-mcp/scripts/create_mcp_ro_user.sql | \
     docker exec -i juweirat-postgres psql -U juweirat -d juweirat \
       -v mcp_password="'${MCP_RO_PW}'"
   ```
   Attendu : `users` **absent** de la liste des tables SELECTables par le RO.

2. **Tables chat initiales** (`ChatSessions`, `ChatMessages`, `McpAuditLog`) :
   ```bash
   cat juweirat-mcp-agent/scripts/create_chat_tables.sql | \
     docker exec -i juweirat-postgres psql -U juweirat -d juweirat
   ```

3. **`.env` racine** — variables minimales :
   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-<clé>
   AGENT_MODEL=claude-sonnet-4-6            # optionnel, défaut = ce modèle
   MCP_PG_USER=juweirat_mcp_ro
   MCP_PG_PASSWORD=<même_valeur_que_MCP_RO_PW>
   JWT_SECRET=<partagé_avec_juweirat-api>
   # Optionnel — canal Telegram staff
   TELEGRAM_BOT_TOKEN=<botfather>
   TELEGRAM_WEBHOOK_SECRET=<openssl rand -hex 32>
   TELEGRAM_ADMIN_IDS=<id_numérique_admin>
   ```

## Déploiement courant

```bash
git pull
docker compose build juweirat-mcp-agent
docker compose up -d juweirat-mcp-agent
docker compose restart nginx      # rafraîchir les upstreams (IPs Docker)
```

Les migrations `migrations/*.sql` neuves passent au boot. Log attendu :
```
[migrations] N migration(s) à appliquer : ...
[migrations] ✓ 20260909_001_add_content_blocks.sql (12ms)
[migrations] ✓ 20260909_002_grant_ro_new_tables.sql (8ms)
```

## Smoke tests

```bash
curl -s https://app.juweirat.com/agent/health | jq
# → {"status":"ok","model":"claude-sonnet-4-6","toolsCount":17,"telegram":true}
```

Puis widget admin (`https://app.juweirat.com`) ou bot Telegram → une question
type « occupation cette semaine ».

## Diagnostic

```bash
docker compose logs -f juweirat-mcp-agent

# Historique des migrations appliquées
docker exec -i juweirat-postgres psql -U juweirat -d juweirat -c \
  'SELECT "name", "appliedAt" FROM "_agent_migrations" ORDER BY "appliedAt";'

# Audit des appels de tools MCP
docker exec -i juweirat-postgres psql -U juweirat -d juweirat -c \
  'SELECT tool, "durationMs", "isError", "createdAt" FROM "McpAuditLog" ORDER BY "createdAt" DESC LIMIT 20;'
```

## Ajouter une nouvelle migration

1. Créer `migrations/YYYYMMDD_NNN_description.sql` (SQL pur, idempotent, pas de
   meta-commands psql `\d` `\echo` `\gexec`).
2. Commit + push. Le prochain deploy l'applique automatiquement au boot.

## Rollback

`docker compose stop juweirat-mcp-agent` suffit — aucun impact sur site/admin
(le widget affichera une erreur au premier message, c'est tout).
