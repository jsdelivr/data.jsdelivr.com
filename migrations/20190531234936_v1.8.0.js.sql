create or replace function updateOrInsertFile(aPackageVersionId int, aFilename varchar(255)) returns int
begin
	update `file`
	set `id` = last_insert_id(`id`)
	where `packageVersionId` = aPackageVersionId and `filename` = aFilename;

	if row_count() = 0 then
		insert into `file` (packageVersionId, filename)
		values (aPackageVersionId, aFilename)
		on duplicate key update `id` = last_insert_id(`id`);
	end if;

	return last_insert_id();
end;

create or replace function updateOrInsertFileHits(aFileId int, aDate date, aHits int) returns int
begin
	update `file_hits`
	set `hits` = hits + aHits
	where `fileId` = aFileId and `date` = aDate;

	if row_count() = 0 then
		insert into `file_hits` (fileId, date, hits)
		values (aFileId, aDate, aHits)
		on duplicate key update `hits` = `hits` + aHits;
	end if;

	return 0;
end;

create or replace function updateOrInsertFileHitsCdn(aFileId int, aCdn varchar(255), aDate date, aHits int) returns int
begin
	update `file_hits_cdn`
	set `hits` = hits + aHits
	where `fileId` = aFileId and `cdn` = aCdn and `date` = aDate;

	if row_count() = 0 then
		insert into `file_hits_cdn` (fileId, cdn, date, hits)
		values (aFileId, aCdn, aDate, aHits)
		on duplicate key update `hits` = `hits` + aHits;
	end if;

	return 0;
end;

create or replace function updateLogFile(aFilename varchar(255), aUpdatedAt datetime) returns int
begin
	update `log_file`
	set `processed` = `processed` + 1, updatedAt = aUpdatedAt
	where `filename` = aFilename;

	return 0;
end;

create or replace function updateOrInsertLogs(aDate date, aRecords int, aMegabytesLogs int, aMegabytesTraffic int) returns int
begin
	update `logs`
	set `records` = `records` + aRecords, `megabytesLogs` = `megabytesLogs` + aMegabytesLogs, `megabytesTraffic` = `megabytesTraffic` + aMegabytesTraffic
	where `date` = aDate;

	if row_count() = 0 then
		insert into `logs` (date, records, megabytesLogs, megabytesTraffic)
		values (aDate, aRecords, aMegabytesLogs, aMegabytesTraffic)
		on duplicate key update `records` = `records` + aRecords, `megabytesLogs` = `megabytesLogs` + aMegabytesLogs, `megabytesTraffic` = `megabytesTraffic` + aMegabytesTraffic;
	end if;

	return 0;
end;

create or replace function updateOrInsertOtherHits(aDate date, aHits int) returns int
begin
	update `other_hits`
	set `hits` = `hits` + aHits
	where `date` = aDate;

	if row_count() = 0 then
		insert into `other_hits` (date, hits)
		values (aDate, aHits)
		on duplicate key update `hits` = `hits` + aHits;
	end if;

	return 0;
end;

create or replace function updateOrInsertPackage(aType varchar(255), aName varchar(255)) returns int
begin
	update `package`
	set `id` = last_insert_id(`id`)
	where `type` = aType and `name` = aName;

	if row_count() = 0 then
		insert into `package` (type, name)
		values (aType, aName)
		on duplicate key update `id` = last_insert_id(`id`);
	end if;

	return last_insert_id();
end;

create or replace function updateOrInsertPackageVersion(aPackageId int, aVersion varchar(255)) returns int
begin
	update `package_version`
	set `id` = last_insert_id(`id`)
	where `packageId` = aPackageId and `version` = aVersion;

	if row_count() = 0 then
		insert into `package_version` (packageId, version)
		values (aPackageId, aVersion)
		on duplicate key update `id` = last_insert_id(`id`);
	end if;

	return last_insert_id();
end;

create or replace function updateOrInsertReferrer(aReferrer varchar(255)) returns int
begin
	update `referrer`
	set `id` = last_insert_id(`id`)
	where `referrer` = aReferrer;

	if row_count() = 0 then
		insert into `referrer` (referrer)
		values (aReferrer)
		on duplicate key update `id` = last_insert_id(`id`);
	end if;

	return last_insert_id();
end;

create or replace function updateOrInsertReferrerHits(aReferrer varchar(255), aDate date, aHits int) returns int
begin
	update `referrer_hits`
	set `hits` = `hits` + aHits
	where `referrerId` = aReferrer and `date` = aDate;

	if row_count() = 0 then
		insert into `referrer_hits` (referrerId, date, hits)
		values (aReferrer, aDate, aHits)
		on duplicate key update `hits` = `hits` + aHits;
	end if;

	return 0;
end;
