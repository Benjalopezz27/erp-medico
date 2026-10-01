# Backup job image. Runs backup.sh / check-age.sh / retention.sh inside the private network
# (Railway cron service or compose profile). restore.sh needs the Docker CLI and runs on the
# operator host, not here.
FROM alpine@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6

RUN apk add --no-cache bash coreutils curl gnupg aws-cli postgresql16-client \
    && adduser -D -u 10001 backup

WORKDIR /opt/backup
COPY --chown=backup:backup lib.sh backup.sh retention.sh check-age.sh ./
RUN chmod 0555 *.sh
USER backup

CMD ["./backup.sh"]
