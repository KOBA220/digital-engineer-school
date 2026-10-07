-- Email-bound project invitations. No public signup or profile access is granted.
create table public.school_invitations (
 id uuid primary key,
 project_id uuid not null references public.projects(id) on delete cascade,
 email text not null check(email=lower(trim(email)) and length(email)<=254),
 role text not null check(role in ('editor','viewer')),
 invited_by uuid not null references public.school_users(user_id),
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '7 days',
 status text not null default 'pending' check(status in ('pending','accepted','cancelled')),
 delivery text not null default 'pending' check(delivery in ('pending','sent','failed')),
 accepted_at timestamptz
);
create index school_invitations_project on public.school_invitations(project_id,created_at desc);
create index school_invitations_email on public.school_invitations(email) where status='pending';
alter table public.school_invitations enable row level security;
revoke all on public.school_invitations from anon,authenticated;
grant select on public.school_invitations to authenticated;
grant all on public.school_invitations to service_role;
create policy invitations_read_owner on public.school_invitations for select to authenticated using(public.owns_project(project_id));
create function public.create_school_invitation(p_id uuid,p_project uuid,p_email text,p_role text) returns uuid
language plpgsql security definer set search_path='' as $$
declare target_email text:=lower(trim(p_email));
begin
 if not public.owns_project(p_project) then raise exception 'FORBIDDEN'; end if;
 if p_role not in ('editor','viewer') or target_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(target_email)>254 then raise exception 'INVALID_REQUEST'; end if;
 if exists(select 1 from auth.users where id=auth.uid() and lower(email)=target_email) then raise exception '自分自身への招待は不要です'; end if;
 perform 1 from public.projects where id=p_project for update;
 if exists(select 1 from public.school_invitations where project_id=p_project and email=target_email and created_at>now()-interval '60 seconds') then raise exception '同じ宛先への再送は1分待ってください'; end if;
 if (select count(*) from public.school_invitations where invited_by=auth.uid() and created_at>now()-interval '1 hour')>=20 then raise exception '招待は1時間に20件までです'; end if;
 update public.school_invitations set status='cancelled' where project_id=p_project and email=target_email and status='pending';
 insert into public.school_invitations(id,project_id,email,role,invited_by) values(p_id,p_project,target_email,p_role,auth.uid());
 return p_id;
end $$;
create function public.cancel_school_invitation(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.school_invitations where id=p_id and public.owns_project(project_id)) then raise exception 'FORBIDDEN';end if;
 update public.school_invitations set status='cancelled' where id=p_id and status='pending';
end $$;
create function public.accept_school_invitations() returns integer language plpgsql security definer set search_path='' as $$
declare verified_email text; invitation public.school_invitations; accepted integer:=0;
begin
 select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is null then raise exception 'メール確認が必要です'; end if;
 for invitation in select * from public.school_invitations where email=verified_email and status='pending' and expires_at>now() for update loop
  insert into public.school_users(user_id) values(auth.uid()) on conflict do nothing;
  if not exists(select 1 from public.projects where id=invitation.project_id and owner_id=auth.uid()) then
   insert into public.project_members(project_id,user_id,role) values(invitation.project_id,auth.uid(),invitation.role) on conflict(project_id,user_id) do update set role=excluded.role;
  end if;
  update public.school_invitations set status='accepted',accepted_at=now() where id=invitation.id;
  accepted:=accepted+1;
 end loop;
 return accepted;
end $$;
-- Admission still requires a verified email, and an invitation must be live.
create or replace function public.admit_school_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is not null and (exists(select 1 from public.school_allowed_emails where email=lower(new.email)) or exists(select 1 from public.school_invitations where email=lower(new.email) and status='pending' and expires_at>now())) then
  insert into public.school_users(user_id) values(new.id) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.create_school_invitation(uuid,uuid,text,text),public.cancel_school_invitation(uuid),public.accept_school_invitations() from public,anon;
grant execute on function public.create_school_invitation(uuid,uuid,text,text),public.cancel_school_invitation(uuid),public.accept_school_invitations() to authenticated;
