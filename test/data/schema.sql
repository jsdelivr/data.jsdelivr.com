drop table if exists _test;

create table _test (
	`key` varchar(255) not null primary key,
	`value` varchar(255) null
);

insert into package_hits
select packageId, date, sum(hits) as hits, sum(bandwidth) as bandwidth
from package
	     join package_version on package.id = package_version.packageId
	     join file on package_version.id = file.packageVersionId
	     join file_hits on file.id = file_hits.fileId
group by packageId, date;

insert into package_version_hits
select packageVersionId, date, sum(hits) as hits, sum(bandwidth) as bandwidth
from package
	     join package_version on package.id = package_version.packageId
	     join file on package_version.id = file.packageVersionId
	     join file_hits on file.id = file_hits.fileId
group by packageVersionId, date;

set @date = utc_date();
call updateViewNetworkCountries(@date);
call updateViewNetworkCdns(@date);
call updateViewNetworkPackages(@date);
call updateViewTopPackageFiles(@date);
call updateViewTopPackages(@date);
call updateViewTopProxies(@date);
call updateMonthlyViews(@date);
call updateYearlyViews(@date);
