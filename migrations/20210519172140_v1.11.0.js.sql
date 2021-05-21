drop function if exists updateOrInsertPackageVersion;
create function updateOrInsertPackageVersion(aPackageId int, aVersion varchar(255), aType varchar(16)) returns int
begin
    update `package_version`
    set `id` = last_insert_id(`id`)
    where `packageId` = aPackageId and `version` = aVersion;

    if row_count() = 0 then
        insert into `package_version` (packageId, version, type)
        values (aPackageId, aVersion, aType)
        on duplicate key update `id` = last_insert_id(`id`);
    end if;

    return last_insert_id();
end;

drop function if exists updateOrInsertFile;
create function updateOrInsertFile(aPackageVersionId int, aFilename varchar(255), aFetchAttemptsLeft int) returns int
begin
    update `file`
    set `id` = last_insert_id(`id`)
    where `packageVersionId` = aPackageVersionId and `filename` = aFilename;

    if row_count() = 0 then
        insert into `file` (packageVersionId, filename, fetchAttemptsLeft)
        values (aPackageVersionId, aFilename, aFetchAttemptsLeft)
        on duplicate key update `id` = last_insert_id(`id`);
    end if;

    return last_insert_id();
end;

update `package_version` `pv`
    inner join `package` `p` on `pv`.`packageId` = `p`.`id`
set `pv`.`type` = (
    case
        when `pv`.`version` = 'master' then 'branch'
        when `pv`.`version` regexp '^[a-fA-F0-9]{40}$' then 'commit'
        else 'version'
        end
    )
where `p`.`type` = 'gh';
