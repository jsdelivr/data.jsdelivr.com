create or replace function updateOrInsertCountryCdnHits(aCountryIso varchar(2), aCdn varchar(255), aDate date, aHits int, aBandwidth float) returns int
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

create or replace function updateNormalizedRawLogFile(aFilename varchar(255), aFileModificationTime int, aUpdatedAt datetime) returns int
begin
	update `normalized_raw_log_file`
	set `processed` = `processed` + 1, updatedAt = aUpdatedAt
	where `filename` = aFilename and `fileModificationTime` = aFileModificationTime;

	return 0;
end;

create trigger normalized_raw_log_file_valid_insert
	before insert
	on normalized_raw_log_file
	for each row
begin
	if (new.processed > 1) then
		signal sqlstate '45000' set message_text = 'Invalid value for normalized_raw_log_file.processed';
	end if;
end;

create trigger normalized_raw_log_file_valid_update
	before update
	on normalized_raw_log_file
	for each row
begin
	if (new.processed > 1) then
		signal sqlstate '45000' set message_text = 'Invalid value for normalized_raw_log_file.processed';
	end if;
end;

drop function if exists updateOrInsertFileHitsCdn;
