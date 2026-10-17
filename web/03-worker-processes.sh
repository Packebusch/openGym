#!/bin/sh
# NGINX_WORKER_PROCESSES: cap nginx's workers. "auto" starts one per host CPU, which on a shared
# host (Railway) is dozens of idle processes, each holding memory that is billed.
if [ -n "$NGINX_WORKER_PROCESSES" ]; then
  sed -i "s/^worker_processes.*/worker_processes $NGINX_WORKER_PROCESSES;/" /etc/nginx/nginx.conf
  echo "03-worker-processes: worker_processes $NGINX_WORKER_PROCESSES"
fi
