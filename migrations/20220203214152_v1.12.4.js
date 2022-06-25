exports.up = async (db) => {
	await db.schema.alterTable('file_hits', (table) => {
		table.dropForeign([ 'fileId' ]);
		table.dropIndex([ 'date' ]);
	});

	await db.schema.raw(`
		alter table file_hits partition by range (year(date))
			(
			PARTITION p_2017 VALUES LESS THAN (2018),
			PARTITION p_2018 VALUES LESS THAN (2019),
			PARTITION p_2019 VALUES LESS THAN (2020),
			PARTITION p_2020 VALUES LESS THAN (2021),
			PARTITION p_2021 VALUES LESS THAN (2022),
			PARTITION p_2022 VALUES LESS THAN (2023),
			PARTITION p_2023 VALUES LESS THAN (2024),
			PARTITION p_2024 VALUES LESS THAN (2025),
			PARTITION p_2025 VALUES LESS THAN (2026),
			PARTITION p_2026 VALUES LESS THAN (2027),
			PARTITION p_2027 VALUES LESS THAN (2028),
			PARTITION p_2028 VALUES LESS THAN (2029),
			PARTITION p_2029 VALUES LESS THAN (2030),
			PARTITION p_rest VALUES LESS THAN MAXVALUE
			);
	`);
};

exports.down = () => {};
