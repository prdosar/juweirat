# Déploiement agent MCP sur le VPS

Guide à copier-coller sur le VPS `juweirat.com` pour mettre l'agent en prod.

Toutes les commandes sont à exécuter depuis `~/apps/juweirat/` (chemin repo côté serveur — à ajuster si différent).

## 1. Pré-requis

- Docker Desktop / docker-ce fonctionnel sur le VPS (déjà OK).
- Nginx hôte en front (déjà OK, il proxy `app.juweirat.com` vers `127.0.0.1:3002`).
- Le repo Juweirat clone à jour sur `master`.

## 2. Créer le user Postgres READ-ONLY

**Une seule fois.** Choisir un mot de passe fort (ex `openssl rand -base64 24`).

```bash
MCP_RO_PW='<mot_de_passe_fort_généré>'

cat juweirat-mcp/scripts/create_mcp_ro_user.sql | \
  docker exec -i juweirat-postgres psql -U juweirat -d juweirat \
    -v mcp_password="'${MCP_RO_PW}'"
```

Attendu : liste des 29 tables lisibles par `juweirat_mcp_ro` (rooms, folios, etc.),
et `users` **absent** de la liste.

## 3. Créer les tables chat de l'agent

**Idempotent** — safe à ré-exécuter.

```bash
cat juweirat-mcp-agent/scripts/create_chat_tables.sql | \
  docker exec -i juweirat-postgres psql -U juweirat -d juweirat
```

Attendu : `ChatSessions`, `ChatMessages`, `McpAuditLog` listées.

## 4. Ajouter les variables au `.env` prod

Éditer `.env` à la racine du repo et ajouter (ou vérifier) :

```env
# Déjà présent normalement, sinon l'ajouter
OPENAI_API_KEY=sk-proj-<vraie_clé>

# Nouveau — mot de passe défini à l'étape 2
MCP_PG_USER=juweirat_mcp_ro
MCP_PG_PASSWORD=<même_valeur_que_MCP_RO_PW_étape_2>
```

`JWT_SECRET` doit déjà être présent (partagé avec juweirat-api).

## 5. Pull + build + up

```bash
git pull
docker compose build juweirat-mcp-agent juweirat-admin
docker compose up -d juweirat-mcp-agent juweirat-admin nginx
# Important : nginx cache les IPs docker, si l'admin ou l'agent ont bougé
# il faut le redémarrer pour qu'il recharge les upstreams.
docker compose restart nginx
```

## 6. Smoke tests

```bash
# Health de l'agent, direct depuis l'hôte (via nginx docker interne)
curl -s -H "Host: app.juweirat.com" http://127.0.0.1:3002/agent/health
# → {"status":"ok","model":"gpt-4o-mini","toolsCount":13}

# Health via HTTPS public (nginx hôte SSL)
curl -s https://app.juweirat.com/agent/health
# → même résultat
```

Puis se connecter sur `https://app.juweirat.com`, ouvrir le widget chat en
bas à droite, poser une question type « occupation de la semaine » et
vérifier que la réponse arrive avec les vrais chiffres.

## 7. Logs et diagnostic

```bash
# Logs live agent
docker compose logs -f juweirat-mcp-agent

# Vérifier que le subprocess MCP a bien démarré
docker compose logs juweirat-mcp-agent | grep "13 tools"

# Audit des appels de tools par l'agent
docker exec -i juweirat-postgres psql -U juweirat -d juweirat -c \
  'SELECT tool, "durationMs", "isError", "createdAt" FROM "McpAuditLog" ORDER BY "createdAt" DESC LIMIT 20;'
```

## Rollback

L'agent est indépendant du reste : `docker compose stop juweirat-mcp-agent`
suffit à le couper sans impact sur l'API / le site / l'admin. Le widget
côté admin affichera juste une erreur au premier message.
