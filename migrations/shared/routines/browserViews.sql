create or replace procedure updateViewTopBrowsers(aPeriod varchar(255), aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date)
begin
	declare exit handler for sqlexception
		begin
			rollback;
			resignal;
		end;

	start transaction;

	delete from view_top_browsers where `period` = aPeriod and `date` = aDateFrom;

	insert into view_top_browsers
	(period, date, locationType, locationId, name, share, prevShare)
	with prevTotals as (
		select sum(hits) as hits
		from country_browser_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', name,
			round(hits / nullif((sum(hits) over ()), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals), 0) * 100, 2) as prevShare
		from (
			select browserId,
				sum(hits) as hits,
				(select sum(hits)
					from browser_version bvi
						join country_browser_version_hits cbvhi on bvi.id = cbvhi.browserVersionId
					where bvi.browserId = bv.browserId and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from browser_version bv
				join country_browser_version_hits cbvh on bv.id = cbvh.browserVersionId
			where date >= aDateFrom and date <= aDateTo
			group by browserId
		) t
		join browser p on t.browserId = p.id
	) t2
	where share > 0
	order by share desc;

	insert into view_top_browsers
	(period, date, locationType, locationId, name, share, prevShare)
	with prevTotals as (
		select continentCode, sum(hits) as hits
		from country_browser_version_hits cbvh
			join country c on cbvh.countryIso = c.iso
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by continentCode
	)
	select * from (
		select aPeriod, aDateFrom, 'continent', continentCode, name,
			round(hits / nullif((sum(hits) over (partition by continentCode)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where continentCode = t.continentCode), 0) * 100, 2) as prevShare
		from (
			select browserId,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from browser_version bvi
						join country_browser_version_hits cbvhi on bvi.id = cbvhi.browserVersionId
						join country ci on cbvhi.countryIso = ci.iso
					where bvi.browserId = bv.browserId and ci.continentCode = c.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from browser_version bv
				join country_browser_version_hits cbvh on bv.id = cbvh.browserVersionId
				join country c on cbvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by browserId, c.continentCode
		) t
		join browser p on t.browserId = p.id
	) t2
	where share > 0
	order by share desc;

	insert into view_top_browsers
	(period, date, locationType, locationId, name, share, prevShare)
	with prevTotals as (
		select countryIso, sum(hits) as hits
		from country_browser_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'country', countryIso, name,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select browserId,
				countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from browser_version bvi
						join country_browser_version_hits cbvhi on bvi.id = cbvhi.browserVersionId
					where bvi.browserId = bv.browserId and cbvhi.countryIso = cbvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from browser_version bv
				join country_browser_version_hits cbvh on bv.id = cbvh.browserVersionId
			where date >= aDateFrom and date <= aDateTo
			group by browserId, countryIso
		) t
		join browser p on t.browserId = p.id
	) t2
	where share > 0
	order by share desc;

	commit;
end;


create or replace procedure updateViewTopBrowserVersions(aPeriod varchar(255), aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date)
begin
	declare exit handler for sqlexception
		begin
			rollback;
			resignal;
		end;

	start transaction;

	delete from view_top_browser_versions where `period` = aPeriod and `date` = aDateFrom;

	insert into view_top_browser_versions
	(period, date, locationType, locationId, name, version, share, prevShare)
	with prevTotals as (
		select sum(hits) as hits
		from country_browser_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', name, version,
			round(hits / nullif((sum(hits) over ()), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals), 0) * 100, 2) as prevShare
		from (
			select browserVersionId,
				sum(hits) as hits,
				(select sum(hits)
					from country_browser_version_hits cbvhi
					where cbvhi.browserVersionId = cbvh.browserVersionId and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from country_browser_version_hits cbvh
			where date >= aDateFrom and date <= aDateTo
			group by browserVersionId
		) t
		join browser_version bv on t.browserVersionId = bv.id
		join browser p on bv.browserId = p.id
	) t2
	where share > 0
	order by share desc;

	insert into view_top_browser_versions
	(period, date, locationType, locationId, name, version, share, prevShare)
	with prevTotals as (
		select continentCode, sum(hits) as hits
		from country_browser_version_hits cbvh
			join country c on cbvh.countryIso = c.iso
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by continentCode
	)
	select * from (
		select aPeriod, aDateFrom, 'continent', continentCode, name, version,
			round(hits / nullif((sum(hits) over (partition by continentCode)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where continentCode = t.continentCode), 0) * 100, 2) as prevShare
		from (
			select browserVersionId,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from country_browser_version_hits cbvhi
						join country ci on cbvhi.countryIso = ci.iso
					where cbvhi.browserVersionId = cbvh.browserVersionId and ci.continentCode = c.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from country_browser_version_hits cbvh
				join country c on cbvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by browserVersionId, c.continentCode
		) t
		join browser_version bv on t.browserVersionId = bv.id
		join browser p on bv.browserId = p.id
	) t2
	where share > 0
	order by share desc;

	insert into view_top_browser_versions
	(period, date, locationType, locationId, name, version, share, prevShare)
	with prevTotals as (
		select countryIso, sum(hits) as hits
		from country_browser_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'country', countryIso, name, version,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select browserVersionId,
				countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from country_browser_version_hits cbvhi
					where cbvhi.browserVersionId = cbvh.browserVersionId and cbvhi.countryIso = cbvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from country_browser_version_hits cbvh
			where date >= aDateFrom and date <= aDateTo
			group by browserVersionId, countryIso
		) t
		join browser_version bv on t.browserVersionId = bv.id
		join browser p on bv.browserId = p.id
	) t2
	where share > 0
	order by share desc;

	commit;
end;


create or replace procedure updateViewTopBrowserCountries(aPeriod varchar(255), aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date)
begin
	declare exit handler for sqlexception
		begin
			rollback;
			resignal;
		end;

	start transaction;

	delete from view_top_browser_countries where `period` = aPeriod and `date` = aDateFrom;

	insert into view_top_browser_countries
	(period, date, locationType, locationId, name, countryIso, share, prevShare)
	with prevTotals as (
		select countryIso, sum(hits) as hits
		from country_browser_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', name, countryIso,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select browserId, countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from browser_version bvi
						join country_browser_version_hits cbvhi on bvi.id = cbvhi.browserVersionId
					where bv.browserId = bvi.browserId and cbvhi.countryIso = cbvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from browser_version bv
				join country_browser_version_hits cbvh on bv.id = cbvh.browserVersionId
			where date >= aDateFrom and date <= aDateTo
			group by browserId, countryIso
		) t
		join browser p on t.browserId = p.id
	) t2
	where share > 0
	order by share desc;

	insert into view_top_browser_countries
	(period, date, locationType, locationId, name, countryIso, share, prevShare)
	with prevTotals as (
		select countryIso, sum(hits) as hits
		from country_browser_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'continent', continentCode, name, countryIso,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select browserId, countryIso,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from browser_version bvi
						join country_browser_version_hits cbvhi on bvi.id = cbvhi.browserVersionId
					where bv.browserId = bvi.browserId and cbvhi.countryIso = cbvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from browser_version bv
				join country_browser_version_hits cbvh on bv.id = cbvh.browserVersionId
				join country c on cbvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by browserId, countryIso, c.continentCode
		) t
		join browser p on t.browserId = p.id
	) t2
	where share > 0
	order by share desc;

	commit;
end;


create or replace procedure updateViewTopBrowserVersionCountries(aPeriod varchar(255), aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date)
begin
	declare exit handler for sqlexception
		begin
			rollback;
			resignal;
		end;

	start transaction;

	delete from view_top_browser_version_countries where `period` = aPeriod and `date` = aDateFrom;

	insert into view_top_browser_version_countries
	(period, date, locationType, locationId, name, version, countryIso, share, prevShare)
	with prevTotals as (
		select countryIso, sum(hits) as hits
		from country_browser_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'global', '', name, version, countryIso,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select browserVersionId, countryIso,
				sum(hits) as hits,
				(select sum(hits)
					from country_browser_version_hits cbvhi
					where cbvhi.browserVersionId = cbvh.browserVersionId and countryIso = cbvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from country_browser_version_hits cbvh
			where date >= aDateFrom and date <= aDateTo
			group by browserVersionId, countryIso
		) t
		join browser_version bv on t.browserVersionId = bv.id
		join browser p on bv.browserId = p.id
	) t2
	where share > 0
	order by share desc;

	insert into view_top_browser_version_countries
	(period, date, locationType, locationId, name, version, countryIso, share, prevShare)
	with prevTotals as (
		select countryIso, sum(hits) as hits
		from country_browser_version_hits
		where date >= aPrevDateFrom and date <= aPrevDateTo
		group by countryIso
	)
	select * from (
		select aPeriod, aDateFrom, 'continent', continentCode, name, version, countryIso,
			round(hits / nullif((sum(hits) over (partition by countryIso)), 0) * 100, 2) as share,
			round(coalesce(prevHits, 0) / nullif((select hits from prevTotals where countryIso = t.countryIso), 0) * 100, 2) as prevShare
		from (
			select browserVersionId, countryIso,
				continentCode,
				sum(hits) as hits,
				(select sum(hits)
					from country_browser_version_hits cbvhi
					where cbvhi.browserVersionId = cbvh.browserVersionId and countryIso = cbvh.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
				) as prevHits
			from country_browser_version_hits cbvh
				join country c on cbvh.countryIso = c.iso
			where date >= aDateFrom and date <= aDateTo
			group by browserVersionId, countryIso, c.continentCode
		) t
		join browser_version bv on t.browserVersionId = bv.id
		join browser p on bv.browserId = p.id
	) t2
	where share > 0
	order by share desc;

	commit;
end;
