-- 旧スキーマを設定済みの場合だけ実行します。所有者のRLSを維持します。
begin;
grant update(name,description,visibility,repo) on public.projects to authenticated;
commit;
