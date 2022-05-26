const dedent = require('dedent-js');
const periods = [ [ 1, 'day' ], [ 7, 'week' ], [ 30, 'month' ], [ 365, 'year' ], [ '2017-08-17', 'all' ] ];

module.exports = async (db) => {
	// language=MariaDB
	await db.schema.raw(dedent`
		drop procedure if exists updateViewTopPackages;
		create procedure updateViewTopPackages(aDate date)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

			start transaction;

${periods.map(period => topPackagesForPeriod(period)).join('\n')}

			commit;
		end;
	`);

	// language=MariaDB
	await db.schema.raw(dedent`
		drop procedure if exists updateViewTopProxies;
		create procedure updateViewTopProxies(aDate date)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

			start transaction;

${periods.map(period => topProxiesForPeriod(period)).join('\n')}

			commit;
		end;
	`);

	// language=MariaDB
	await db.schema.raw(dedent`
		drop procedure if exists updateViewNetworkCountries;
		create procedure updateViewNetworkCountries(aDate date)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

			start transaction;

${periods.map(period => countriesForPeriod(period)).join('\n')}

			commit;
		end;
	`);

	// language=MariaDB
	await db.schema.raw(dedent`
		drop procedure if exists updateViewNetworkCdns;
		create procedure updateViewNetworkCdns(aDate date)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

			start transaction;

${periods.map(period => cdnsForPeriod(period)).join('\n')}

			commit;
		end;
	`);
};

function dateVarsForPeriod (days, period) {
	// language=MariaDB
	return `
		set @dateFrom = ${period === 'all' ? `'${days}'` : `date_sub(aDate, interval ${days + 1} day)`};
		set @dateTo = date_sub(aDate, interval 2 day);
		set @prevDateFrom = ${period === 'all' ? `'${days}'` : `date_sub(@dateFrom, interval ${days} day)`};
		set @prevDateTo = date_sub(@dateFrom, interval 1 day);
	`;
}

function topPackagesForPeriod ([ days, period ]) {
	// language=MariaDB
	return `
${dateVarsForPeriod(days, period)}

		delete from view_top_packages where \`period\` = '${period}' and \`date\` = aDate;
		delete from view_top_packages where \`period\` = '${period}' and\`date\` < @dateTo;

		insert into view_top_packages
			(period, date, type, name,
			 hitsRank, hitsTypeRank, hits, bandwidthRank, bandwidthTypeRank, bandwidth,
			 prevHitsRank, prevHitsTypeRank, prevHits, prevBandwidthRank, prevBandwidthTypeRank, prevBandwidth)
		select '${period}', aDate, type, name,
			if(hits > 0, rank() over (order by hits desc) - 1, null),
			if(hits > 0, rank() over (partition by type order by hits desc) - 1, null),
			hits,
			if(bandwidth > 0, rank() over (order by bandwidth desc) - 1, null),
			if(bandwidth > 0, rank() over (partition by type order by bandwidth desc) - 1, null),
			bandwidth,
			if(prevHits > 0, rank() over (order by prevHits desc) - 1, null),
			if(prevHits > 0, rank() over (partition by type order by prevHits desc) - 1, null),
			coalesce(prevHits, 0),
			if(prevBandwidth > 0, rank() over (order by prevBandwidth desc) - 1, null),
			if(prevBandwidth > 0, rank() over (partition by type order by prevBandwidth desc) - 1, null),
			coalesce(prevBandwidth, 0)
		from (
			select type, name,
				sum(hits) as hits,
				sum(bandwidth) as bandwidth,
				# These nested queries perform SIGNIFICANTLY better than a join (on MariaDB 10.5).
				(select sum(hits)
				 from package_hits
				 where packageId = package.id and date >= @prevDateFrom and date <= @prevDateTo
				 group by packageId) as prevHits,
				(select sum(bandwidth)
				 from package_hits
				 where packageId = package.id and date >= @prevDateFrom and date <= @prevDateTo
				 group by packageId) as prevBandwidth
			from package
				     join package_hits on package.id = package_hits.packageId
			where isPrivate = 0 and date >= @dateFrom and date <= @dateTo
			group by packageId
			order by hits desc
		) t;
	`;
}

function topProxiesForPeriod ([ days, period ]) {
	// language=MariaDB
	return `
${dateVarsForPeriod(days, period)}

		delete from view_top_proxies where \`period\` = '${period}' and \`date\` = aDate;
		delete from view_top_proxies where \`period\` = '${period}' and\`date\` < @dateTo;

		insert into view_top_proxies
			(period, date, name, hits, bandwidth, prevHits, prevBandwidth)
		select '${period}', aDate, name,
			hits, bandwidth,
			coalesce(prevHits, 0), coalesce(prevBandwidth, 0)
		from (
			select name,
				sum(hits) as hits,
				sum(bandwidth) as bandwidth,
				(select sum(hits) from proxy_hits where proxyId = proxy.id and date >= @prevDateFrom and date <= @prevDateTo) as prevHits,
				(select sum(bandwidth) from proxy_hits where proxyId = proxy.id and date >= @prevDateFrom and date <= @prevDateTo) as prevBandwidth
			from proxy
				     join proxy_hits on proxy.id = proxy_hits.proxyId
			where date >= @dateFrom and date <= @dateTo
			group by name
			order by hits desc
		) t;
	`;
}

function countriesForPeriod ([ days, period ]) {
	// language=MariaDB
	return `
${dateVarsForPeriod(days, period)}

		delete from view_network_countries where \`period\` = '${period}' and \`date\` = aDate;
		delete from view_network_countries where \`period\` = '${period}' and\`date\` < @dateTo;

		insert into view_network_countries
			(period, date, countryIso, hits, bandwidth, prevHits, prevBandwidth)
		select '${period}', aDate, countryIso,
			hits, bandwidth,
			coalesce(prevHits, 0), coalesce(prevBandwidth, 0)
		from (
			select countryIso,
				sum(hits) as hits,
				sum(bandwidth) as bandwidth,
				(select sum(hits) from country_cdn_hits where cch.countryIso = country_cdn_hits.countryIso and date >= @prevDateFrom and date <= @prevDateTo) as prevHits,
				(select sum(bandwidth) from country_cdn_hits where cch.countryIso = country_cdn_hits.countryIso and date >= @prevDateFrom and date <= @prevDateTo) as prevBandwidth
			from country_cdn_hits cch
			where date >= @dateFrom and date <= @dateTo
			group by countryIso
			order by hits desc
		) t;
	`;
}

function cdnsForPeriod ([ days, period ]) {
	// language=MariaDB
	return `
${dateVarsForPeriod(days, period)}

		delete from view_network_cdns where \`period\` = '${period}' and \`date\` = aDate;
		delete from view_network_cdns where \`period\` = '${period}' and\`date\` < @dateTo;

		insert into view_network_cdns
			(period, location, date, cdn, hits, bandwidth, prevHits, prevBandwidth)
		select '${period}', '', aDate, cdn,
			hits, bandwidth,
			coalesce(prevHits, 0), coalesce(prevBandwidth, 0)
		from (
			select cdn,
				sum(hits) as hits,
				sum(bandwidth) as bandwidth,
				(select sum(hits) from country_cdn_hits where cch.cdn = country_cdn_hits.cdn and date >= @prevDateFrom and date <= @prevDateTo) as prevHits,
				(select sum(bandwidth) from country_cdn_hits where cch.cdn = country_cdn_hits.cdn and date >= @prevDateFrom and date <= @prevDateTo) as prevBandwidth
			from country_cdn_hits cch
			where date >= @dateFrom and date <= @dateTo
			group by cdn
			order by hits desc
		) t;

		insert into view_network_cdns
			(period, location, date, cdn, hits, bandwidth, prevHits, prevBandwidth)
		select '${period}', concat('continent:', continentCode), aDate, cdn,
			hits, bandwidth,
			coalesce(prevHits, 0), coalesce(prevBandwidth, 0)
		from (
			select cdn,
				continentCode,
				sum(hits) as hits,
				sum(bandwidth) as bandwidth,
				(select sum(hits)
					from country_cdn_hits cchi
					join country ci on cchi.countryIso = ci.iso
					where cch.cdn = cchi.cdn and c.continentCode = ci.continentCode and date >= @prevDateFrom and date <= @prevDateTo
				) as prevHits,
				(select sum(bandwidth)
					from country_cdn_hits cchi
					join country ci on cchi.countryIso = ci.iso
					where cch.cdn = cchi.cdn and c.continentCode = ci.continentCode and date >= @prevDateFrom and date <= @prevDateTo
				) as prevBandwidth
			from country_cdn_hits cch
			join country c on cch.countryIso = c.iso
			where date >= @dateFrom and date <= @dateTo
			group by cdn, c.continentCode
			order by hits desc
		) t;

		insert into view_network_cdns
			(period, location, date, cdn, hits, bandwidth, prevHits, prevBandwidth)
		select '${period}', concat('country:', countryIso), aDate, cdn,
			hits, bandwidth,
			coalesce(prevHits, 0), coalesce(prevBandwidth, 0)
		from (
			select cdn,
				countryIso,
				sum(hits) as hits,
				sum(bandwidth) as bandwidth,
				(select sum(hits)
					from country_cdn_hits cchi
					where cch.cdn = cchi.cdn and cch.countryIso = cchi.countryIso and date >= @prevDateFrom and date <= @prevDateTo
				) as prevHits,
				(select sum(bandwidth)
					from country_cdn_hits cchi
					where cch.cdn = cchi.cdn and cch.countryIso = cchi.countryIso and date >= @prevDateFrom and date <= @prevDateTo
				) as prevBandwidth
			from country_cdn_hits cch
			where date >= @dateFrom and date <= @dateTo
			group by cdn, cch.countryIso
			order by hits desc
		) t;
	`;
}
