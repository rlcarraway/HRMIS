#!/bin/bash
# Mimics a production process manager: restarts `next dev` whenever it exits
# (e.g. app/api/okta-settings/route.ts calling process.exit(0) after a save).
while true; do
  next dev
  code=$?
  echo "[dev-with-restart] next dev exited with code $code — restarting in 1s..."
  sleep 1
done
