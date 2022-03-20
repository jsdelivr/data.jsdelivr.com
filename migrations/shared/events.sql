drop event if exists top_package_files_update;
create event top_package_files_update
	on schedule
		every 5 minute
			starts utc_date()
	do
	begin
		if not exists(select * from view_top_package_files where `date` = utc_date()) then
			if get_lock('update_top_package_files', 0) = 1 then
				call updateViewTopPackageFiles(date_sub(utc_date(), interval 31 day), date_sub(utc_date(), interval 2 day));
				select release_lock('update_top_package_files');
			end if;
		end if;
	end;


drop event if exists network_packages_update;
create event network_packages_update
	on schedule
		every 5 minute
			starts utc_date()
	do
	begin
		if not exists(select * from view_network_packages where `date` = date_sub(utc_date(), interval 2 day)) then
			if get_lock('update_network_packages', 0) = 1 then
				call updateViewNetworkPackages(date_sub(utc_date(), interval 2 day));
				select release_lock('update_network_packages');
			end if;
		end if;

		if utc_time() >= '22:00:00' then
			if not exists(select * from view_network_packages where `date` = date_sub(utc_date(), interval 1 day)) then
				if get_lock('update_network_packages', 0) = 1 then
					call updateViewNetworkPackages(date_sub(utc_date(), interval 1 day));
					select release_lock('update_network_packages');
				end if;
			end if;
		end if;
	end;
