drop table if exists package_hits;

create view package_hits as
select packageId, date, sum(hits) as hits, sum(bandwidth) as bandwidth
from package
	     join package_version on package.id = package_version.packageId
	     join file on package_version.id = file.packageVersionId
	     join file_hits on file.id = file_hits.fileId
group by packageId, date;
