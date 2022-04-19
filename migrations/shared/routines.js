const dedent = require('dedent-js');
const periods = [ [ 1, 'day' ], [ 7, 'week' ], [ 30, 'month' ], [ 365, 'year' ], [ undefined, 'all' ] ];

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

${periods.map(([ days, period ]) => `
	set @dateFrom = ${period === 'all' ? `'2017-08-17'` : `date_sub(aDate, interval ${days + 1} day)`};
	set @dateTo = date_sub(aDate, interval 2 day);

	delete from view_top_packages where \`period\` = '${period}' and \`date\` = aDate;
	delete from view_top_packages where \`period\` = '${period}' and\`date\` < @dateTo;

	insert into view_top_packages
		(period, date, rank, typeRank, type, name, hits, bandwidth)
	select '${period}', aDate,
		if(hits > 0, rank() over (order by hits desc) - 1, null),
		if(hits > 0, rank() over (partition by type order by hits desc) - 1, null),
		t.*
	from (
		select type, name, sum(hits) as hits, sum(bandwidth) as bandwidth
		from package
			     join package_hits on package.id = package_hits.packageId
		where isPrivate = 0 and date >= @dateFrom and date <= @dateTo
		group by packageId
		order by hits desc
	) t;
`).join('\n')}

			commit;
		end;
	`);


	// language=MariaDB
	await db.schema.raw(dedent`
		drop event if exists top_packages_update;
		create event top_packages_update
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

