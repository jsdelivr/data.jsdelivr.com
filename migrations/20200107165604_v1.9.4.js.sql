drop function if exists updateOrInsertPackageHits;
drop function if exists updateOrInsertPackageVersionHits;

create or replace function updateOrInsertFileHits(aPackageId int, aPackageVersionId int, aFileId int, aDate date, aHits int, aBandwidth float) returns int
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

create or replace view view_package_version_hits as
select package.type as type,
	package.name as name,
	package_version.version as version,
	package_version_hits.date as date,
	sum(package_version_hits.hits) as hits,
	sum(package_version_hits.bandwidth) as bandwidth
from package
	     join package_version on package.id = package_version.packageId
	     join package_version_hits on package_version.id = package_version_hits.packageVersionId
group by package_version.id, package_version_hits.date
order by package_version_hits.date desc, hits desc;
