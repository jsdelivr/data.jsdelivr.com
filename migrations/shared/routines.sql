create or replace procedure analyzeAllTables()
begin
	for row in (
		select table_name from information_schema.tables
		where table_schema = database() and table_type = 'base table'
	)
	do
		execute immediate concat('analyze table `', row.table_name, '`');
	end for;
end;

create or replace procedure updateViewNetworkPackages(aDate date)
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


create or replace procedure updateViewTopPackageFiles(aDate date)
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

			if not exists(select * from view_top_packages where `date` = @latestStart and period = 's-month') then
				call updateViewTopPackagesForPeriod('s-month', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_top_proxies where `date` = @latestStart and period = 's-month') then
				call updateViewTopProxiesForPeriod('s-month', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_top_proxy_files where `date` = @latestStart and period = 's-month') then
				call updateViewTopProxyFilesForPeriod('s-month', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_network_countries where `date` = @latestStart and period = 's-month') then
				call updateViewNetworkCountriesForPeriod('s-month', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_network_cdns where `date` = @latestStart and period = 's-month') then
				call updateViewNetworkCdnsForPeriod('s-month', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_top_platforms where `date` = @latestStart and period = 's-month') then
				call updateViewTopPlatforms('s-month', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_versions where `date` = @latestStart and period = 's-month') then
				call updateViewTopPlatformVersions('s-month', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_browsers where `date` = @latestStart and period = 's-month') then
				call updateViewTopPlatformBrowsers('s-month', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_countries where `date` = @latestStart and period = 's-month') then
				call updateViewTopPlatformCountries('s-month', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_version_countries where `date` = @latestStart and period = 's-month') then
				call updateViewTopPlatformVersionCountries('s-month', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browsers where `date` = @latestStart and period = 's-month') then
				call updateViewTopBrowsers('s-month', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browser_versions where `date` = @latestStart and period = 's-month') then
				call updateViewTopBrowserVersions('s-month', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browser_platforms where `date` = @latestStart and period = 's-month') then
				call updateViewTopBrowserPlatforms('s-month', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browser_countries where `date` = @latestStart and period = 's-month') then
				call updateViewTopBrowserCountries('s-month', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browser_version_countries where `date` = @latestStart and period = 's-month') then
				call updateViewTopBrowserVersionCountries('s-month', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;
		end while;
end;


create or replace procedure updateQuarterlyViews(aDate date)
begin
	set aDate = date_sub(aDate, interval 3 day);
	set @firstStart = date('2020-01-01');
	set @latestStart = date_sub(aDate, interval dayofmonth(aDate) - 1 day);
	set @latestStart = date_sub(@latestStart, interval month(@latestStart) - floor((month(@latestStart) - 1) / 3) * 3 - 1 month);

	while date_sub(@latestStart, interval 3 month) >= @firstStart
		do
			set @latestStart = date_sub(@latestStart, interval 3 month);
			set @dateFrom = @latestStart;
			set @dateTo = date_sub(date_add(@dateFrom, interval 3 month), interval 1 day);
			set @prevDateFrom = date_sub(@dateFrom, interval 3 month);
			set @prevDateTo = date_sub(@dateFrom, interval 1 day);

			if not exists(select * from view_top_packages where `date` = @latestStart and period = 's-quarter') then
				call updateViewTopPackagesForPeriod('s-quarter', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_top_proxies where `date` = @latestStart and period = 's-quarter') then
				call updateViewTopProxiesForPeriod('s-quarter', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_top_proxy_files where `date` = @latestStart and period = 's-quarter') then
				call updateViewTopProxyFilesForPeriod('s-quarter', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_network_countries where `date` = @latestStart and period = 's-quarter') then
				call updateViewNetworkCountriesForPeriod('s-quarter', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_network_cdns where `date` = @latestStart and period = 's-quarter') then
				call updateViewNetworkCdnsForPeriod('s-quarter', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_top_platforms where `date` = @latestStart and period = 's-quarter') then
				call updateViewTopPlatforms('s-quarter', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_versions where `date` = @latestStart and period = 's-quarter') then
				call updateViewTopPlatformVersions('s-quarter', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_browsers where `date` = @latestStart and period = 's-quarter') then
				call updateViewTopPlatformBrowsers('s-quarter', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_countries where `date` = @latestStart and period = 's-quarter') then
				call updateViewTopPlatformCountries('s-quarter', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_version_countries where `date` = @latestStart and period = 's-quarter') then
				call updateViewTopPlatformVersionCountries('s-quarter', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browsers where `date` = @latestStart and period = 's-quarter') then
				call updateViewTopBrowsers('s-quarter', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browser_versions where `date` = @latestStart and period = 's-quarter') then
				call updateViewTopBrowserVersions('s-quarter', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browser_platforms where `date` = @latestStart and period = 's-quarter') then
				call updateViewTopBrowserPlatforms('s-quarter', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browser_countries where `date` = @latestStart and period = 's-quarter') then
				call updateViewTopBrowserCountries('s-quarter', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browser_version_countries where `date` = @latestStart and period = 's-quarter') then
				call updateViewTopBrowserVersionCountries('s-quarter', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
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

			if not exists(select * from view_top_packages where `date` = @latestStart and period = 's-year') then
				call updateViewTopPackagesForPeriod('s-year', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_top_proxies where `date` = @latestStart and period = 's-year') then
				call updateViewTopProxiesForPeriod('s-year', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_top_proxy_files where `date` = @latestStart and period = 's-year') then
				call updateViewTopProxyFilesForPeriod('s-year', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_network_countries where `date` = @latestStart and period = 's-year') then
				call updateViewNetworkCountriesForPeriod('s-year', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_network_cdns where `date` = @latestStart and period = 's-year') then
				call updateViewNetworkCdnsForPeriod('s-year', @dateFrom, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, false);
			end if;

			if not exists(select * from view_top_platforms where `date` = @latestStart and period = 's-year') then
				call updateViewTopPlatforms('s-year', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_versions where `date` = @latestStart and period = 's-year') then
				call updateViewTopPlatformVersions('s-year', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_browsers where `date` = @latestStart and period = 's-year') then
				call updateViewTopPlatformBrowsers('s-year', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_countries where `date` = @latestStart and period = 's-year') then
				call updateViewTopPlatformCountries('s-year', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_platform_version_countries where `date` = @latestStart and period = 's-year') then
				call updateViewTopPlatformVersionCountries('s-year', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browsers where `date` = @latestStart and period = 's-year') then
				call updateViewTopBrowsers('s-year', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browser_versions where `date` = @latestStart and period = 's-year') then
				call updateViewTopBrowserVersions('s-year', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browser_platforms where `date` = @latestStart and period = 's-year') then
				call updateViewTopBrowserPlatforms('s-year', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browser_countries where `date` = @latestStart and period = 's-year') then
				call updateViewTopBrowserCountries('s-year', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;

			if not exists(select * from view_top_browser_version_countries where `date` = @latestStart and period = 's-year') then
				call updateViewTopBrowserVersionCountries('s-year', @dateFrom, @dateTo, @prevDateFrom, @prevDateTo);
			end if;
		end while;
end;
