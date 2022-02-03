exports.up = async (db) => {
	await db.schema.raw(`alter table logs modify column records bigint unsigned default 0 not null`);
	await db.schema.raw(`alter table logs modify column megabytesLogs bigint unsigned default 0 not null`);
	await db.schema.raw(`alter table logs modify column megabytesTraffic bigint unsigned default 0 not null`);
	await db.schema.raw(`alter table other_hits modify column hits bigint unsigned default 0 not null`);
	await db.schema.raw(`alter table referrer_hits modify column hits bigint unsigned default 0 not null`);
};

exports.down = () => {};
