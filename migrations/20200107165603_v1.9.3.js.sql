drop function if exists updateOrInsertPackageVersionHits;
create function updateOrInsertPackageVersionHits (aPackageVersionId int, aDate date, aHits int, aBandwidth float) returns int
begin
	update `package_version_hits`
	set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
	where `packageVersionId` = aPackageVersionId and `date` = aDate;

	if row_count() = 0 then
		insert into `package_version_hits` (packageVersionId, date, hits, bandwidth)
		values (aPackageVersionId, aDate, aHits, aBandwidth)
		on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
	end if;

	return 0;
end;
