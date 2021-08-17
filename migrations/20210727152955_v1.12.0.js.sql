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
    (name, version, filename, date)
    select t.name, t.version, t.filename, utc_date()
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
            and file.filename RLIKE '^(?:(?!\\/(docs?|documentation|examples?|samples?|demos?|tests?|cjs|esm|es6?)\\/)(?!\\/[._]).)+\\.(js|css)$'
        group by file.id
    ) t where t.rowNum = 1;

    commit;
end;

drop event if exists top_package_files_update;
create event top_package_files_update
    on schedule
        every 5 minute
        starts utc_date()
    do
    begin
        if not exists(select * from view_top_package_files where `date` = utc_date()) then
            if get_lock('update_top_package_files', 0) = 1 then
                call updateViewTopPackageFiles(date_sub(utc_date(), interval 31 day), date_sub(utc_date(), interval 2 day));
                select release_lock('update_top_package_files');
            end if;
        end if;
    end;
