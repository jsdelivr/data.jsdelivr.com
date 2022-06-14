const dedent = require('dedent-js');

exports.up = async (db) => {
	await db.schema.createTable(`view_network_packages`, (table) => {
		table.date('date').primary();
		table.bigInteger('hits').unsigned().defaultTo(0).notNullable().index();
		table.specificType('bandwidth', 'float').unsigned().defaultTo(0).notNullable().index();
	});

	// language=MariaDB
	await db.schema.raw(dedent`
		create or replace procedure updateViewNetworkPackages(aDate date)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

			start transaction;

			delete from view_network_packages;

			insert into view_network_packages
			(date, hits, bandwidth)
			select date, sum(hits) as hits, sum(bandwidth) as bandwidth
			from package
				     join package_hits on package.id = package_hits.packageId
			where date <= aDate
			group by date;
			commit;
		end;
	`);

	// language=MariaDB
	await db.schema.raw(dedent`
		create or replace event network_packages_update
			on schedule
				every 5 minute
				starts utc_date()
			do
			begin
				if not exists(select * from view_network_packages where \`date\` = date_sub(utc_date(), interval 2 day)) then
				    if get_lock('update_network_packages', 0) = 1 then
						call updateViewNetworkPackages(date_sub(utc_date(), interval 2 day));
						select release_lock('update_network_packages');
					end if;
				end if;

				if utc_time() >= '23:00:00' then
					if not exists(select * from view_network_packages where \`date\` = date_sub(utc_date(), interval 1 day)) then
					    if get_lock('update_network_packages', 0) = 1 then
							call updateViewNetworkPackages(date_sub(utc_date(), interval 1 day));
							select release_lock('update_network_packages');
						end if;
					end if;
				end if;
			end;
	`);
};

exports.down = () => {};
