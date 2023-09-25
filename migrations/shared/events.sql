create or replace event update_daily_data
	on schedule
		every 10 minute
			starts utc_date()
	do
	begin
		if get_lock('update_daily_data', 0) = 1 then
			call updateViewNetworkCountries(utc_date(), false);

			if utc_time() >= '16:00:00' then
				call updateViewNetworkCountries(date_add(utc_date(), interval 1 day), false);
			end if;

			call updateViewNetworkCdns(utc_date(), false);

			if utc_time() >= '16:00:00' then
				call updateViewNetworkCdns(date_add(utc_date(), interval 1 day), false);
			end if;

			call updateViewTopPackages(utc_date(), false);

			if utc_time() >= '16:00:00' then
				call updateViewTopPackages(date_add(utc_date(), interval 1 day), false);
			end if;

			call updateViewTopProxies(utc_date(), false);

			if utc_time() >= '16:00:00' then
				call updateViewTopProxies(date_add(utc_date(), interval 1 day), false);
			end if;

			call updateViewTopProxyFiles(utc_date(), false);

			if utc_time() >= '16:00:00' then
				call updateViewTopProxyFiles(date_add(utc_date(), interval 1 day), false);
			end if;

			if not exists(select * from view_top_package_files where `date` = utc_date()) then
				call updateViewTopPackageFiles(utc_date());
			end if;

			call updateMonthlyViews(utc_date());
			call updateQuarterlyViews(utc_date());
			call updateYearlyViews(utc_date());

			select release_lock('update_daily_data');
		end if;
	end;


create or replace event update_daily_data_once
	on schedule
		every 1 day
			starts utc_date() + interval 22 hour
	do
	begin
		call updateViewNetworkPackages(date_add(utc_date(), interval 1 day));
	end;
