const dedent = require('dedent-js');

exports.up = async (db) => {
	await db.raw(dedent`
		CREATE TRIGGER log_file_valid_insert
		BEFORE INSERT ON log_file
		FOR EACH ROW BEGIN
			IF (NEW.processed > 1) THEN
				SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid value for log_file.processed';
			END IF;
		END;
	`);

	await db.raw(dedent`
		CREATE TRIGGER log_file_valid_update
		BEFORE UPDATE ON log_file
		FOR EACH ROW BEGIN
			IF (NEW.processed > 1) THEN
				SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid value for log_file.processed';
			END IF;
		END;
	`);
};

exports.down = () => {};
