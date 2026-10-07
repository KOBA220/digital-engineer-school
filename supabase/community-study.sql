-- Shared conversations are member-only; study records are account-private.
create table public.school_chat_topics(
 id uuid primary key,project_id uuid not null references public.projects(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 120),description text not null default '' check(length(description)<=1000),
 created_by uuid not null references public.school_users(user_id),created_at timestamptz not null default now(),unique(id,project_id)
);
create table public.school_chat_messages(
 id uuid primary key,project_id uuid not null,topic_id uuid not null,
 author_id uuid not null references public.school_users(user_id),content text not null check(length(trim(content)) between 1 and 4000),
 created_at timestamptz not null default now(),foreign key(topic_id,project_id) references public.school_chat_topics(id,project_id) on delete cascade
);
create table public.school_study_attempts(
 id uuid primary key,user_id uuid not null references public.school_users(user_id) on delete cascade,
 course text not null check(course in('itpass','toeic')),category text not null check(category in('strategy','management','technology','grammar','vocabulary','reading')),
 question_id text not null check(length(question_id) between 1 and 80),answer integer not null check(answer between 0 and 3),correct boolean not null,
 elapsed_seconds integer not null default 0 check(elapsed_seconds between 0 and 3600),created_at timestamptz not null default now(),
 check((course='itpass' and category in('strategy','management','technology')) or (course='toeic' and category in('grammar','vocabulary','reading')))
);
create index chat_topics_project on public.school_chat_topics(project_id,created_at desc);
create index chat_messages_topic on public.school_chat_messages(topic_id,created_at desc,id desc);
create index chat_messages_project on public.school_chat_messages(project_id);
create index chat_messages_author on public.school_chat_messages(author_id,created_at desc);
create index study_attempts_user on public.school_study_attempts(user_id,created_at desc);
alter table public.school_chat_topics enable row level security;
alter table public.school_chat_messages enable row level security;
alter table public.school_study_attempts enable row level security;
create function public.can_chat_project(p_project uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_school_user() and exists(select 1 from public.project_members where project_id=p_project and user_id=auth.uid());
$$;
create policy chat_topics_members on public.school_chat_topics for select to authenticated using(public.can_chat_project(project_id));
create policy chat_messages_members on public.school_chat_messages for select to authenticated using(public.can_chat_project(project_id));
create policy study_attempts_self on public.school_study_attempts for select to authenticated using(user_id=(select auth.uid()) and public.is_school_user());
create policy study_attempts_insert_self on public.school_study_attempts for insert to authenticated with check(user_id=(select auth.uid()) and public.is_school_user());
revoke all on public.school_chat_topics,public.school_chat_messages,public.school_study_attempts from anon,authenticated;
grant select on public.school_chat_topics,public.school_chat_messages,public.school_study_attempts to authenticated;
grant insert on public.school_study_attempts to authenticated;
create function public.create_school_chat_topic(p_id uuid,p_project uuid,p_title text,p_description text) returns public.school_chat_topics language plpgsql security definer set search_path='' as $$
declare result public.school_chat_topics;
begin
 if not public.can_edit_project(p_project) then raise exception 'FORBIDDEN';end if;
 if (select count(*) from public.school_chat_topics where project_id=p_project)>=100 then raise exception 'テーマは1プロジェクト100件までです';end if;
 insert into public.school_chat_topics(id,project_id,title,description,created_by) values(p_id,p_project,trim(p_title),p_description,auth.uid()) returning * into result;
 return result;
end $$;
create function public.post_school_chat_message(p_id uuid,p_topic uuid,p_content text) returns public.school_chat_messages language plpgsql security definer set search_path='' as $$
declare topic public.school_chat_topics;result public.school_chat_messages;
begin
 select * into topic from public.school_chat_topics where id=p_topic;
 if topic.id is null or not public.can_chat_project(topic.project_id) then raise exception 'FORBIDDEN';end if;
 perform 1 from public.school_users where user_id=auth.uid() for update;
 if (select count(*) from public.school_chat_messages where author_id=auth.uid() and created_at>now()-interval '1 minute')>=30 then raise exception '1分に30件までです。少し待ってください';end if;
 insert into public.school_chat_messages(id,project_id,topic_id,content,author_id) values(p_id,topic.project_id,p_topic,trim(p_content),auth.uid()) returning * into result;
 return result;
end $$;
revoke all on function public.can_chat_project(uuid),public.create_school_chat_topic(uuid,uuid,text,text),public.post_school_chat_message(uuid,uuid,text) from public,anon;
grant execute on function public.can_chat_project(uuid),public.create_school_chat_topic(uuid,uuid,text,text),public.post_school_chat_message(uuid,uuid,text) to authenticated;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='school_chat_topics') then alter publication supabase_realtime add table public.school_chat_topics;end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='school_chat_messages') then alter publication supabase_realtime add table public.school_chat_messages;end if;
end $$;
create function public.school_study_summary() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'totals',(select jsonb_build_object('attempts',count(*),'correct',count(*) filter(where correct),'seconds',coalesce(sum(elapsed_seconds),0),'completed',count(distinct question_id) filter(where correct)) from public.school_study_attempts where user_id=auth.uid()),
 'categories',coalesce((select jsonb_agg(to_jsonb(s)) from (select course,category,count(*) as attempts,count(*) filter(where correct) as correct,count(distinct question_id) filter(where correct) as completed from public.school_study_attempts where user_id=auth.uid() group by course,category) s),'[]'::jsonb),
 'days',coalesce((select jsonb_agg(to_jsonb(s) order by day) from (select (created_at at time zone 'Asia/Tokyo')::date as day,count(*) as attempts from public.school_study_attempts where user_id=auth.uid() and created_at>=now()-interval '7 days' group by day) s),'[]'::jsonb)
 );
$$;
revoke all on function public.school_study_summary() from public,anon;
grant execute on function public.school_study_summary() to authenticated;
