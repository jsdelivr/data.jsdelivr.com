INSTALL SONAME 'provider_lz4';
SET GLOBAL innodb_compression_algorithm = 'lz4';
CREATE DATABASE IF NOT EXISTS `jsdelivr-stats` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `jsdelivr-stats-test` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
