-- Reviewed common-share cash policies; never infer nonpayment from empty APIs.
-- No automatic renewal on replay. New cash announcements override these policies
-- through issuer_nonpayer_confirmed; historical and preferred distributions remain.
insert into public.issuer_dividend_policies(ticker,policy,source_url,observed_at,valid_until)
select a.ticker,'no_cash_dividends',v.url,'2026-11-18T01:25:00Z'::timestamptz,'2026-12-18T01:25:00Z'::timestamptz
from (values
 ('AS','https://s21.q4cdn.com/769814866/files/doc_financials/2025/ar/Amer_Sports_Annual_Report_2025_Final.pdf'),
 ('BA','https://investors.boeing.com/investors/investor-resources/'),
 ('BNC','https://www.sec.gov/Archives/edgar/data/1482541/000149315226049436/formposam.htm'),
 ('BRK.B','https://www.sec.gov/Archives/edgar/data/1067983/000119312526083899/brka-20251231.htm'),
 ('GO','https://investors.groceryoutlet.com/static-files/b693047c-21cb-4c6e-a857-5fc050b6c744'),
 ('IT','https://www.sec.gov/Archives/edgar/data/749251/000074925126000112/it-20251231_htm.xml'),
 ('KN','https://www.sec.gov/Archives/edgar/data/1587523/000158752326000014/knowles2025annualreport.pdf'),
 ('MX','https://www.sec.gov/Archives/edgar/data/1325702/000119312526108435/mx-20251231.htm'),
 ('TSLA','https://ir.tesla.com/node/16'),
 ('NU','https://www.sec.gov/Archives/edgar/data/1691493/000129281426002166/nuform20f_2025.htm'),
 ('SA','https://www.sec.gov/Archives/edgar/data/1231346/000121390026035021/ea028273101ex99-1.htm')
)v(ticker,url) join public.assets a using(ticker)
where a.active and a.type='stock_us' and a.currency='USD'
on conflict do nothing;
