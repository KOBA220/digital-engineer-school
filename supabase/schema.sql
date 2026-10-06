-- Digital Engineer School: run once in a NEW Supabase project, as database admin.
-- No secrets or real employee data are seeded by this migration.
begin;
create table public.school_allowed_emails (email text primary key check (email = lower(email)));
create table public.school_users (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.profiles (
 id uuid primary key references public.school_users(user_id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100),
 department text not null default '' check(length(department)<=200),
 avatar integer not null default 0 check(avatar between 0 and 29)
);
create table public.projects (
 id uuid primary key, name text not null check(length(trim(name)) between 1 and 200),
 description text not null default '', department text not null default '',
 visibility text not null default 'private' check(visibility in ('private','public')),
 owner_id uuid not null references public.school_users(user_id),
 repo text not null default '', created_at timestamptz not null default now()
);
create table public.project_members (
 project_id uuid references public.projects(id) on delete cascade,
 user_id uuid references public.school_users(user_id) on delete cascade,
 role text not null check(role in ('owner','editor','viewer')),
 primary key(project_id,user_id)
);
create table public.entities (
 id uuid primary key,project_id uuid not null references public.projects(id) on delete cascade,
 kind text not null check(kind in ('task','design','refine','retro','meeting','resource','code')),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=262144),
 version integer not null default 1 check(version>0),deleted boolean not null default false,
 updated_by uuid not null references public.school_users(user_id), updated_at timestamptz not null default now()
);
create index entities_project_kind on public.entities(project_id,kind);
create index project_members_user on public.project_members(user_id,project_id);
alter table public.school_allowed_emails enable row level security;
alter table public.school_users enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.entities enable row level security;

create function public.is_school_user() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.school_users where user_id=auth.uid());
$$;
create function public.can_read_project(p_project uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_school_user() and exists(select 1 from public.projects p where p.id=p_project and
  (p.visibility='public' or exists(select 1 from public.project_members m where m.project_id=p.id and m.user_id=auth.uid())));
$$;
create function public.can_edit_project(p_project uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_school_user() and exists(select 1 from public.project_members m where m.project_id=p_project and m.user_id=auth.uid() and m.role in ('owner','editor'));
$$;
create function public.owns_project(p_project uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_school_user() and exists(select 1 from public.projects where id=p_project and owner_id=auth.uid());
$$;
create function public.admit_school_user() returns trigger language plpgsql security definer set search_path='' as $$
 begin
  if new.email_confirmed_at is not null and exists(select 1 from public.school_allowed_emails where email=lower(new.email)) then
   insert into public.school_users(user_id) values(new.id) on conflict do nothing;
  end if;
  return new;
 end;
$$;
create trigger admit_school_user after insert or update of email_confirmed_at on auth.users for each row execute function public.admit_school_user();
create policy school_users_read_self on public.school_users for select to authenticated using(user_id=auth.uid());
create policy profiles_read_school on public.profiles for select to authenticated using(public.is_school_user());
create policy profiles_insert_self on public.profiles for insert to authenticated with check(id=auth.uid() and public.is_school_user());
create policy profiles_update_self on public.profiles for update to authenticated using(id=auth.uid() and public.is_school_user()) with check(id=auth.uid() and public.is_school_user());
create policy projects_read on public.projects for select to authenticated using(public.can_read_project(id));
create policy projects_update_owner on public.projects for update to authenticated using(public.owns_project(id)) with check(public.owns_project(id));
create policy members_read on public.project_members for select to authenticated using(public.can_read_project(project_id));
create policy entities_read on public.entities for select to authenticated using(public.can_read_project(project_id));

-- Atomic project creation: the owner membership is always created with the project.
create function public.create_school_project(p_id uuid,p_name text,p_description text,p_department text,p_visibility text,p_repo text)
 returns void language plpgsql security definer set search_path='' as $$
 begin
  if not public.is_school_user() then raise exception 'FORBIDDEN'; end if;
  insert into public.projects(id,name,description,department,visibility,owner_id,repo)
   values(p_id,p_name,p_description,p_department,p_visibility,auth.uid(),p_repo);
  insert into public.project_members values(p_id,auth.uid(),'owner');
 end;
$$;
-- Only existing admitted school users can be added. No email is sent.
create function public.invite_project_member(p_project uuid,p_email text,p_role text) returns void
 language plpgsql security definer set search_path='' as $$
 declare target uuid;
 begin
  if not public.owns_project(p_project) then raise exception 'FORBIDDEN'; end if;
  if p_role not in ('editor','viewer') then raise exception 'INVALID_ROLE'; end if;
  select u.id into target from auth.users u join public.school_users s on s.user_id=u.id where lower(u.email)=lower(trim(p_email));
  if target is null then raise exception 'この学校に登録済みのユーザーが見つかりません'; end if;
  if exists(select 1 from public.projects where id=p_project and owner_id=target) then raise exception '所有者の権限は変更できません'; end if;
  insert into public.project_members values(p_project,target,p_role) on conflict(project_id,user_id) do update set role=excluded.role;
 end;
$$;
-- Version checks prevent silent overwrites when two users edit the same object.
create function public.save_entity(p_id uuid,p_project uuid,p_kind text,p_payload jsonb,p_expected integer,p_deleted boolean default false)
 returns public.entities language plpgsql security definer set search_path='' as $$
 declare result public.entities;
 begin
  if not public.can_edit_project(p_project) then raise exception 'FORBIDDEN'; end if;
  if p_expected=0 then
   if p_deleted then raise exception 'INVALID_DELETE'; end if;
   insert into public.entities(id,project_id,kind,payload,updated_by) values(p_id,p_project,p_kind,p_payload,auth.uid())
     on conflict(id) do nothing returning * into result;
  else
   update public.entities set payload=p_payload,version=version+1,deleted=p_deleted,updated_by=auth.uid(),updated_at=now()
    where id=p_id and project_id=p_project and kind=p_kind and version=p_expected and not deleted returning * into result;
  end if;
  if result.id is null then raise exception 'CONFLICT'; end if;
  return result;
 end;
$$;
create function public.can_join_school_topic(p_topic text) returns boolean
 language plpgsql stable security definer set search_path='' as $$
 declare project_text text;
 begin
  if not public.is_school_user() then return false; end if;
  project_text=split_part(p_topic,':',2);
  if split_part(p_topic,':',1)<>'room' or project_text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return false; end if;
  return public.can_read_project(project_text::uuid);
 end;
$$;
create policy school_realtime_receive on realtime.messages for select to authenticated
 using(public.can_join_school_topic(realtime.topic()) and extension in ('broadcast','presence'));
create policy school_realtime_send on realtime.messages for insert to authenticated
 with check(public.can_join_school_topic(realtime.topic()) and extension in ('broadcast','presence'));

revoke all on public.school_allowed_emails,public.school_users,public.profiles,public.projects,public.project_members,public.entities from anon,authenticated;
grant select on public.school_users,public.profiles,public.projects,public.project_members,public.entities to authenticated;
grant insert,update on public.profiles to authenticated;
grant update(repo) on public.projects to authenticated;
revoke all on function public.is_school_user(),public.can_read_project(uuid),public.can_edit_project(uuid),public.owns_project(uuid),public.admit_school_user(),public.create_school_project(uuid,text,text,text,text,text),public.invite_project_member(uuid,text,text),public.save_entity(uuid,uuid,text,jsonb,integer,boolean),public.can_join_school_topic(text) from public,anon;
grant execute on function public.is_school_user(),public.can_read_project(uuid),public.can_edit_project(uuid),public.owns_project(uuid),public.create_school_project(uuid,text,text,text,text,text),public.invite_project_member(uuid,text,text),public.save_entity(uuid,uuid,text,jsonb,integer,boolean),public.can_join_school_topic(text) to authenticated;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='entities') then
  alter publication supabase_realtime add table public.entities;
 end if;
end $$;
commit;

-- After running this script, admit the TWO real users before they sign up:
-- insert into public.school_allowed_emails(email) values ('first@example.com'),('second@example.com');
-- If they were already registered and confirmed before being allowlisted:
-- insert into public.school_users(user_id)
-- select u.id from auth.users u join public.school_allowed_emails a on a.email=lower(u.email)
-- where u.email_confirmed_at is not null on conflict do nothing;
-- Realtime Settings: disable 'Allow public access'.
