const dedent = require('dedent-js');
const periods = [ [ 1, 'day' ], [ 7, 'week' ], [ 30, 'month' ], [ 365, 'year' ], [ '2017-08-17', 'all' ] ];

module.exports = async (db) => {
	// language=MariaDB
	await db.schema.raw(dedent`
		create or replace procedure updateViewTopPackages(aDate date)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

${periods.map(period => topPackagesForPeriod(period)).join('\n')}
		end;

		create or replace procedure updateViewTopPackagesForPeriod(aPeriod varchar(255), aDate date, aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date, deleteOlder bool)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

			start transaction;

			delete from view_top_packages where \`period\` = aPeriod and \`date\` = aDate;

			if deleteOlder then
				delete from view_top_packages where \`period\` = aPeriod and \`date\` < aDateTo;
			end if;

			set @prevScaleFactor = (datediff(aDateTo, aDateFrom) + 1) / (datediff(aPrevDateTo, aPrevDateFrom) + 1);

			insert into view_top_packages
				(period, date, type, name,
				 hitsRank, hitsTypeRank, hits, bandwidthRank, bandwidthTypeRank, bandwidth,
				 prevHitsRank, prevHitsTypeRank, prevHits, prevBandwidthRank, prevBandwidthTypeRank, prevBandwidth)
			select aPeriod, aDate, type, name,
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
					(select round(sum(hits) * @prevScaleFactor)
					 from package_hits
					 where packageId = package.id and date >= aPrevDateFrom and date <= aPrevDateTo
					 group by packageId) as prevHits,
					(select round(sum(bandwidth) * @prevScaleFactor)
					 from package_hits
					 where packageId = package.id and date >= aPrevDateFrom and date <= aPrevDateTo
					 group by packageId) as prevBandwidth
				from package
					     join package_hits on package.id = package_hits.packageId
				where isPrivate = 0 and date >= aDateFrom and date <= aDateTo
				group by packageId
				order by hits desc
			) t;

			commit;
		end;
	`);

	// language=MariaDB
	await db.schema.raw(dedent`
		create or replace procedure updateViewTopProxies(aDate date)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

${periods.map(period => topProxiesForPeriod(period)).join('\n')}
		end;

		create or replace procedure updateViewTopProxiesForPeriod(aPeriod varchar(255), aDate date, aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date, deleteOlder bool)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

			start transaction;

			delete from view_top_proxies where \`period\` = aPeriod and \`date\` = aDate;

			if deleteOlder then
				delete from view_top_proxies where \`period\` = aPeriod and \`date\` < aDateTo;
			end if;

			set @prevScaleFactor = (datediff(aDateTo, aDateFrom) + 1) / (datediff(aPrevDateTo, aPrevDateFrom) + 1);

			insert into view_top_proxies
				(period, date, name, hits, bandwidth, prevHits, prevBandwidth)
			select aPeriod, aDate, name,
				hits, bandwidth,
				coalesce(prevHits, 0), coalesce(prevBandwidth, 0)
			from (
				select name,
					sum(hits) as hits,
					sum(bandwidth) as bandwidth,
					(select round(sum(hits) * @prevScaleFactor) from proxy_hits where proxyId = proxy.id and date >= aPrevDateFrom and date <= aPrevDateTo) as prevHits,
					(select round(sum(bandwidth) * @prevScaleFactor) from proxy_hits where proxyId = proxy.id and date >= aPrevDateFrom and date <= aPrevDateTo) as prevBandwidth
				from proxy
					     join proxy_hits on proxy.id = proxy_hits.proxyId
				where date >= aDateFrom and date <= aDateTo
				group by name
				order by hits desc
			) t;

			commit;
		end;
	`);

	// language=MariaDB
	await db.schema.raw(dedent`
		create or replace procedure updateViewTopProxyFiles(aDate date)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

			${periods.map(period => topProxyFilesForPeriod(period)).join('\n')}
		end;

		create or replace procedure updateViewTopProxyFilesForPeriod(aPeriod varchar(255), aDate date, aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date, deleteOlder bool)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

			start transaction;

			delete from view_top_proxy_files where \`period\` = aPeriod and \`date\` = aDate;

			if deleteOlder then
				delete from view_top_proxy_files where \`period\` = aPeriod and \`date\` < aDateTo;
			end if;

			set @prevScaleFactor = (datediff(aDateTo, aDateFrom) + 1) / (datediff(aPrevDateTo, aPrevDateFrom) + 1);

			insert into view_top_proxy_files
			(period, date, name, filename,
			 hits, bandwidth)
			select aPeriod, aDate, name, filename,
				hits,
				bandwidth
			from (
				select name, filename,
					sum(hits) as hits,
					sum(bandwidth) as bandwidth
				from proxy
						 join proxy_file on proxy.id = proxy_file.proxyId
						 join proxy_file_hits on proxy_file.id = proxy_file_hits.proxyFileId
				where date >= aDateFrom and date <= aDateTo
				group by proxyId, filename
				order by hits desc
			) t;

			commit;
		end;
	`);

	// language=MariaDB
	await db.schema.raw(dedent`
		create or replace procedure updateViewNetworkCountries(aDate date)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

${periods.map(period => countriesForPeriod(period)).join('\n')}
		end;

		create or replace procedure updateViewNetworkCountriesForPeriod(aPeriod varchar(255), aDate date, aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date, deleteOlder bool)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

			start transaction;

			delete from view_network_countries where \`period\` = aPeriod and \`date\` = aDate;

			if deleteOlder then
				delete from view_network_countries where \`period\` = aPeriod and \`date\` < aDateTo;
			end if;

			set @prevScaleFactor = (datediff(aDateTo, aDateFrom) + 1) / (datediff(aPrevDateTo, aPrevDateFrom) + 1);

			insert into view_network_countries
				(period, date, countryIso, hits, bandwidth, prevHits, prevBandwidth)
			select aPeriod, aDate, countryIso,
				hits, bandwidth,
				coalesce(prevHits, 0), coalesce(prevBandwidth, 0)
			from (
				select countryIso,
					sum(hits) as hits,
					sum(bandwidth) as bandwidth,
					(select round(sum(hits) * @prevScaleFactor) from country_cdn_hits where cch.countryIso = country_cdn_hits.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo) as prevHits,
					(select round(sum(bandwidth) * @prevScaleFactor) from country_cdn_hits where cch.countryIso = country_cdn_hits.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo) as prevBandwidth
				from country_cdn_hits cch
				where date >= aDateFrom and date <= aDateTo
				group by countryIso
				order by hits desc
			) t;

			commit;
		end;
	`);

	// language=MariaDB
	await db.schema.raw(dedent`
		create or replace procedure updateViewNetworkCdns(aDate date)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

${periods.map(period => cdnsForPeriod(period)).join('\n')}
		end;

		create or replace procedure updateViewNetworkCdnsForPeriod(aPeriod varchar(255), aDate date, aDateFrom date, aDateTo date, aPrevDateFrom date, aPrevDateTo date, deleteOlder bool)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

			start transaction;

			delete from view_network_cdns where \`period\` = aPeriod and \`date\` = aDate;

			if deleteOlder then
				delete from view_network_cdns where \`period\` = aPeriod and \`date\` < aDateTo;
			end if;

			set @prevScaleFactor = (datediff(aDateTo, aDateFrom) + 1) / (datediff(aPrevDateTo, aPrevDateFrom) + 1);

			insert into view_network_cdns
				(period, locationType, locationId, date, cdn, hits, bandwidth, prevHits, prevBandwidth)
			select aPeriod, 'global', '', aDate, cdn,
				hits, bandwidth,
				coalesce(prevHits, 0), coalesce(prevBandwidth, 0)
			from (
				select cdn,
					sum(hits) as hits,
					sum(bandwidth) as bandwidth,
					(select round(sum(hits) * @prevScaleFactor) from country_cdn_hits where cch.cdn = country_cdn_hits.cdn and date >= aPrevDateFrom and date <= aPrevDateTo) as prevHits,
					(select round(sum(bandwidth) * @prevScaleFactor) from country_cdn_hits where cch.cdn = country_cdn_hits.cdn and date >= aPrevDateFrom and date <= aPrevDateTo) as prevBandwidth
				from country_cdn_hits cch
				where date >= aDateFrom and date <= aDateTo
				group by cdn
				order by hits desc
			) t;

			insert into view_network_cdns
				(period, locationType, locationId, date, cdn, hits, bandwidth, prevHits, prevBandwidth)
			select aPeriod, 'continent', continentCode, aDate, cdn,
				hits, bandwidth,
				coalesce(prevHits, 0), coalesce(prevBandwidth, 0)
			from (
				select cdn,
					continentCode,
					sum(hits) as hits,
					sum(bandwidth) as bandwidth,
					(select round(sum(hits) * @prevScaleFactor)
						from country_cdn_hits cchi
						join country ci on cchi.countryIso = ci.iso
						where cch.cdn = cchi.cdn and c.continentCode = ci.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
					) as prevHits,
					(select round(sum(bandwidth) * @prevScaleFactor)
						from country_cdn_hits cchi
						join country ci on cchi.countryIso = ci.iso
						where cch.cdn = cchi.cdn and c.continentCode = ci.continentCode and date >= aPrevDateFrom and date <= aPrevDateTo
					) as prevBandwidth
				from country_cdn_hits cch
				join country c on cch.countryIso = c.iso
				where date >= aDateFrom and date <= aDateTo
				group by cdn, c.continentCode
				order by hits desc
			) t;

			insert into view_network_cdns
				(period, locationType, locationId, date, cdn, hits, bandwidth, prevHits, prevBandwidth)
			select aPeriod, 'country', countryIso, aDate, cdn,
				hits, bandwidth,
				coalesce(prevHits, 0), coalesce(prevBandwidth, 0)
			from (
				select cdn,
					countryIso,
					sum(hits) as hits,
					sum(bandwidth) as bandwidth,
					(select round(sum(hits) * @prevScaleFactor)
						from country_cdn_hits cchi
						where cch.cdn = cchi.cdn and cch.countryIso = cchi.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
					) as prevHits,
					(select round(sum(bandwidth) * @prevScaleFactor)
						from country_cdn_hits cchi
						where cch.cdn = cchi.cdn and cch.countryIso = cchi.countryIso and date >= aPrevDateFrom and date <= aPrevDateTo
					) as prevBandwidth
				from country_cdn_hits cch
				where date >= aDateFrom and date <= aDateTo
				group by cdn, cch.countryIso
				order by hits desc
			) t;

			commit;
		end;
	`);
};

function dateVarsForPeriod (days, period) {
	// language=MariaDB
	return `
		set @period = '${period}';
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
		call updateViewTopPackagesForPeriod(@period, aDate, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, true);
	`;
}

function topProxiesForPeriod ([ days, period ]) {
	// language=MariaDB
	return `
${dateVarsForPeriod(days, period)}
		call updateViewTopProxiesForPeriod(@period, aDate, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, true);
	`;
}

function topProxyFilesForPeriod ([ days, period ]) {
	// language=MariaDB
	return `
${dateVarsForPeriod(days, period)}
		call updateViewTopProxyFilesForPeriod(@period, aDate, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, true);
	`;
}

function countriesForPeriod ([ days, period ]) {
	// language=MariaDB
	return `
${dateVarsForPeriod(days, period)}
		call updateViewNetworkCountriesForPeriod(@period, aDate, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, true);
	`;
}

function cdnsForPeriod ([ days, period ]) {
	// language=MariaDB
	return `
${dateVarsForPeriod(days, period)}
		call updateViewNetworkCdnsForPeriod(@period, aDate, @dateFrom, @dateTo, @prevDateFrom, @prevDateTo, true);
	`;
}
