create or replace procedure updateViewTopPlatforms(aPeriod varchar(255), aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date)
begin
	declare exit handler for sqlexception
		begin
			rollback;
			resignal;
		end;

	start transaction;

	delete from view_top_platforms where `period` = aPeriod and `date` = aDateFrom;

	insert into view_top_platforms
	(period, date, locationType, locationId, name, share, prevShare)
	with prevTotals as (
		select sum(hits) as hits
		from country_platform_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', name,
			round(hits / nullif((sum(hits) over ()), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals), 0) * 100, 2) as prevShare
		from (
			select name,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
					where platform.id = p.id and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
			where date >= aDateFrom and date <= aDateTo
			group by name
			order by hits desc
		) t
	) t2
	where share > 0;

	insert into view_top_platforms
	(period, date, locationType, locationId, name, share, prevShare)
	with prevTotals as (
		select continentCode, sum(hits) as hits
		from country_platform_version_hits cpvh
			join country c on cpvh.countryIso = c.iso
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by continentCode
	)
	select * from (
		select aPeriod, aDateFrom, 'continent', continentCode, name,
			round(hits / nullif((sum(hits) over (partition by continentCode)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where continentCode = t.continentCode), 0) * 100, 2) as prevShare
		from (
			select name,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
						join country ci on cpvhi.countryIso = ci.iso
					where platform.id = p.id and ci.continentCode = c.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
				join country c on cpvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by name, c.continentCode
			order by hits desc
		) t
	) t2
	where share > 0;

	insert into view_top_platforms
	(period, date, locationType, locationId, name, share, prevShare)
	with prevTotals as (
		select countryIso, sum(hits) as hits
		from country_platform_version_hits cpvh
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'country', countryIso, name,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select name,
				countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
					where platform.id = p.id and cpvhi.countryIso = cpvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
			where date >= aDateFrom and date <= aDateTo
			group by name, countryIso
			order by hits desc
		) t
	) t2
	where share > 0;

	commit;
end;


create or replace procedure updateViewTopPlatformVersions(aPeriod varchar(255), aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date)
begin
	declare exit handler for sqlexception
		begin
			rollback;
			resignal;
		end;

	start transaction;

	delete from view_top_platform_versions where `period` = aPeriod and `date` = aDateFrom;

	insert into view_top_platform_versions
	(period, date, locationType, locationId, name, version, versionName, share, prevShare)
	with prevTotals as (
		select sum(hits) as hits
		from country_platform_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', name, version, versionName,
			round(hits / nullif((sum(hits) over ()), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals), 0) * 100, 2) as prevShare
		from (
			select name, version, versionName,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
					where platform.id = p.id and pvi.id = pv.id and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
			where date >= aDateFrom and date <= aDateTo
			group by name, version, versionName
			order by hits desc
		) t
	) t2
	where share > 0;

	insert into view_top_platform_versions
	(period, date, locationType, locationId, name, version, versionName, share, prevShare)
	with prevTotals as (
		select continentCode, sum(hits) as hits
		from country_platform_version_hits cpvh
			join country c on cpvh.countryIso = c.iso
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by continentCode
	)
	select * from (
		select aPeriod, aDateFrom, 'continent', continentCode, name, version, versionName,
			round(hits / nullif((sum(hits) over (partition by continentCode)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where continentCode = t.continentCode), 0) * 100, 2) as prevShare
		from (
			select name, version, versionName,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
						join country ci on cpvhi.countryIso = ci.iso
					where platform.id = p.id and pvi.id = pv.id and ci.continentCode = c.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
				join country c on cpvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by name, version, versionName, c.continentCode
			order by hits desc
		) t
	) t2
	where share > 0;

	insert into view_top_platform_versions
	(period, date, locationType, locationId, name, version, versionName, share, prevShare)
	with prevTotals as (
		select countryIso, sum(hits) as hits
		from country_platform_version_hits cpvh
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'country', countryIso, name, version, versionName,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select name, version, versionName,
				countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
					where platform.id = p.id and pvi.id = pv.id and cpvhi.countryIso = cpvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
			where date >= aDateFrom and date <= aDateTo
			group by name, version, versionName, countryIso
			order by hits desc
		) t
	) t2
	where share > 0;

	commit;
end;


create or replace procedure updateViewTopPlatformBrowsers(aPeriod varchar(255), aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date)
begin
	declare exit handler for sqlexception
		begin
			rollback;
			resignal;
		end;

	start transaction;

	delete from view_top_platform_browsers where `period` = aPeriod and `date` = aDateFrom;

	insert into view_top_platform_browsers
	(period, date, locationType, locationId, name, browser, share, prevShare)
	with totals as (
		select sum(hits) as hits
		from country_browser_version_hits cbvh
		where date >= aPrevDateFrom and date <= aPrevDateTo
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', name, browser,
			round(hits / nullif((sum(hits) over ()), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from totals), 0) * 100, 2) as prevShare
		from (
			select p.name as name, b.name as browser,
				sum(hits) as hits,
				(select sum(hits)
					from browser bi
						join browser_version bvi on bi.id = bvi.browserId
						join country_browser_version_hits cbvhi on bvi.id = cbvhi.browserVersionId
						join platform pi on cbvhi.platformId = pi.id
					where pi.id = p.id and bi.id = b.id and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from browser b
				join browser_version bv on b.id = bv.browserId
				join country_browser_version_hits cbvh on bv.id = cbvh.browserVersionId
				join platform p on cbvh.platformId = p.id
			where date >= aDateFrom and date <= aDateTo
			group by name, browser
			order by hits desc
		) t
	) t2
	where share > 0;

	insert into view_top_platform_browsers
	(period, date, locationType, locationId, name, browser, share, prevShare)
	with totals as (
		select continentCode, sum(hits) as hits
		from country_browser_version_hits cbvh
			join country c on cbvh.countryIso = c.iso
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by continentCode
	)
	select * from (
		select aPeriod, aDateFrom, 'continent', continentCode, name, browser,
			round(hits / nullif((sum(hits) over (partition by continentCode)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from totals where continentCode = t.continentCode), 0) * 100, 2) as prevShare
		from (
			select p.name as name, b.name as browser,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from browser bi
						join browser_version bvi on bi.id = bvi.browserId
						join country_browser_version_hits cbvhi on bvi.id = cbvhi.browserVersionId
						join platform pi on cbvhi.platformId = pi.id
						join country ci on cbvhi.countryIso = ci.iso
					where pi.id = p.id and bi.id = b.id and ci.continentCode = c.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from browser b
				join browser_version bv on b.id = bv.browserId
				join country_browser_version_hits cbvh on bv.id = cbvh.browserVersionId
				join platform p on cbvh.platformId = p.id
				join country c on cbvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by name, browser, c.continentCode
			order by hits desc
		) t
	) t2
	where share > 0;

	insert into view_top_platform_browsers
	(period, date, locationType, locationId, name, browser, share, prevShare)
	with totals as (
		select countryIso, sum(hits) as hits
		from country_browser_version_hits cbvh
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'country', countryIso, name, browser,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from totals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select p.name as name, b.name as browser,
				countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from browser bi
						join browser_version bvi on bi.id = bvi.browserId
						join country_browser_version_hits cbvhi on bvi.id = cbvhi.browserVersionId
						join platform pi on cbvhi.platformId = pi.id
					where pi.id = p.id and bi.id = b.id and cbvhi.countryIso = cbvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from browser b
				join browser_version bv on b.id = bv.browserId
				join country_browser_version_hits cbvh on bv.id = cbvh.browserVersionId
				join platform p on cbvh.platformId = p.id
			where date >= aDateFrom and date <= aDateTo
			group by name, browser, countryIso
			order by hits desc
		) t
	) t2
	where share > 0;

	commit;
end;


create or replace procedure updateViewTopPlatformCountries(aPeriod varchar(255), aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date)
begin
	declare exit handler for sqlexception
		begin
			rollback;
			resignal;
		end;

	start transaction;

	delete from view_top_platform_countries where `period` = aPeriod and `date` = aDateFrom;

	insert into view_top_platform_countries
	(period, date, locationType, locationId, name, countryIso, share, prevShare)
	with prevTotals as (
		select sum(hits) as hits
		from country_platform_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', name, countryIso,
			round(hits / nullif((sum(hits) over ()), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals), 0) * 100, 2) as prevShare
		from (
			select name, countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
					where platform.id = p.id and cpvhi.countryIso = cpvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
			where date >= aDateFrom and date <= aDateTo
			group by name, countryIso
			order by hits desc
		) t
	) t2
	where share > 0;

	insert into view_top_platform_countries
	(period, date, locationType, locationId, name, countryIso, share, prevShare)
	with prevTotals as (
		select continentCode, sum(hits) as hits
		from country_platform_version_hits cpvh
			join country c on cpvh.countryIso = c.iso
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by continentCode
	)
	select * from (
		select aPeriod, aDateFrom, 'continent', continentCode, name, countryIso,
			round(hits / nullif((sum(hits) over (partition by continentCode)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where continentCode = t.continentCode), 0) * 100, 2) as prevShare
		from (
			select name, countryIso,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
						join country ci on cpvhi.countryIso = ci.iso
					where platform.id = p.id and cpvhi.countryIso = cpvh.countryIso and ci.continentCode = c.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
				join country c on cpvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by name, countryIso, c.continentCode
			order by hits desc
		) t
	) t2
	where share > 0;

	commit;
end;



create or replace procedure updateViewTopPlatformVersionCountries(aPeriod varchar(255), aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date)
begin
	declare exit handler for sqlexception
		begin
			rollback;
			resignal;
		end;

	start transaction;

	delete from view_top_platform_version_countries where `period` = aPeriod and `date` = aDateFrom;

	insert into view_top_platform_version_countries
	(period, date, locationType, locationId, name, version, countryIso, share, prevShare)
	with prevTotals as (
		select sum(hits) as hits
		from country_platform_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', name, version, countryIso,
			round(hits / nullif((sum(hits) over ()), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals), 0) * 100, 2) as prevShare
		from (
			select name, version, countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
					where platform.id = p.id and pvi.id = pv.id and cpvhi.countryIso = cpvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
			where date >= aDateFrom and date <= aDateTo
			group by name, version, countryIso
			order by hits desc
		) t
	) t2
	where share > 0;

	insert into view_top_platform_version_countries
	(period, date, locationType, locationId, name, version, countryIso, share, prevShare)
	with prevTotals as (
		select continentCode, sum(hits) as hits
		from country_platform_version_hits cpvh
			join country c on cpvh.countryIso = c.iso
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by continentCode
	)
	select * from (
		select aPeriod, aDateFrom, 'continent', continentCode, name, version, countryIso,
			round(hits / nullif((sum(hits) over (partition by continentCode)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where continentCode = t.continentCode), 0) * 100, 2) as prevShare
		from (
			select name, version, countryIso,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from platform
						join platform_version pvi on platform.id = pvi.platformId
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
						join country ci on cpvhi.countryIso = ci.iso
					where platform.id = p.id and pvi.id = pv.id and cpvhi.countryIso = cpvh.countryIso and ci.continentCode = c.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform p
				join platform_version pv on p.id = pv.platformId
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
				join country c on cpvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by name, version, countryIso, c.continentCode
			order by hits desc
		) t
	) t2
	where share > 0;

	commit;
end;
