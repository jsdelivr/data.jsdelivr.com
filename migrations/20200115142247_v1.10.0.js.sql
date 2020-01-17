drop function if exists updateOrInsertPlatform;
create function updateOrInsertPlatform (aName varchar(255)) returns int
begin
    update `platform`
    set `id` = last_insert_id(`id`)
    where `name` = aName;

    if row_count() = 0 then
        insert into `platform` (name)
        values (aName)
        on duplicate key update `id` = last_insert_id(`id`);
    end if;

    return last_insert_id();
end;

drop function if exists updateOrInsertPlatformVersion;
create function updateOrInsertPlatformVersion (aPlatformId int, aVersion varchar(255)) returns int
begin
    update `platform_version`
    set `id` = last_insert_id(`id`)
    where `platformId` = aPlatformId and `version` = aVersion;

    if row_count() = 0 then
        insert into `platform_version` (platformId, version)
        values (aPlatformId, aVersion)
        on duplicate key update `id` = last_insert_id(`id`);
    end if;

    return last_insert_id();
end;

drop function if exists updateOrInsertCountryPlatformVersionHits;
create function updateOrInsertCountryPlatformVersionHits (aPlatformVersionId int, aCountryIso varchar(2), aDate date, aHits int, aBandwidth float) returns int
begin
    update `country_platform_version_hits`
    set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
    where `platformVersionId` = aPlatformVersionId and `countryIso` = aCountryIso and `date` = aDate;

    if row_count() = 0 then
        insert into `country_platform_version_hits` (platformVersionId, countryIso, date, hits, bandwidth)
        values (aPlatformVersionId, aCountryIso, aDate, aHits, aBandwidth)
        on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
    end if;

    return 0;
end;

###############################################################################

drop function if exists updateOrInsertBrowser;
create function updateOrInsertBrowser (aPlatformId int, aName varchar(255)) returns int
begin
    update `browser`
    set `id` = last_insert_id(`id`)
    where `platformId` = aPlatformId and `name` = aName;

    if row_count() = 0 then
        insert into `browser` (platformId, name)
        values (aPlatformId, aName)
        on duplicate key update `id` = last_insert_id(`id`);
    end if;

    return last_insert_id();
end;

drop function if exists updateOrInsertBrowserVersion;
create function updateOrInsertBrowserVersion (aBrowserId int, aVersion varchar(255)) returns int
begin
    update `browser_version`
    set `id` = last_insert_id(`id`)
    where `browserId` = aBrowserId and `version` = aVersion;

    if row_count() = 0 then
        insert into `browser_version` (browserId, version)
        values (aBrowserId, aVersion)
        on duplicate key update `id` = last_insert_id(`id`);
    end if;

    return last_insert_id();
end;

drop function if exists updateOrInsertCountryBrowserVersionHits;
create function updateOrInsertCountryBrowserVersionHits (aBrowserVersionId int, aCountryIso varchar(2), aDate date, aHits int, aBandwidth float) returns int
begin
    update `country_browser_version_hits`
    set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
    where `browserVersionId` = aBrowserVersionId and `countryIso` = aCountryIso and `date` = aDate;

    if row_count() = 0 then
        insert into `country_browser_version_hits` (browserVersionId, countryIso, date, hits, bandwidth)
        values (aBrowserVersionId, aCountryIso, aDate, aHits, aBandwidth)
        on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
    end if;

    return 0;
end;
