drop table if exists package_hits;

create view package_hits as
select packageId, date, sum(hits) as hits, sum(bandwidth) as bandwidth
from package
	     join package_version on package.id = package_version.packageId
	     join file on package_version.id = file.packageVersionId
	     join file_hits on file.id = file_hits.fileId
group by packageId, date;

drop table if exists package_version_hits;

create view package_version_hits as
select packageVersionId, date, sum(hits) as hits, sum(bandwidth) as bandwidth
from package
	     join package_version on package.id = package_version.packageId
	     join file on package_version.id = file.packageVersionId
	     join file_hits on file.id = file_hits.fileId
group by packageVersionId, date;

set @date = utc_date();
call updateViewNetworkPackages(@date);
call updateViewTopPackagesDay(@date);
call updateViewTopPackagesWeek(@date);
call updateViewTopPackagesMonth(@date);
call updateViewTopPackagesYear(@date);
call updateViewTopPackagesAll(@date);
call updateViewTopPackageFiles(@date);
