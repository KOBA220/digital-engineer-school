-- 旧版を設定済みの場合だけ実行します。
begin;
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check check (avatar between 0 and 29);
commit;
