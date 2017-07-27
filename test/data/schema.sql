create table file
(
	id int(10) unsigned auto_increment
		primary key,
	packageVersionId int(10) unsigned null,
	filename varchar(255) null,
	constraint file_packageversionid_filename_unique
		unique (packageVersionId, filename)
)
;

create table file_hits
(
	fileId int(10) unsigned not null,
	`date` date not null,
	hits int(10) unsigned null,
	primary key (fileId, `date`),
	constraint file_hits_fileid_foreign
		foreign key (fileId) references `jsdelivr-stats-test`.file (id)
			on update cascade on delete cascade
)
;

create table knex_migrations
(
	id int(10) unsigned auto_increment
		primary key,
	name varchar(255) null,
	batch int null,
	migration_time timestamp default CURRENT_TIMESTAMP not null
)
;

create table knex_migrations_lock
(
	is_locked int null
)
;

create table log_file
(
	id int(10) unsigned auto_increment
		primary key,
	filename varchar(255) null,
	updatedAt datetime null,
	processed tinyint(1) null,
	constraint log_file_filename_unique
		unique (filename)
)
;

create trigger log_file_valid_insert
             before INSERT on log_file
             for each row
BEGIN
	IF (NEW.processed > 1) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid value for log_file.processed';
	END IF;
END;

create trigger log_file_valid_update
             before UPDATE on log_file
             for each row
BEGIN
	IF (NEW.processed > 1) THEN
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid value for log_file.processed';
	END IF;
END;

create table logs
(
	date date not null
		primary key,
	`lines` int(10) unsigned null,
	megabytes int(10) unsigned null
)
;

create table package
(
	id int(10) unsigned auto_increment
		primary key,
	name varchar(255) null,
	type varchar(255) null,
	constraint package_name_type_unique
		unique (name, type)
)
;

create table package_version
(
	id int(10) unsigned auto_increment
		primary key,
	packageId int(10) unsigned null,
	version varchar(255) null,
	constraint package_version_packageid_version_unique
		unique (packageId, version),
	constraint package_version_packageid_foreign
		foreign key (packageId) references `jsdelivr-stats-test`.package (id)
			on update cascade on delete cascade
)
;

alter table file
	add constraint file_packageversionid_foreign
		foreign key (packageVersionId) references `jsdelivr-stats-test`.package_version (id)
			on update cascade on delete cascade
;

create table referrer
(
	id int(10) unsigned auto_increment
		primary key,
	referrer varchar(255) null,
	constraint referrer_referrer_unique
		unique (referrer)
)
;

create table referrer_hits
(
	referrerId int(10) unsigned not null,
	date date not null,
	hits int(10) unsigned null,
	primary key (referrerId, date),
	constraint referrer_hits_referrerid_foreign
		foreign key (referrerId) references `jsdelivr-stats-test`.referrer (id)
			on update cascade on delete cascade
)
;
