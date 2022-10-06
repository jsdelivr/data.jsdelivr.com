create or replace event update_daily_data
	on schedule
		every 5 minute
			starts utc_date()
	do
	begin
		if get_lock('update_daily_data', 0) = 1 then
			if not exists(select * from view_network_countries where `date` = utc_date()) then
				call updateViewNetworkCountries(utc_date());
			end if;

			if utc_time() >= '22:00:00' then
				if not exists(select * from view_network_countries where `date` = date_add(utc_date(), interval 1 day)) then
					call updateViewNetworkCountries(date_add(utc_date(), interval 1 day));
				end if;
			end if;

			if not exists(select * from view_network_cdns where `date` = utc_date()) then
				call updateViewNetworkCdns(utc_date());
			end if;

			if utc_time() >= '22:00:00' then
				if not exists(select * from view_network_cdns where `date` = date_add(utc_date(), interval 1 day)) then
					call updateViewNetworkCdns(date_add(utc_date(), interval 1 day));
				end if;
			end if;

			if not exists(select * from view_network_packages where `date` = date_sub(utc_date(), interval 2 day)) then
				call updateViewNetworkPackages(utc_date());
			end if;

			if utc_time() >= '22:00:00' then
				if not exists(select * from view_network_packages where `date` = date_sub(utc_date(), interval 1 day)) then
					call updateViewNetworkPackages(date_add(utc_date(), interval 1 day));
				end if;
			end if;

			if not exists(select * from view_top_package_files where `date` = utc_date()) then
				call updateViewTopPackageFiles(utc_date());
			end if;

			if not exists(select * from view_top_packages where `date` = utc_date()) then
				call updateViewTopPackages(utc_date());
			end if;

			if utc_time() >= '22:00:00' then
				if not exists(select * from view_top_packages where `date` = date_add(utc_date(), interval 1 day)) then
					call updateViewTopPackages(date_add(utc_date(), interval 1 day));
				end if;
			end if;

			if not exists(select * from view_top_proxies where `date` = utc_date()) then
				call updateViewTopProxies(utc_date());
			end if;

			if utc_time() >= '22:00:00' then
				if not exists(select * from view_top_proxies where `date` = date_add(utc_date(), interval 1 day)) then
					call updateViewTopProxies(date_add(utc_date(), interval 1 day));
				end if;
			end if;

			if not exists(select * from view_top_proxy_files where `date` = utc_date()) then
				call updateViewTopProxyFiles(utc_date());
			end if;

			if utc_time() >= '22:00:00' then
				if not exists(select * from view_top_proxy_files where `date` = date_add(utc_date(), interval 1 day)) then
					call updateViewTopProxyFiles(date_add(utc_date(), interval 1 day));
				end if;
			end if;

			call updateMonthlyViews(utc_date());
			call updateYearlyViews(utc_date());

			select release_lock('update_daily_data');
		end if;
	end;
