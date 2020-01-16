drop function if exists updateOrInsertProxyHits;
create function updateOrInsertProxyHits(aProxyId int, aDate date, aHits int, aBandwidth float) returns int
begin
	update `proxy_hits`
	set `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth
	where `proxyId` = aProxyId and `date` = aDate;

	if row_count() = 0 then
		insert into `proxy_hits` (proxyId, date, hits, bandwidth)
		values (aProxyId, aDate, aHits, aBandwidth)
		on duplicate key update `hits` = `hits` + aHits, `bandwidth` = `bandwidth` + aBandwidth;
	end if;

	return 0;
end;

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
