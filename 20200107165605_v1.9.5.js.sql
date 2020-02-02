drop procedure if exists deleteOldFileHits;
create procedure deleteOldFileHits()
begin
	delete from file_hits where date < date_format(utc_date() - interval 13 month, '%Y-%m-01');
end;

drop event if exists file_hits_cleanup;
create event file_hits_cleanup
	on schedule
		every 1 month
			starts date_format(utc_date() + interval 1 month, '%Y-%m-04')
	do
	begin
		call deleteOldFileHits();
	end;
