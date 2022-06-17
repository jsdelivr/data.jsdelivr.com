create or replace function updateLogFile(aFilename varchar(255), aUpdatedAt datetime) returns int
begin
	update `log_file`
	set `processed` = `processed` + 1, updatedAt = aUpdatedAt
	where `filename` = aFilename;

	return 0;
end;


create or replace function updateNormalizedRawLogFile(aFilename varchar(255), aFileModificationTime int, aUpdatedAt datetime) returns int
begin
	update `normalized_raw_log_file`
	set `processed` = `processed` + 1, updatedAt = aUpdatedAt
	where `filename` = aFilename and `fileModificationTime` = aFileModificationTime;

	return 0;
end;


create or replace function updateOrInsertBrowser(aName varchar(255)) returns int
begin
	update `browser`
	set `id` = last_insert_id(`id`)
	where `name` = aName;

	if row_count() = 0 then
		insert into `browser` (name)
		values (aName)
		on duplicate key update `id` = last_insert_id(`id`);
	end if;

	return last_insert_id();
end;


create or replace function updateOrInsertBrowserVersion(aBrowserId int, aVersion varchar(255)) returns int
begin
	update `browser_version`
	set `id` = last_insert_id(`id`)
	where `browserId` = aBrowserId and `version` = aVersion;

	if row_count() = 0 then
		insert into `browser_version` (browserId, version)
		values (aBrowserId, aVersion)
		on duplicate key update `id` = last_insert_id(`id`);
	end if;

	return last_insert_id();
end;


create or replace function updateOrInsertCountryBrowserVersionHits(aBrowserVersionId int, aPlatformId int, aCountryIso varchar(2), aDate date, aHits int, aBandwidth bigint) returns int
begin
	update `country_browser_version_hits`
	set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
	where `browserVersionId` = aBrowserVersionId and `countryIso` = aCountryIso and `date` = aDate;

	if row_count() = 0 then
		insert into `country_browser_version_hits` (browserVersionId, platformId, countryIso, date, hits, bandwidth)
		values (aBrowserVersionId, aPlatformId, aCountryIso, aDate, aHits, aBandwidth)
		on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
	end if;

	return 0;
end;


create or replace function updateOrInsertCountryCdnHits(aCountryIso varchar(2), aCdn varchar(255), aDate date, aHits int, aBandwidth bigint) returns int
begin
	update `country_cdn_hits`
	set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
	where `countryIso` = aCountryIso and `cdn` = aCdn and `date` = aDate;

	if row_count() = 0 then
		insert into `country_cdn_hits` (countryIso, cdn, date, hits, bandwidth)
		values (aCountryIso, aCdn, aDate, aHits, aBandwidth)
		on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
	end if;

	return 0;
end;


create or replace function updateOrInsertCountryPlatformVersionHits(aPlatformVersionId int, aCountryIso varchar(2), aDate date, aHits int, aBandwidth bigint) returns int
begin
	update `country_platform_version_hits`
	set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
	where `platformVersionId` = aPlatformVersionId and `countryIso` = aCountryIso and `date` = aDate;

	if row_count() = 0 then
		insert into `country_platform_version_hits` (platformVersionId, countryIso, date, hits, bandwidth)
		values (aPlatformVersionId, aCountryIso, aDate, aHits, aBandwidth)
		on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
	end if;

	return 0;
end;


create or replace function updateOrInsertFile(aPackageVersionId int, aFilename varchar(255), aFetchAttemptsLeft int) returns int
begin
	update `file`
	set `id` = last_insert_id(`id`)
	where `packageVersionId` = aPackageVersionId and `filename` = aFilename;

	if row_count() = 0 then
		insert into `file` (packageVersionId, filename, fetchAttemptsLeft)
		values (aPackageVersionId, aFilename, aFetchAttemptsLeft)
		on duplicate key update `id` = last_insert_id(`id`);
	end if;

	return last_insert_id();
end;


create or replace function updateOrInsertFileHits(aPackageId int, aPackageVersionId int, aFileId int, aDate date, aHits int, aBandwidth bigint) returns int
begin
	update `file_hits`
	set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
	where `fileId` = aFileId and `date` = aDate;

	if row_count() = 0 then
		insert into `file_hits` (fileId, date, hits, bandwidth)
		values (aFileId, aDate, aHits, aBandwidth)
		on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
	end if;

	update `package_version_hits`
	set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
	where `packageVersionId` = aPackageVersionId and `date` = aDate;

	if row_count() = 0 then
		insert into `package_version_hits` (packageVersionId, date, hits, bandwidth)
		values (aPackageVersionId, aDate, aHits, aBandwidth)
		on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
	end if;

	update `package_hits`
	set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
	where `packageId` = aPackageId and `date` = aDate;

	if row_count() = 0 then
		insert into `package_hits` (packageId, date, hits, bandwidth)
		values (aPackageId, aDate, aHits, aBandwidth)
		on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
	end if;

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


create or replace function updateOrInsertOtherHits(aDate date, aHits int, aBandwidth bigint) returns int
begin
	update `other_hits`
	set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
	where `date` = aDate;

	if row_count() = 0 then
		insert into `other_hits` (date, hits, bandwidth)
		values (aDate, aHits, aBandwidth)
		on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
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


create or replace function updateOrInsertPackageVersion(aPackageId int, aVersion varchar(255), aType varchar(16)) returns int
begin
	update `package_version`
	set `id` = last_insert_id(`id`)
	where `packageId` = aPackageId and `version` = aVersion;

	if row_count() = 0 then
		insert into `package_version` (packageId, version, type)
		values (aPackageId, aVersion, aType)
		on duplicate key update `id` = last_insert_id(`id`);
	end if;

	return last_insert_id();
end;


create or replace function updateOrInsertPlatform(aName varchar(255)) returns int
begin
	update `platform`
	set `id` = last_insert_id(`id`)
	where `name` = aName;

	if row_count() = 0 then
		insert into `platform` (name)
		values (aName)
		on duplicate key update `id` = last_insert_id(`id`);
	end if;

	return last_insert_id();
end;


create or replace function updateOrInsertPlatformVersion(aPlatformId int, aVersion varchar(255), aVersionName varchar(255)) returns int
begin
	update `platform_version`
	set `id` = last_insert_id(`id`)
	where `platformId` = aPlatformId and `version` = aVersion;

	if row_count() = 0 then
		insert into `platform_version` (platformId, version, versionName)
		values (aPlatformId, aVersion, aVersionName)
		on duplicate key update `id` = last_insert_id(`id`);
	end if;

	return last_insert_id();
end;


create or replace function updateOrInsertProxyHits(aProxyId int, aDate date, aHits int, aBandwidth bigint) returns int
begin
	update `proxy_hits`
	set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
	where `proxyId` = aProxyId and `date` = aDate;

	if row_count() = 0 then
		insert into `proxy_hits` (proxyId, date, hits, bandwidth)
		values (aProxyId, aDate, aHits, aBandwidth)
		on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
	end if;

	return 0;
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


create or replace function updateOrInsertReferrerHits(aReferrerId int, aDate date, aHits int, aBandwidth bigint) returns int
begin
	update `referrer_hits`
	set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
	where `referrerId` = aReferrerId and `date` = aDate;

	if row_count() = 0 then
		insert into `referrer_hits` (referrerId, date, hits, bandwidth)
		values (aReferrerId, aDate, aHits, aBandwidth)
		on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
	end if;

	return 0;
end;
