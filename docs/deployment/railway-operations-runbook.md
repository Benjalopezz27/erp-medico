# Railway operations runbook

This runbook starts after the repository owner provisions Railway. It does not
authorize deployment from this repository by itself.

## First deployment

1. Confirm CI is green for the selected `dev` commit.
2. Confirm backend, frontend, and PostgreSQL belong to the `staging` environment.
3. Confirm only frontend has public networking.
4. Review staged Railway configuration and variables without exposing values.
5. Deploy PostgreSQL, then backend, then frontend.
6. Confirm the backend pre-deploy migration exits successfully.
7. Confirm both application health checks pass.
8. Run the `Verify Railway Staging` GitHub workflow with the exact commit SHA.
9. Record the deployment URL, SHA, timestamp, and smoke result in the operations
   issue. Do not record secrets.

## Failed deployment

- A failed migration must leave the new backend deployment inactive. Inspect the
  pre-deploy logs and fix the migration; never bypass it by starting the API
  manually.
- A failed health check must leave the prior healthy deployment serving traffic.
  Review `PORT`, database references, application logs, and the health response.
- A frontend `502` for `/api/v1` usually means `BACKEND_HOST` is incorrect or the
  backend is unhealthy inside the same Railway environment.

## Rollback drill

1. Select the previous known-good deployment in Railway.
2. Use Railway's rollback action and wait for its health check.
3. Run the external smoke workflow against the rolled-back commit SHA.
4. Record the result in the operations issue.

An application rollback does not undo a database migration. Migrations must remain
backward compatible with the prior application until a release is proven stable.
For destructive schema work, use an expand-and-contract migration sequence.

## Cost controls

- Enable serverless sleeping for staging frontend and backend if cold starts are
  acceptable.
- Set a billing email alert before enabling the services.
- A hard usage limit takes workloads offline. Use it only with a deliberate amount
  and never treat it as an availability feature.
- Review estimated usage after one week before provisioning production.

## Production preparation

Production is outside issue #67. When scheduled, create an isolated `production`
environment tracking `main`, generate new secrets, provision a separate database,
disable serverless sleeping, and attach the purchased domain only to the frontend.
