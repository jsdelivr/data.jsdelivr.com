CREATE TABLE file
(
	id               INT(10) UNSIGNED AUTO_INCREMENT
		PRIMARY KEY,
	packageVersionId INT(10) UNSIGNED NULL,
	filename         VARCHAR(255)     NULL,
	CONSTRAINT file_packageversionid_filename_unique
	UNIQUE (packageVersionId, filename)
);

CREATE TABLE file_hits
(
	fileId INT(10) UNSIGNED NOT NULL,
	date   DATE             NOT NULL,
	hits   INT(10) UNSIGNED NULL,
	PRIMARY KEY (fileId, date),
	CONSTRAINT file_hits_fileid_foreign
	FOREIGN KEY (fileId) REFERENCES file (id)
		ON UPDATE CASCADE
		ON DELETE CASCADE
);

CREATE TABLE knex_migrations
(
	id             INT(10) UNSIGNED AUTO_INCREMENT
		PRIMARY KEY,
	name           VARCHAR(255)                        NULL,
	batch          INT                                 NULL,
	migration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE knex_migrations_lock
(
	is_locked INT NULL
);

CREATE TABLE log_file
(
	id        INT(10) UNSIGNED AUTO_INCREMENT
		PRIMARY KEY,
	filename  VARCHAR(255) NULL,
	updatedAt DATETIME     NULL,
	processed TINYINT(1)   NULL,
	date      DATE         NULL,
	CONSTRAINT log_file_filename_unique
	UNIQUE (filename)
);

CREATE TRIGGER log_file_valid_insert
BEFORE INSERT ON log_file
FOR EACH ROW
	BEGIN
		IF (NEW.processed > 1)
		THEN
			SIGNAL SQLSTATE '45000'
			SET MESSAGE_TEXT = 'Invalid value for log_file.processed';
		END IF;
	END;

CREATE TRIGGER log_file_valid_update
BEFORE UPDATE ON log_file
FOR EACH ROW
	BEGIN
		IF (NEW.processed > 1)
		THEN
			SIGNAL SQLSTATE '45000'
			SET MESSAGE_TEXT = 'Invalid value for log_file.processed';
		END IF;
	END;

CREATE TABLE logs
(
	date             DATE             NOT NULL
		PRIMARY KEY,
	records          INT(10) UNSIGNED NULL,
	megabytesLogs    INT(10) UNSIGNED NULL,
	megabytesTraffic INT(10) UNSIGNED NULL
);

CREATE TABLE other_hits
(
	date DATE             NOT NULL
		PRIMARY KEY,
	hits INT(10) UNSIGNED NULL
);

CREATE TABLE package
(
	id   INT(10) UNSIGNED AUTO_INCREMENT
		PRIMARY KEY,
	name VARCHAR(255) NULL,
	type VARCHAR(255) NULL,
	CONSTRAINT package_name_type_unique
	UNIQUE (name, type)
);

CREATE TABLE package_version
(
	id        INT(10) UNSIGNED AUTO_INCREMENT
		PRIMARY KEY,
	packageId INT(10) UNSIGNED NULL,
	version   VARCHAR(255)     NULL,
	CONSTRAINT package_version_packageid_version_unique
	UNIQUE (packageId, version),
	CONSTRAINT package_version_packageid_foreign
	FOREIGN KEY (packageId) REFERENCES package (id)
		ON UPDATE CASCADE
		ON DELETE CASCADE
);

ALTER TABLE file
	ADD CONSTRAINT file_packageversionid_foreign
FOREIGN KEY (packageVersionId) REFERENCES package_version (id)
	ON UPDATE CASCADE
	ON DELETE CASCADE;

CREATE TABLE referrer
(
	id       INT(10) UNSIGNED AUTO_INCREMENT
		PRIMARY KEY,
	referrer VARCHAR(255) NULL,
	CONSTRAINT referrer_referrer_unique
	UNIQUE (referrer)
);

CREATE TABLE referrer_hits
(
	referrerId INT(10) UNSIGNED NOT NULL,
	date       DATE             NOT NULL,
	hits       INT(10) UNSIGNED NULL,
	PRIMARY KEY (referrerId, date),
	CONSTRAINT referrer_hits_referrerid_foreign
	FOREIGN KEY (referrerId) REFERENCES referrer (id)
		ON UPDATE CASCADE
		ON DELETE CASCADE
);

