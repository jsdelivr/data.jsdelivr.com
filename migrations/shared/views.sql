drop view if exists view_file_hits;
create view view_file_hits as
select package.type as type,
	package.name as name,
	package_version.version as version,
	file.filename as filename,
	file_hits.date as date,
	sum(file_hits.hits) as hits,
	sum(file_hits.bandwidth) as bandwidth
from package
	     join package_version on package.id = package_version.packageId
	     join file on package_version.id = file.packageVersionId
	     join file_hits on file.id = file_hits.fileId
group by file_hits.fileId, file_hits.date
order by file_hits.date desc, hits desc;


drop view if exists view_package_hits;
create view view_package_hits as
select package.type as type,
	package.name as name,
	package_hits.date as date,
	sum(package_hits.hits) as hits,
	sum(package_hits.bandwidth) as bandwidth
from package
	     join package_hits on package.id = package_hits.packageId
group by package.id, package_hits.date
order by package_hits.date desc, hits desc;


drop view if exists view_package_version_hits;
create view view_package_version_hits as
select package.type as type,
	package.name as name,
	package_version.version as version,
	package_version_hits.date as date,
	sum(package_version_hits.hits) as hits,
	sum(package_version_hits.bandwidth) as bandwidth
from package
	     join package_version on package.id = package_version.packageId
	     join package_version_hits on package_version.id = package_version_hits.packageVersionId
group by package_version.id, package_version_hits.date
order by package_version_hits.date desc, hits desc;


drop view if exists view_proxy_hits;
create view view_proxy_hits as
select proxy.path,
	proxy_hits.date as date,
	sum(proxy_hits.hits) as hits,
	sum(proxy_hits.bandwidth) as bandwidth
from proxy
	     join proxy_hits on proxy.id = proxy_hits.proxyId
group by proxy.id, proxy_hits.date
order by proxy_hits.date desc, hits desc;


drop view if exists view_referrer_hits;
create view view_referrer_hits as
select referrer.referrer,
	referrer_hits.date as date,
	sum(referrer_hits.hits) as hits,
	sum(referrer_hits.bandwidth) as bandwidth
from referrer
	     join referrer_hits on referrer.id = referrer_hits.referrerId
group by referrer.id, referrer_hits.date
order by referrer_hits.date desc, hits desc;
