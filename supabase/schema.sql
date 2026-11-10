-- Run in Supabase SQL Editor before launching.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free','pro','studio')),
  credits integer not null default 30 check (credits >= 0),
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt text not null,
  model text not null,
  provider_model_id text not null,
  provider_request_id text not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  video_url text,
  error_message text,
  credits_charged integer not null default 0,
  aspect_ratio text not null default '16:9',
  duration_seconds integer not null default 5,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.generations enable row level security;

create policy "read own profile" on public.profiles for select using (auth.uid() = id);
create policy "read own generations" on public.generations for select using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,email,plan,credits)
  values(new.id,new.email,'free',30)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Atomic credit reservation prevents simultaneous requests from overspending.
create or replace function public.reserve_generation_credits(p_user_id uuid, p_credits integer)
returns boolean language plpgsql security definer set search_path = public
as $$
declare changed integer;
begin
  update public.profiles set credits = credits - p_credits
  where id = p_user_id and credits >= p_credits and p_credits > 0;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

create or replace function public.refund_generation_credits(p_user_id uuid, p_credits integer)
returns void language sql security definer set search_path = public
as $$
  update public.profiles set credits = credits + greatest(p_credits,0) where id = p_user_id;
$$;

revoke all on function public.reserve_generation_credits(uuid,integer) from public;
revoke all on function public.refund_generation_credits(uuid,integer) from public;
grant execute on function public.reserve_generation_credits(uuid,integer) to authenticated;
revoke all on function public.refund_generation_credits(uuid,integer) from authenticated;
grant execute on function public.refund_generation_credits(uuid,integer) to service_role;

-- Note: for production, move refunds to a service-role-only function and add
-- idempotency keys + webhook reconciliation to prevent duplicate refunds.
