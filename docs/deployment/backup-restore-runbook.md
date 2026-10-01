# Backup, restore and release rehearsal runbook

Scope: issue #70 (DEVOPS-05). Code lives in `ops/backup/` and `ops/rehearsal/`; decisions in
[`backup-gates.md`](backup-gates.md). SDD contract: `openspec/changes/devops-backup-restore-rehearsal/`.

> **Rule zero:** no backup of real data is copied anywhere until every gate in
> [`backup-gates.md`](backup-gates.md) is `APROBADO`. `backup.sh` enforces it: without
> `BACKUP_DESTINATION_APPROVED=true` it aborts before reading the database. A VPS snapshot is
> never the only backup, and a backup is not valid until it has been restored (see §4).

## 1. What exists

| Piece                           | Purpose                                                                   |
| ------------------------------- | ------------------------------------------------------------------------- |
| `ops/backup/backup.sh`          | `pg_dump -Fc` → validate → `gpg` AES256 → S3-compatible upload → GFS      |
| `ops/backup/retention.sh`       | Pure GFS function (7 daily, 4 weekly, 6 monthly; `pre-migration`: 5)      |
| `ops/backup/check-age.sh`       | Fails and signals when newest backup is older than `BACKUP_MAX_AGE_HOURS` |
| `ops/backup/restore.sh`         | Checksum + decrypt + restore in a network-less temp Postgres + validate   |
| `ops/backup/verify-restore.sql` | Migrations, critical tables, stock ≥ 0, ledger and allocation invariants  |
| `ops/backup/Dockerfile`         | Non-root image with `backup.sh`, `retention.sh`, `check-age.sh`           |
| `ops/rehearsal/local.sh`        | Local deploy → migrate → smoke → rollback rehearsal with evidence         |
| `pnpm test:ops`                 | Runs all of the above against ephemeral Postgres + MinIO (needs Docker)   |

Object layout: `s3://<bucket>/<env>/auto/erp-medico-<env>-<UTC>.dump.gpg` (+ `.sha256`) and
`<env>/pre-migration/…` for backups taken before risky migrations.

## 2. Variables

See `ops/backup/.env.example` (names only). Values live as sealed Railway variables or in the
approved secret store. Never commit them, never paste them into chat, issues or logs; the scripts
redact known secret values from their output.

Retention deletes nothing unless `BACKUP_RETENTION_APPLY=true`. On first activation run with the
default (dry-run), read the log lines `would delete …`, then enable it.

## 3. Activation (human, after gates are approved)

The agent does **not** do these steps (AGENTS §6). Execution target is the private network of the
database (Railway cron service, or the `docker-compose.prod.yml` host), never GitHub Actions:
PostgreSQL has no public exposure.

1. Confirm gates 1–8 are `APROBADO` in `backup-gates.md`, with references.
2. Create the bucket and a credential scoped to that bucket only (put/list/delete, no admin).
3. Store the encryption passphrase in two independent custody locations (gate 3). Losing it makes
   every backup unreadable.
4. Build the image from `ops/backup/Dockerfile` (publishing it from CI needs owner approval of a
   `publish-images.yml` change) and deploy it as a cron service with the variables from §2.
   Schedule: daily, off-peak (RPO ≤ interval + dump time).
5. Create the heartbeat check at the approved alert provider with period = backup interval and a
   grace time, and put its URL in `BACKUP_HEARTBEAT_URL`. Missing success signal = alert (covers
   "job did not run"). Run `check-age.sh` as a second daily cron for direct bucket verification.
6. Run the first backup by hand, then a full restore drill (§4) **before** trusting it.
7. Record evidence in `docs/deployment/evidence/` from `_template.md`.

## 4. Restore drill

Runs on an operator machine with Docker, `aws` and `gpg`; never against production.

```bash
export BACKUP_ENV=staging BACKUP_BUCKET=… BACKUP_ENDPOINT_URL=… \
       AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… \
       BACKUP_ENCRYPTION_PASSPHRASE=… DB_HOST=<source host> DB_NAME=<source db>
ops/backup/restore.sh --latest --report restore-report.json          # latest
ops/backup/restore.sh --name erp-medico-staging-<UTC>.dump.gpg        # an older copy
ops/backup/restore.sh --latest --label pre-migration                  # pre-migration copy
```

- The restore target is an ephemeral `postgres` container with `--network none`: no ports, no
  path to production. It is destroyed on exit; `--keep [--publish N]` keeps it for manual smoke
  (bind is `127.0.0.1` only) and you must `docker rm -f` it afterwards.
- `DB_HOST`/`DB_NAME` are only used to refuse restoring onto the source. Restoring into an
  existing instance (`RESTORE_HOST`…) is refused when it equals the source.
- Order of checks: checksum → decryption → `pg_restore` → `verify-restore.sql`. Any failure exits
  non-zero, names the reason, and leaves no container behind.
- The JSON report gives `backup_age_seconds`, `download/decrypt/restore/verify/total_seconds`
  and every check result.

### RPO and RTO

- **RPO** = backup interval + dump duration (worst case: loss of everything since the last
  successful backup). With a daily job: ≤ 24 h + minutes. If the client needs less, options are
  more frequent dumps or WAL archiving/PITR (out of scope here).
- **RTO** = measured `total_seconds` of the restore drill + human time to decide, repoint the app
  and smoke (estimate in the evidence file; measure it in the staging rehearsal).
- Both must be **accepted by the client** (gate 5) — measured numbers are input, not acceptance.

## 5. Backup before a risky migration

"Risky" = drops/renames, type changes, data backfills, or anything not expand-only.

1. Before merging/deploying: `backup.sh --label pre-migration` (same image, same variables).
2. Confirm the object exists under `<env>/pre-migration/` and restore it with
   `restore.sh --latest --label pre-migration` when the change is destructive.
3. Deploy. Application rollback does **not** undo a migration
   ([`railway-operations-runbook.md`](railway-operations-runbook.md) §6): use expand-and-contract
   so the previous image keeps working on the migrated schema, and keep the pre-migration backup
   until the release is proven.

## 6. Failure modes (tested in `pnpm test:ops`)

| Situation                               | Behavior                                                             |
| --------------------------------------- | -------------------------------------------------------------------- |
| Destination not approved                | Abort before DB access, exit 2                                       |
| `pg_dump` fails / empty / unreadable    | Nothing uploaded, exit ≠ 0, `/fail` heartbeat                        |
| Bad storage credentials / storage down  | Exit ≠ 0, `/fail` heartbeat, no secrets in output, retention skipped |
| Corrupt or truncated object             | Restore aborts on checksum mismatch                                  |
| Wrong encryption key                    | Restore aborts on decrypt failure                                    |
| Restore target = source                 | Refused, exit 3                                                      |
| Ledger/stock invariant broken in backup | `verify-restore.sql` reports it, restore exits 1                     |
| Newest backup too old / none            | `check-age.sh` exits 1 and signals                                   |

Also verify on activation (manual, against the real provider): credentials rotation, network cut
during upload, and free space of the job's temp dir (needs ≈ 2× dump size; dump and ciphertext
coexist briefly).

## 7. Key rotation

1. Generate the new passphrase, store it in both custody locations.
2. Update `BACKUP_ENCRYPTION_PASSPHRASE`; new backups use it.
3. Keep the old passphrase until the retention window of old backups has expired, or re-encrypt.
4. Run a restore drill with the new key right away.

## 8. Release rehearsal

### 8.1 Local (agent-runnable, synthetic data)

```bash
ops/rehearsal/local.sh          # builds images A (HEAD) / B (+compatible migration) / C (+failing)
```

It runs `docker-compose.prod.yml` (project `erp-rehearsal`) and checks, with timings:
deploy A → migrate → `health/ready`; pre-migration backup; deploy B with migration; **rollback to
A on the migrated schema**; failed migration C while A keeps serving; restore of the
pre-migration backup with `restore.sh`. Output is pasted into an evidence file.

### 8.2 Staging (human-executed)

Needs an authorised window (gate 8). Do not use the `railway` MCP for writes.

1. Announce the window; take `backup.sh --label pre-migration`.
2. Deploy the candidate SHA per `railway-operations-runbook.md` §1 (migration runs as pre-deploy).
3. Run the `Verify Railway Staging` workflow with that SHA; record URL, SHA, time, result.
4. Roll back to the previous deployment (§6 of that runbook); re-run the smoke against the old SHA.
5. Run the restore drill from the backup taken in step 1.
6. File evidence (`evidence/_template.md`): SHAs, per-step times, RPO/RTO observed, issues.

## 9. Readiness checklist (capacity, security, contingency)

Each item has an owner (fill in at gate 6) and an observable criterion.

**Capacity**

- [ ] Dump size and duration measured in the rehearsal; bucket growth projected for 6 months of
      retention; cost inside the approved budget. _Criterion: numbers in the evidence file._
- [ ] Job temp space ≥ 2× dump size; DB disk alert exists (#68). _Criterion: `df` in the job log._
- [ ] Restore host has space and time for the RTO. _Criterion: measured `total_seconds`._

**Security**

- [ ] Bucket private, credential scoped to the bucket, no public ACLs. _Criterion: listing without
      credentials is denied._
- [ ] Encryption passphrase in two custody locations, not in Git/images/logs. _Criterion:
      secret-scan green; a second person can read it._
- [ ] Data region and legal classification approved (gates 2, 7). _Criterion: references in
      `backup-gates.md`._
- [ ] No real data in local/CI tests. _Criterion: `ops` tests only use synthetic fixtures._

**Contingency**

- [ ] Named person reads alerts and executes the restore (gate 6), with a backup person.
- [ ] Alert path tested: forced failure produces a notification in the approved channel.
- [ ] Restore drill performed from the newest **and** from an older copy, evidence filed.
- [ ] Rollback rehearsed in staging with the previous image, evidence filed.
- [ ] Pre-migration backup step is part of the release checklist for risky migrations.
