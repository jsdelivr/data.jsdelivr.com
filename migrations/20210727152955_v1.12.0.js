const dedent = require('dedent-js');

exports.up = async (db) => {
	await db.schema.createTable('cdnjs_package', (table) => {
		table.string('name');
		table.string('version');
		table.string('filename');
		table.primary([ 'name', 'version' ]);
		table.charset('utf8mb4');
		table.collate('utf8mb4_bin');
	});

	await db.schema.createTable('package_entrypoints', (table) => {
		table.string('type');
		table.string('name');
		table.string('version');
		table.text('entrypoints', 'mediumtext');
		table.datetime('updatedAt').index();
		table.primary([ 'type', 'name', 'version' ]);
		table.charset('utf8mb4');
		table.collate('utf8mb4_bin');
	});

	await db.schema.raw('alter table package_entrypoints row_format = compressed;');

	await db.schema.createTable('view_top_package_files', (table) => {
		table.string('name');
		table.string('version');
		table.string('filename');
		table.index([ 'name', 'version' ]);
	});

	// language=MariaDB
	await db.schema.raw(dedent`
		drop procedure if exists updateViewTopPackageFiles;
		create procedure updateViewTopPackageFiles(dateFrom date, dateTo date)
		begin
			declare exit handler for sqlexception
				begin
					rollback;
					resignal;
				end;

			start transaction;

			delete from view_top_package_files;

			insert into view_top_package_files
			(name, version, filename)
			select t.name, t.version, t.filename
			from (
				select
					package.name as name,
					package_version.version as version,
					file.filename as filename,
					row_number() over (partition by package_version.id, substring_index(file.filename, '.', -1) order by substring_index(file.filename, '.', -1), sum(file_hits.hits) desc) as rowNum
				from package_version
					inner join package on package_version.packageId = package.id
					inner join file on package_version.id = file.packageVersionId
					inner join file_hits on file.id = file_hits.fileId
				where file_hits.date between dateFrom and dateTo
					and package.type = 'npm'
					and file.filename RLIKE '^(?!\\/?(doc|docs|documentation|example|examples|sample|samples|demos|demo|tests|test|cjs|esm|es6|es)\\/).*(js|css)$'
				group by file.id
			) t where t.rowNum = 1;

			commit;
		end;
	`);

	// language=MariaDB
	await db.schema.raw(dedent`
		drop event if exists top_package_files_update;
		create event top_package_files_update
			on schedule
				every 1 hour
				starts utc_date()
			do
			begin
				if get_lock('update_top_package_files', 0) = 1 then
					call updateViewTopPackageFiles(DATE_SUB(CURDATE(), INTERVAL 2 DAY), CURDATE());
					select release_lock('update_top_package_files');
				end if;
			end;
	`);
};

exports.down = () => {};
