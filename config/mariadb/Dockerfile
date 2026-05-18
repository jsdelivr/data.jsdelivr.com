FROM mariadb:11.8.6

RUN apt-get update \
	&& apt-get install -y --no-install-recommends mariadb-plugin-provider-lz4 \
	&& rm -rf /var/lib/apt/lists/*

COPY init-lz4.sql /docker-entrypoint-initdb.d/10-lz4.sql
