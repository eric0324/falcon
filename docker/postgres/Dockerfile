FROM pgvector/pgvector:pg15

# Install build dependencies for pg_jieba
RUN apt-get update && apt-get install -y \
    git \
    cmake \
    gcc \
    g++ \
    make \
    postgresql-server-dev-15 \
    && rm -rf /var/lib/apt/lists/*

# Build and install pg_jieba
RUN git clone --depth 1 https://github.com/jaiminpan/pg_jieba.git /tmp/pg_jieba \
    && cd /tmp/pg_jieba \
    && git submodule update --init --recursive \
    && mkdir build && cd build \
    && cmake -DPostgreSQL_TYPE_INCLUDE_DIR=/usr/include/postgresql/15/server .. \
    && make && make install \
    && rm -rf /tmp/pg_jieba

# Auto-create extensions on init
COPY init-extensions.sql /docker-entrypoint-initdb.d/
