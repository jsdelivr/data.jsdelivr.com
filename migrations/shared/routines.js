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
		drop event if exists top_packages_update_2;
		create event top_packages_update_2
			on schedule
				every 5 minute
				starts utc_date()
			do
			begin
				if not exists(select * from view_top_packages where \`date\` = utc_date()) then
					if get_lock('update_top_packages', 0) = 1 then
						call updateViewTopPackages(utc_date());
						select release_lock('update_top_packages');
					end if;
				end if;

				if utc_time() >= '22:00:00' then
					if not exists(select * from view_top_packages where \`date\` = date_add(utc_date(), interval 1 day)) then
						if get_lock('update_top_packages', 0) = 1 then
							call updateViewTopPackages(date_add(utc_date(), interval 1 day));
							select release_lock('update_top_packages');
						end if;
					end if;
				end if;
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
