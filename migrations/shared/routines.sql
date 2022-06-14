drop function if exists updateLogFile;
create function updateLogFile(aFilename varchar(255), aUpdatedAt datetime) returns int
begin
	update `log_file`
	set `processed` = `processed` + 1, updatedAt = aUpdatedAt
	where `filename` = aFilename;

	return 0;
end;


drop function if exists updateNormalizedRawLogFile;
create function updateNormalizedRawLogFile(aFilename varchar(255), aFileModificationTime int, aUpdatedAt datetime) returns int
begin
	update `normalized_raw_log_file`
	set `processed` = `processed` + 1, updatedAt = aUpdatedAt
	where `filename` = aFilename and `fileModificationTime` = aFileModificationTime;

	return 0;
end;


drop function if exists updateOrInsertBrowser;
create function updateOrInsertBrowser(aName varchar(255)) returns int
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


drop function if exists updateOrInsertBrowserVersion;
create function updateOrInsertBrowserVersion(aBrowserId int, aVersion varchar(255)) returns int
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


drop function if exists updateOrInsertCountryBrowserVersionHits;
create function updateOrInsertCountryBrowserVersionHits(aBrowserVersionId int, aPlatformId int, aCountryIso varchar(2), aDate date, aHits int, aBandwidth bigint) returns int
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


drop function if exists updateOrInsertCountryCdnHits;
create function updateOrInsertCountryCdnHits(aCountryIso varchar(2), aCdn varchar(255), aDate date, aHits int, aBandwidth bigint) returns int
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


drop function if exists updateOrInsertCountryPlatformVersionHits;
create function updateOrInsertCountryPlatformVersionHits(aPlatformVersionId int, aCountryIso varchar(2), aDate date, aHits int, aBandwidth bigint) returns int
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


drop function if exists updateOrInsertFile;
create function updateOrInsertFile(aPackageVersionId int, aFilename varchar(255), aFetchAttemptsLeft int) returns int
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


drop function if exists updateOrInsertFileHits;
create function updateOrInsertFileHits(aPackageId int, aPackageVersionId int, aFileId int, aDate date, aHits int, aBandwidth bigint) returns int
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


drop function if exists updateOrInsertLogs;
create function updateOrInsertLogs(aDate date, aRecords int, aMegabytesLogs int, aMegabytesTraffic int) returns int
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


drop function if exists updateOrInsertOtherHits;
create function updateOrInsertOtherHits(aDate date, aHits int, aBandwidth bigint) returns int
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


drop function if exists updateOrInsertPackage;
create function updateOrInsertPackage(aType varchar(255), aName varchar(255)) returns int
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


drop function if exists updateOrInsertPackageVersion;
create function updateOrInsertPackageVersion(aPackageId int, aVersion varchar(255), aType varchar(16)) returns int
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


drop function if exists updateOrInsertPlatform;
create function updateOrInsertPlatform(aName varchar(255)) returns int
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


drop function if exists updateOrInsertPlatformVersion;
create function updateOrInsertPlatformVersion(aPlatformId int, aVersion varchar(255), aVersionName varchar(255)) returns int
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


drop function if exists updateOrInsertProxyHits;
create function updateOrInsertProxyHits(aProxyId int, aDate date, aHits int, aBandwidth bigint) returns int
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


drop function if exists updateOrInsertReferrer;
create function updateOrInsertReferrer(aReferrer varchar(255)) returns int
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


drop function if exists updateOrInsertReferrerHits;
create function updateOrInsertReferrerHits(aReferrerId int, aDate date, aHits int, aBandwidth bigint) returns int
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


drop procedure if exists updateViewNetworkPackages;
create procedure updateViewNetworkPackages(aDate date)
begin
	declare exit handler for sqlexception
		begin
			rollback;
			resignal;
		end;

	start transaction;

	set @dateTo = date_sub(aDate, interval 2 day);

	delete from view_network_packages;

	insert into view_network_packages
	(date, hits, bandwidth)
	select date, sum(hits) as hits, sum(bandwidth) as bandwidth
	from package
		     join package_hits on package.id = package_hits.packageId
	where date <= @dateTo
	group by date;
	commit;
end;


drop procedure if exists updateViewTopPackageFiles;
create procedure updateViewTopPackageFiles(aDate date)
begin
	declare exit handler for sqlexception
		begin
			rollback;
			resignal;
		end;

	start transaction;

	set @dateFrom = date_sub(aDate, interval 31 day);
	set @dateTo = date_sub(aDate, interval 2 day);

	delete from view_top_package_files;

	insert into view_top_package_files
	(name, version, filename, date)
	select t.name, t.v, t.filename, utc_date()
	from (
		select
			package.name as name,
			if(substring_index(package_version.version, '.', 1) = '0', substring_index(package_version.version, '.', 2), substring_index(package_version.version, '.', 1)) as v,
			file.filename as filename,
			row_number() over (partition by package.id, v, substring_index(file.filename, '.', -1) order by substring_index(file.filename, '.', -1), sum(file_hits.hits) desc) as rowNum
		from package_version
			     inner join package on package_version.packageId = package.id
			     inner join file on package_version.id = file.packageVersionId
			     inner join file_hits on file.id = file_hits.fileId
		where file_hits.date between @dateFrom and @dateTo
			and package.type = 'npm'
			and file.filename RLIKE '^(?:(?!/(docs?|documentation|examples?|samples?|demos?|tests?|cjs|esm|es6?)/)(?!/[._]).)+\\.(js|css)$'
		group by file.id
	) t where t.rowNum = 1;

	commit;
end;


drop procedure if exists updateViewTopPlatforms;
create procedure updateViewTopPlatforms(aPeriod varchar(255), aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date)
begin
	declare exit handler for sqlexception
		begin
			rollback;
			resignal;
		end;

	start transaction;

	delete from view_top_platforms where `period` = aPeriod and `date` = aDateFrom;

	insert into view_top_platforms
	(period, date, locationType, locationId, name, share, prevShare)
	with prevTotals as (
		select sum(hits) as hits
		from country_platform_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', name,
			round(hits / nullif((sum(hits) over ()), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals), 0) * 100, 2) as prevShare
		from (
			select name,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
					where platform.id = p.id and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
			where date >= aDateFrom and date <= aDateTo
			group by name
			order by hits desc
		) t
	) t2
	where share > 0;

	insert into view_top_platforms
	(period, date, locationType, locationId, name, share, prevShare)
	with prevTotals as (
		select continentCode, sum(hits) as hits
		from country_platform_version_hits cpvh
			join country c on cpvh.countryIso = c.iso
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by continentCode
	)
	select * from (
		select aPeriod, aDateFrom, 'continent', continentCode, name,
			round(hits / nullif((sum(hits) over (partition by continentCode)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where continentCode = t.continentCode), 0) * 100, 2) as prevShare
		from (
			select name,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
						join country ci on cpvhi.countryIso = ci.iso
					where platform.id = p.id and ci.continentCode = c.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
				join country c on cpvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by name, c.continentCode
			order by hits desc
		) t
	) t2
	where share > 0;

	insert into view_top_platforms
	(period, date, locationType, locationId, name, share, prevShare)
	with prevTotals as (
		select countryIso, sum(hits) as hits
		from country_platform_version_hits cpvh
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'country', countryIso, name,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select name,
				countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
					where platform.id = p.id and cpvhi.countryIso = cpvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
			where date >= aDateFrom and date <= aDateTo
			group by name, countryIso
			order by hits desc
		) t
	) t2
	where share > 0;

	commit;
end;


drop procedure if exists updateViewTopPlatformVersions;
create procedure updateViewTopPlatformVersions(aPeriod varchar(255), aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date)
begin
	declare exit handler for sqlexception
		begin
			rollback;
			resignal;
		end;

	start transaction;

	delete from view_top_platform_versions where `period` = aPeriod and `date` = aDateFrom;

	insert into view_top_platform_versions
	(period, date, locationType, locationId, name, version, versionName, share, prevShare)
	with prevTotals as (
		select sum(hits) as hits
		from country_platform_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', name, version, versionName,
			round(hits / nullif((sum(hits) over ()), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals), 0) * 100, 2) as prevShare
		from (
			select name, version, versionName,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
					where platform.id = p.id and pvi.id = pv.id and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
			where date >= aDateFrom and date <= aDateTo
			group by name, version, versionName
			order by hits desc
		) t
	) t2
	where share > 0;

	insert into view_top_platform_versions
	(period, date, locationType, locationId, name, version, versionName, share, prevShare)
	with prevTotals as (
		select continentCode, sum(hits) as hits
		from country_platform_version_hits cpvh
			join country c on cpvh.countryIso = c.iso
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by continentCode
	)
	select * from (
		select aPeriod, aDateFrom, 'continent', continentCode, name, version, versionName,
			round(hits / nullif((sum(hits) over (partition by continentCode)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where continentCode = t.continentCode), 0) * 100, 2) as prevShare
		from (
			select name, version, versionName,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
						join country ci on cpvhi.countryIso = ci.iso
					where platform.id = p.id and pvi.id = pv.id and ci.continentCode = c.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
				join country c on cpvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by name, version, versionName, c.continentCode
			order by hits desc
		) t
	) t2
	where share > 0;

	insert into view_top_platform_versions
	(period, date, locationType, locationId, name, version, versionName, share, prevShare)
	with prevTotals as (
		select countryIso, sum(hits) as hits
		from country_platform_version_hits cpvh
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'country', countryIso, name, version, versionName,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select name, version, versionName,
				countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
					where platform.id = p.id and pvi.id = pv.id and cpvhi.countryIso = cpvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
			where date >= aDateFrom and date <= aDateTo
			group by name, version, versionName, countryIso
			order by hits desc
		) t
	) t2
	where share > 0;

	commit;
end;


drop procedure if exists updateViewTopPlatformBrowsers;
create procedure updateViewTopPlatformBrowsers(aPeriod varchar(255), aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date)
begin
	declare exit handler for sqlexception
		begin
			rollback;
			resignal;
		end;

	start transaction;

	delete from view_top_platform_browsers where `period` = aPeriod and `date` = aDateFrom;

	insert into view_top_platform_browsers
	(period, date, locationType, locationId, name, browser, share, prevShare)
	with totals as (
		select sum(hits) as hits
		from country_browser_version_hits cbvh
		where date >= aPrevDateFrom and date <= aPrevDateTo
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', name, browser,
			round(hits / nullif((sum(hits) over ()), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from totals), 0) * 100, 2) as prevShare
		from (
			select p.name as name, b.name as browser,
				sum(hits) as hits,
				(select sum(hits)
					from browser bi
						join browser_version bvi on bi.id = bvi.browserId
						join country_browser_version_hits cbvhi on bvi.id = cbvhi.browserVersionId
						join platform pi on cbvhi.platformId = pi.id
					where pi.id = p.id and bi.id = b.id and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from browser b
				join browser_version bv on b.id = bv.browserId
				join country_browser_version_hits cbvh on bv.id = cbvh.browserVersionId
				join platform p on cbvh.platformId = p.id
			where date >= aDateFrom and date <= aDateTo
			group by name, browser
			order by hits desc
		) t
	) t2
	where share > 0;

	insert into view_top_platform_browsers
	(period, date, locationType, locationId, name, browser, share, prevShare)
	with totals as (
		select continentCode, sum(hits) as hits
		from country_browser_version_hits cbvh
			join country c on cbvh.countryIso = c.iso
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by continentCode
	)
	select * from (
		select aPeriod, aDateFrom, 'continent', continentCode, name, browser,
			round(hits / nullif((sum(hits) over (partition by continentCode)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from totals where continentCode = t.continentCode), 0) * 100, 2) as prevShare
		from (
			select p.name as name, b.name as browser,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from browser bi
						join browser_version bvi on bi.id = bvi.browserId
						join country_browser_version_hits cbvhi on bvi.id = cbvhi.browserVersionId
						join platform pi on cbvhi.platformId = pi.id
						join country ci on cbvhi.countryIso = ci.iso
					where pi.id = p.id and bi.id = b.id and ci.continentCode = c.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from browser b
				join browser_version bv on b.id = bv.browserId
				join country_browser_version_hits cbvh on bv.id = cbvh.browserVersionId
				join platform p on cbvh.platformId = p.id
				join country c on cbvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by name, browser, c.continentCode
			order by hits desc
		) t
	) t2
	where share > 0;

	insert into view_top_platform_browsers
	(period, date, locationType, locationId, name, browser, share, prevShare)
	with totals as (
		select countryIso, sum(hits) as hits
		from country_browser_version_hits cbvh
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'country', countryIso, name, browser,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from totals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select p.name as name, b.name as browser,
				countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from browser bi
						join browser_version bvi on bi.id = bvi.browserId
						join country_browser_version_hits cbvhi on bvi.id = cbvhi.browserVersionId
						join platform pi on cbvhi.platformId = pi.id
					where pi.id = p.id and bi.id = b.id and cbvhi.countryIso = cbvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from browser b
				join browser_version bv on b.id = bv.browserId
				join country_browser_version_hits cbvh on bv.id = cbvh.browserVersionId
				join platform p on cbvh.platformId = p.id
			where date >= aDateFrom and date <= aDateTo
			group by name, browser, countryIso
			order by hits desc
		) t
	) t2
	where share > 0;

	commit;
end;


create or replace procedure updateMonthlyViews(aDate date)
begin
	set aDate = date_sub(aDate, interval 3 day);
	set @firstStart = date('2020-01-01');
	set @latestStart = date_sub(aDate, interval dayofmonth(aDate) - 1 day);

	while date_sub(@latestStart, interval 1 month) >= @firstStart
		do
			set @latestStart = date_sub(@latestStart, interval 1 month);
			set @dateFrom = @latestStart;
			set @dateTo = date_sub(date_add(@dateFrom, interval 1 month), interval 1 day);
			set @prevDateFrom = date_sub(@dateFrom, interval 1 month);
			set @prevDateTo = date_sub(@dateFrom, interval 1 day);

			if not exists(select * from view_top_platforms where `date` = @latestStart and period = 's-month') then
				call updateViewTopPlatforms('s-month', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_versions where `date` = @latestStart and period = 's-month') then
				call updateViewTopPlatformVersions('s-month', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_browsers where `date` = @latestStart and period = 's-month') then
				call updateViewTopPlatformBrowsers('s-month', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;
		end while;
end;


create or replace procedure updateYearlyViews(aDate date)
begin
	set aDate = date_sub(aDate, interval 3 day);
	set @firstStart = date('2020-01-01');
	set @latestStart = date_sub(aDate, interval dayofyear(aDate) - 1 day);

	while date_sub(@latestStart, interval 1 year) >= @firstStart
		do
			set @latestStart = date_sub(@latestStart, interval 1 year);
			set @dateFrom = @latestStart;
			set @dateTo = date_sub(date_add(@dateFrom, interval 1 year), interval 1 day);
			set @prevDateFrom = date_sub(@dateFrom, interval 1 year);
			set @prevDateTo = date_sub(@dateFrom, interval 1 day);

			if not exists(select * from view_top_platforms where `date` = @latestStart and period = 's-year') then
				call updateViewTopPlatforms('s-year', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_versions where `date` = @latestStart and period = 's-year') then
				call updateViewTopPlatformVersions('s-year', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_browsers where `date` = @latestStart and period = 's-year') then
				call updateViewTopPlatformBrowsers('s-year', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;
		end while;
end;
