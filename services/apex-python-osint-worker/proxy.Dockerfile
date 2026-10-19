FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends squid ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /tmp/squid \
    && chown -R proxy:proxy /tmp/squid
COPY deployment/apex-python-osint-worker/squid.conf /etc/squid/squid.conf
RUN chmod 0444 /etc/squid/squid.conf
USER 13:13
EXPOSE 3128
ENTRYPOINT ["/usr/sbin/squid", "-N", "-f", "/etc/squid/squid.conf"]
