create table public.ai_monthly_budget(month date primary key,limit_usd numeric not null default 20,spent_usd numeric not null default 0,check(spent_usd>=0));
create table public.ai_generations(id uuid primary key,month date not null references public.ai_monthly_budget(month),project_id uuid not null references public.projects(id),user_id uuid not null references public.school_users(user_id),status text not null default 'pending',cost_usd numeric not null default .10,input_tokens integer,output_tokens integer,response text,created_at timestamptz not null default now());
alter table public.ai_monthly_budget enable row level security;
alter table public.ai_generations enable row level security;
create policy ai_budget_read on public.ai_monthly_budget for select to authenticated using(public.is_school_user());
create policy ai_history_read on public.ai_generations for select to authenticated using(public.can_read_project(project_id));
revoke all on public.ai_monthly_budget,public.ai_generations from anon,authenticated;
grant select on public.ai_monthly_budget,public.ai_generations to authenticated;
create index ai_generations_user_time on public.ai_generations(user_id,created_at);
create function public.reserve_school_ai(p_id uuid,p_user uuid,p_project uuid) returns void language plpgsql security definer set search_path='' as $$
declare m date := date_trunc('month',now() at time zone 'Asia/Tokyo')::date; budget public.ai_monthly_budget;
begin
 if not exists(select 1 from public.school_users where user_id=p_user) or not exists(select 1 from public.project_members where user_id=p_user and project_id=p_project and role in ('owner','editor')) then raise exception 'FORBIDDEN';end if;
 insert into public.ai_monthly_budget(month) values(m) on conflict do nothing;
 select * into budget from public.ai_monthly_budget where month=m for update;
 if budget.spent_usd+.10>budget.limit_usd then raise exception 'BUDGET_LIMIT';end if;
 if exists(select 1 from public.ai_generations where id=p_id) then raise exception 'DUPLICATE_REQUEST';end if;
 if (select count(*) from public.ai_generations where user_id=p_user and created_at>now()-interval '1 minute')>=5 then raise exception 'RATE_LIMIT';end if;
 insert into public.ai_generations(id,month,project_id,user_id) values(p_id,m,p_project,p_user);
 update public.ai_monthly_budget set spent_usd=spent_usd+.10 where month=m;
end;$$;
create function public.finish_school_ai(p_id uuid,p_cost numeric,p_input integer,p_output integer,p_response text,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare generation public.ai_generations;
begin
 select * into generation from public.ai_generations where id=p_id for update;
 if generation.id is null or generation.status<>'pending' then raise exception 'INVALID_RESERVATION';end if;
 if p_cost<0 or p_status not in ('complete','failed','uncertain') then raise exception 'INVALID_RESULT';end if;
 update public.ai_monthly_budget set spent_usd=spent_usd-generation.cost_usd+p_cost where month=generation.month;
 update public.ai_generations set cost_usd=p_cost,input_tokens=p_input,output_tokens=p_output,response=p_response,status=p_status where id=p_id;
end;$$;
revoke all on function public.reserve_school_ai(uuid,uuid,uuid),public.finish_school_ai(uuid,numeric,integer,integer,text,text) from public,anon,authenticated;
grant execute on function public.reserve_school_ai(uuid,uuid,uuid),public.finish_school_ai(uuid,numeric,integer,integer,text,text) to service_role;
