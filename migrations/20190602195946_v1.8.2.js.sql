drop function if exists updateOrInsertPackageHits;
create function updateOrInsertPackageHits(aPackageId int, aDate date, aHits int) returns int
begin
	update `package_hits`
	set `hits` = hits + aHits
	where `packageId` = aPackageId and `date` = aDate;

	if row_count() = 0 then
		insert into `package_hits` (packageId, date, hits)
		values (aPackageId, aDate, aHits)
		on duplicate key update `hits` = `hits` + aHits;
	end if;

	return 0;
end;
