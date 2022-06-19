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
			select platformId,
				sum(hits) as hits,
				(select sum(hits)
					from platform_version pvi
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
					where pvi.platformId = pv.platformId and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform_version pv
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
			where date >= aDateFrom and date <= aDateTo
			group by platformId
		) t
		join platform p on t.platformId = p.id
	) t2
	where share > 0
	order by share desc;

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
			select platformId,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from platform_version pvi
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
						join country ci on cpvhi.countryIso = ci.iso
					where pvi.platformId = pv.platformId and ci.continentCode = c.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform_version pv
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
				join country c on cpvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by platformId, c.continentCode
		) t
		join platform p on t.platformId = p.id
	) t2
	where share > 0
	order by share desc;

	insert into view_top_platforms
	(period, date, locationType, locationId, name, share, prevShare)
	with prevTotals as (
		select countryIso, sum(hits) as hits
		from country_platform_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'country', countryIso, name,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select platformId,
				countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from platform_version pvi
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
					where pvi.platformId = pv.platformId and cpvhi.countryIso = cpvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform_version pv
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
			where date >= aDateFrom and date <= aDateTo
			group by platformId, countryIso
		) t
		join platform p on t.platformId = p.id
	) t2
	where share > 0
	order by share desc;

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
			select platformVersionId,
				sum(hits) as hits,
				(select sum(hits)
					from country_platform_version_hits cpvhi
					where cpvhi.platformVersionId = cpvh.platformVersionId and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from country_platform_version_hits cpvh
			where date >= aDateFrom and date <= aDateTo
			group by platformVersionId
		) t
		join platform_version pv on t.platformVersionId = pv.id
		join platform p on pv.platformId = p.id
	) t2
	where share > 0
	order by share desc;

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
			select platformVersionId,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from country_platform_version_hits cpvhi
						join country ci on cpvhi.countryIso = ci.iso
					where cpvhi.platformVersionId = cpvh.platformVersionId and ci.continentCode = c.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from country_platform_version_hits cpvh
				join country c on cpvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by platformVersionId, c.continentCode
		) t
		join platform_version pv on t.platformVersionId = pv.id
		join platform p on pv.platformId = p.id
	) t2
	where share > 0
	order by share desc;

	insert into view_top_platform_versions
	(period, date, locationType, locationId, name, version, versionName, share, prevShare)
	with prevTotals as (
		select countryIso, sum(hits) as hits
		from country_platform_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'country', countryIso, name, version, versionName,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select platformVersionId,
				countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from country_platform_version_hits cpvhi
					where cpvhi.platformVersionId = cpvh.platformVersionId and cpvhi.countryIso = cpvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from country_platform_version_hits cpvh
			where date >= aDateFrom and date <= aDateTo
			group by platformVersionId, countryIso
		) t
		join platform_version pv on t.platformVersionId = pv.id
		join platform p on pv.platformId = p.id
	) t2
	where share > 0
	order by share desc;

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
		from country_browser_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', p.name as name, b.name as browser,
			round(hits / nullif((sum(hits) over ()), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from totals), 0) * 100, 2) as prevShare
		from (
			select platformId, browserId,
				sum(hits) as hits,
				(select sum(hits)
					from browser_version bvi
						join country_browser_version_hits cbvhi on bvi.id = cbvhi.browserVersionId
					where cbvhi.platformId = cbvh.platformId and bvi.browserId = bv.browserId and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from browser_version bv
				join country_browser_version_hits cbvh on bv.id = cbvh.browserVersionId
			where date >= aDateFrom and date <= aDateTo
			group by platformId, browserId
		) t
		join platform p on t.platformId = p.id
		join browser b on t.browserId = b.id
	) t2
	where share > 0
	order by share desc;

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
		select aPeriod, aDateFrom, 'continent', continentCode, p.name as name, b.name as browser,
			round(hits / nullif((sum(hits) over (partition by continentCode)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from totals where continentCode = t.continentCode), 0) * 100, 2) as prevShare
		from (
			select platformId, browserId,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from browser_version bvi
						join country_browser_version_hits cbvhi on bvi.id = cbvhi.browserVersionId
						join country ci on cbvhi.countryIso = ci.iso
					where cbvhi.platformId = cbvh.platformId and bvi.browserId = bv.browserId and ci.continentCode = c.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from browser_version bv
				join country_browser_version_hits cbvh on bv.id = cbvh.browserVersionId
				join country c on cbvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by platformId, browserId, c.continentCode
		) t
		join platform p on t.platformId = p.id
		join browser b on t.browserId = b.id
	) t2
	where share > 0
	order by share desc;

	insert into view_top_platform_browsers
	(period, date, locationType, locationId, name, browser, share, prevShare)
	with totals as (
		select countryIso, sum(hits) as hits
		from country_browser_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'country', countryIso, p.name as name, b.name as browser,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from totals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select platformId, browserId,
				countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from browser_version bvi
						join country_browser_version_hits cbvhi on bvi.id = cbvhi.browserVersionId
					where cbvhi.platformId = cbvh.platformId and bvi.browserId = bv.browserId and cbvhi.countryIso = cbvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from browser_version bv
				join country_browser_version_hits cbvh on bv.id = cbvh.browserVersionId
			where date >= aDateFrom and date <= aDateTo
			group by platformId, browserId, countryIso
		) t
		join platform p on t.platformId = p.id
		join browser b on t.browserId = b.id
	) t2
	where share > 0
	order by share desc;

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
		select countryIso, sum(hits) as hits
		from country_platform_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', name, countryIso,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select platformId, countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from platform_version pvi
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
					where pv.platformId = pvi.platformId and cpvhi.countryIso = cpvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform_version pv
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
			where date >= aDateFrom and date <= aDateTo
			group by platformId, countryIso
		) t
		join platform p on t.platformId = p.id
	) t2
	where share > 0
	order by share desc;

	insert into view_top_platform_countries
	(period, date, locationType, locationId, name, countryIso, share, prevShare)
	with prevTotals as (
		select countryIso, sum(hits) as hits
		from country_platform_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'continent', continentCode, name, countryIso,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select platformId, countryIso,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from platform_version pvi
						join country_platform_version_hits cpvhi on pvi.id = cpvhi.platformVersionId
					where pv.platformId = pvi.platformId and cpvhi.countryIso = cpvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from platform_version pv
				join country_platform_version_hits cpvh on pv.id = cpvh.platformVersionId
				join country c on cpvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by platformId, countryIso, c.continentCode
		) t
		join platform p on t.platformId = p.id
	) t2
	where share > 0
	order by share desc;

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
		select countryIso, sum(hits) as hits
		from country_platform_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', name, version, countryIso,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select platformVersionId, countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from country_platform_version_hits cpvhi
					where cpvhi.platformVersionId = cpvh.platformVersionId and cpvhi.countryIso = cpvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from country_platform_version_hits cpvh
			where date >= aDateFrom and date <= aDateTo
			group by platformVersionId, countryIso
		) t
		join platform_version pv on t.platformVersionId = pv.id
		join platform p on pv.platformId = p.id
	) t2
	where share > 0
	order by share desc;

	insert into view_top_platform_version_countries
	(period, date, locationType, locationId, name, version, countryIso, share, prevShare)
	with prevTotals as (
		select countryIso, sum(hits) as hits
		from country_platform_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'continent', continentCode, name, version, countryIso,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select platformVersionId, countryIso,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from country_platform_version_hits cpvhi
					where cpvhi.platformVersionId = cpvh.platformVersionId and cpvhi.countryIso = cpvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from country_platform_version_hits cpvh
				join country c on cpvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by platformVersionId, countryIso, c.continentCode
		) t
		join platform_version pv on t.platformVersionId = pv.id
		join platform p on pv.platformId = p.id
	) t2
	where share > 0
	order by share desc;

	commit;
end;
