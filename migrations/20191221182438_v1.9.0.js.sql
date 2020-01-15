drop function if exists updateOrInsertFileHits;
create function updateOrInsertFileHits(aFileId int, aDate date, aHits int, aBandwidth float) returns int
begin
	update `file_hits`
	set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
	where `fileId` = aFileId and `date` = aDate;

	if row_count() = 0 then
		insert into `file_hits` (fileId, date, hits, bandwidth)
		values (aFileId, aDate, aHits, aBandwidth)
		on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
	end if;

	return 0;
end;

drop function if exists updateOrInsertFileHitsCdn;
create function updateOrInsertFileHitsCdn(aFileId int, aCdn varchar(255), aDate date, aHits int, aBandwidth float) returns int
begin
	update `file_hits_cdn`
	set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
	where `fileId` = aFileId and `cdn` = aCdn and `date` = aDate;

	if row_count() = 0 then
		insert into `file_hits_cdn` (fileId, cdn, date, hits, bandwidth)
		values (aFileId, aCdn, aDate, aHits, aBandwidth)
		on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
	end if;

	return 0;
end;

drop function if exists updateOrInsertOtherHits;
create function updateOrInsertOtherHits(aDate date, aHits int, aBandwidth float) returns int
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

drop function if exists updateOrInsertReferrerHits;
create function updateOrInsertReferrerHits(aReferrerId int, aDate date, aHits int, aBandwidth float) returns int
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

drop function if exists updateOrInsertPackageHits;
create function updateOrInsertPackageHits(aPackageId int, aDate date, aHits int, aBandwidth float) returns int
begin
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

drop view if exists view_file_hits;
create view view_file_hits as
select package.type as type,
	package.name as name,
	package_version.version as version,
	file.filename as filename,
	file_hits.date as date,
	sum(file_hits.hits) as hits,
	sum(file_hits.bandwidth) as bandwidth
from package
	     join package_version on package.id = package_version.packageId
	     join file on package_version.id = file.packageVersionId
	     join file_hits on file.id = file_hits.fileId
group by file_hits.fileId, file_hits.date
order by file_hits.date desc, hits desc;

drop view if exists view_package_version_hits;
create view view_package_version_hits as
select package.type as type,
	package.name as name,
	package_version.version as version,
	file_hits.date as date,
	sum(file_hits.hits) as hits,
	sum(file_hits.bandwidth) as bandwidth
from package
	     join package_version on package.id = package_version.packageId
	     join file on package_version.id = file.packageVersionId
	     join file_hits on file.id = file_hits.fileId
group by package_version.id, file_hits.date
order by file_hits.date desc, hits desc;

drop view if exists view_package_hits;
create view view_package_hits as
select package.type as type,
	package.name as name,
	package_hits.date as date,
	sum(package_hits.hits) as hits,
	sum(package_hits.bandwidth) as bandwidth
from package
	     join package_hits on package.id = package_hits.packageId
group by package.id, package_hits.date
order by package_hits.date desc, hits desc;

drop view if exists view_referrer_hits;
create view view_referrer_hits as
select referrer.referrer,
	referrer_hits.date as date,
	sum(referrer_hits.hits) as hits,
	sum(referrer_hits.bandwidth) as bandwidth
from referrer
	     join referrer_hits on referrer.id = referrer_hits.referrerId
group by referrer.id, referrer_hits.date
order by referrer_hits.date desc, hits desc;
