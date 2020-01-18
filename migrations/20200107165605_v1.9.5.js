const _ = require('lodash');
const dedent = require('dedent-js');
const periods = [ [ 1, 'day' ], [ 7, 'week' ], [ 30, 'month' ], [ 365, 'year' ], [ undefined, 'all' ] ];

exports.up = async (db) => {
	for (let [ days, period ] of periods) {
		await db.schema.createTable(`view_top_packages_${period}`, (table) => {
			table.date('date');
			table.string('type');
			table.string('name');
			table.integer('rank').unsigned().index();
			table.bigInteger('hits').unsigned().defaultTo(0).notNullable().index();
			table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable().index();
			table.primary([ 'date', 'type', 'name' ]);
		});

		// language=MariaDB
		await db.schema.raw(dedent`
			drop procedure if exists updateViewTopPackages${_.upperFirst(period)};
			create procedure updateViewTopPackages${_.upperFirst(period)}(aDate date)
			begin
				declare exit handler for sqlexception
					begin
						rollback;
						resignal;
					end;

				start transaction;

				set @rankCounter = -1;
				set @dateFrom = ${period === 'all' ? `'2017-08-17'` : `date_sub(aDate, interval ${days + 1} day)`};
				set @dateTo = date_sub(aDate, interval 2 day);
				set @hits = pow(2, 64);

				delete from view_top_packages_${period} where \`date\` = aDate;

				insert into view_top_packages_${period}
				(date, rank, type, name, hits, bandwidth)
				select aDate, (select @rankCounter := if(t.hits < @hits, if(@hits := t.hits, @rankCounter + 1, @rankCounter + 1), @rankCounter)), t.*
				from (
					select type, name, sum(hits) as hits, sum(bandwidth) as bandwidth
					from package
						     join package_hits on package.id = package_hits.packageId
					where date >= @dateFrom and date <= @dateTo
					group by packageId
					order by hits desc
				) t;
				commit;
			end;
		`);
	}

	// language=MariaDB
	await db.schema.raw(dedent`
		drop event if exists top_packages_update;
		create event top_packages_update
			on schedule
				every 5 minute
				starts utc_date()
			do
			begin
				${periods.map(([ , period ]) => getTopPackagesUpdateCodeForPeriod(period)).join('\n')}
			end;
	`);
};

function getTopPackagesUpdateCodeForPeriod (period) {
	return `
		if not exists(select * from view_top_packages_${period} where \`date\` = utc_date()) then
		    if get_lock('update_top_packages_${period}', 0) = 1 then
				call updateViewTopPackages${_.upperFirst(period)}(utc_date());
				select release_lock('update_top_packages_${period}');
			end if;
		end if;

		if utc_time() >= '23:30:00' then
			if not exists(select * from view_top_packages_${period} where \`date\` = date_add(utc_date(), interval 1 day)) then
			    if get_lock('update_top_packages_${period}', 0) = 1 then
					call updateViewTopPackages${_.upperFirst(period)}(date_add(utc_date(), interval 1 day));
					select release_lock('update_top_packages_${period}');
				end if;
			end if;
		end if;
	`;
}

exports.down = () => {};
