-- ============================================================
-- CONTROLE DE ITENS LIVRES DE DÉBITO
-- Execute TODO este arquivo no SQL Editor do Supabase.
-- ============================================================

create extension if not exists pgcrypto;

-- 1) PERFIS
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default 'Usuário',
  role text not null default 'operador' check (role in ('admin','diretor','gestor','operador','auditoria')),
  filial text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Cria automaticamente um perfil quando um usuário for criado no Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 2) ITENS
create table if not exists public.itens (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  descricao text not null,
  categoria text not null default 'REM - Garantia S/R',
  marca text,
  filial text not null,
  dn text,
  localizacao text not null,
  estoque_minimo integer not null default 1 check (estoque_minimo >= 0),
  valor_unitario numeric(14,2) not null default 0 check (valor_unitario >= 0),
  status text not null default 'disponivel' check (status in ('disponivel','bloqueado','arquivado')),
  observacoes text,
  criado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (codigo, filial)
);

-- 3) MOVIMENTAÇÕES
create table if not exists public.movimentacoes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.itens(id),
  tipo text not null check (tipo in ('entrada','saida','ajuste')),
  quantidade integer not null check (quantidade > 0),
  data_movimento date not null default current_date,
  origem text,
  finalidade text,
  numero_nota text,
  numero_rem text,
  protocolo text,
  numero_os text,
  chassi text,
  placa text,
  cliente text,
  responsavel text,
  solicitante text,
  autorizado_por text,
  observacoes text,
  status text not null default 'ativo' check (status in ('ativo','estornado','arquivado')),
  criado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- 4) ANEXOS
create table if not exists public.anexos (
  id uuid primary key default gen_random_uuid(),
  movimentacao_id uuid not null references public.movimentacoes(id) on delete cascade,
  tipo_movimento text not null check (tipo_movimento in ('entrada','saida','ajuste')),
  nome_arquivo text not null,
  caminho_storage text not null unique,
  mime_type text,
  tamanho_bytes bigint,
  criado_por uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- 5) LOG DE AUDITORIA
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id uuid,
  acao text not null,
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid,
  created_at timestamptz not null default now()
);

-- 6) ÍNDICES
create index if not exists idx_itens_codigo on public.itens(codigo);
create index if not exists idx_itens_filial on public.itens(filial);
create index if not exists idx_mov_item on public.movimentacoes(item_id);
create index if not exists idx_mov_data on public.movimentacoes(data_movimento desc);
create index if not exists idx_mov_tipo on public.movimentacoes(tipo);
create index if not exists idx_anexos_mov on public.anexos(movimentacao_id);

-- 7) VIEW DE SALDO
create or replace view public.vw_estoque_atual
with (security_invoker = true)
as
select
  i.*,
  coalesce(sum(
    case
      when m.status <> 'ativo' then 0
      when m.tipo = 'entrada' then m.quantidade
      when m.tipo = 'saida' then -m.quantidade
      when m.tipo = 'ajuste' then m.quantidade
      else 0
    end
  ),0)::integer as saldo
from public.itens i
left join public.movimentacoes m on m.item_id = i.id
group by i.id;

-- 8) FUNÇÃO ATÔMICA PARA ENTRADA
create or replace function public.registrar_entrada(
  p_item_id uuid,
  p_quantidade integer,
  p_data_movimento date,
  p_origem text,
  p_numero_nota text,
  p_numero_rem text,
  p_protocolo text,
  p_responsavel text,
  p_observacoes text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare v_id uuid;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'A quantidade deve ser maior que zero.';
  end if;

  insert into public.movimentacoes (
    item_id,tipo,quantidade,data_movimento,origem,numero_nota,numero_rem,
    protocolo,responsavel,observacoes,criado_por
  ) values (
    p_item_id,'entrada',p_quantidade,coalesce(p_data_movimento,current_date),
    nullif(p_origem,''),nullif(p_numero_nota,''),nullif(p_numero_rem,''),
    nullif(p_protocolo,''),p_responsavel,nullif(p_observacoes,''),auth.uid()
  ) returning id into v_id;

  return v_id;
end;
$$;

-- 9) FUNÇÃO ATÔMICA PARA SAÍDA (NÃO DEIXA SALDO NEGATIVO)
create or replace function public.registrar_saida(
  p_item_id uuid,
  p_quantidade integer,
  p_data_movimento date,
  p_finalidade text,
  p_numero_os text,
  p_chassi text,
  p_placa text,
  p_cliente text,
  p_solicitante text,
  p_autorizado_por text,
  p_observacoes text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_saldo integer;
  v_status text;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'A quantidade deve ser maior que zero.';
  end if;

  -- Bloqueia o cadastro do item durante a conferência do saldo.
  select i.status,
    coalesce(sum(case
      when m.status <> 'ativo' then 0
      when m.tipo = 'entrada' then m.quantidade
      when m.tipo = 'saida' then -m.quantidade
      when m.tipo = 'ajuste' then m.quantidade
      else 0 end),0)::integer
  into v_status, v_saldo
  from public.itens i
  left join public.movimentacoes m on m.item_id = i.id
  where i.id = p_item_id
  group by i.id
  for update of i;

  if not found then raise exception 'Item não encontrado.'; end if;
  if v_status <> 'disponivel' then raise exception 'O item está bloqueado ou arquivado.'; end if;
  if v_saldo < p_quantidade then
    raise exception 'Saldo insuficiente. Disponível: %, solicitado: %.', v_saldo, p_quantidade;
  end if;

  insert into public.movimentacoes (
    item_id,tipo,quantidade,data_movimento,finalidade,numero_os,chassi,placa,
    cliente,solicitante,autorizado_por,observacoes,criado_por
  ) values (
    p_item_id,'saida',p_quantidade,coalesce(p_data_movimento,current_date),
    p_finalidade,nullif(p_numero_os,''),nullif(p_chassi,''),nullif(p_placa,''),
    nullif(p_cliente,''),p_solicitante,nullif(p_autorizado_por,''),
    nullif(p_observacoes,''),auth.uid()
  ) returning id into v_id;

  return v_id;
end;
$$;

-- 10) AUDITORIA AUTOMÁTICA
create or replace function public.audit_trigger_fn()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs(tabela,registro_id,acao,dados_novos,usuario_id)
    values(tg_table_name,new.id,'INSERT',to_jsonb(new),auth.uid());
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs(tabela,registro_id,acao,dados_anteriores,dados_novos,usuario_id)
    values(tg_table_name,new.id,'UPDATE',to_jsonb(old),to_jsonb(new),auth.uid());
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs(tabela,registro_id,acao,dados_anteriores,usuario_id)
    values(tg_table_name,old.id,'DELETE',to_jsonb(old),auth.uid());
    return old;
  end if;
end;
$$;

drop trigger if exists audit_itens on public.itens;
create trigger audit_itens after insert or update or delete on public.itens
for each row execute procedure public.audit_trigger_fn();

drop trigger if exists audit_movimentacoes on public.movimentacoes;
create trigger audit_movimentacoes after insert or update or delete on public.movimentacoes
for each row execute procedure public.audit_trigger_fn();

-- 11) RLS
alter table public.profiles enable row level security;
alter table public.itens enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.anexos enable row level security;
alter table public.audit_logs enable row level security;

-- Perfis: usuário lê o próprio; admin/diretor lê todos.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
using (
  id = auth.uid()
  or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','diretor'))
);

-- Itens: usuários autenticados ativos podem ler e operar.
drop policy if exists "itens_select" on public.itens;
create policy "itens_select" on public.itens for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo));

drop policy if exists "itens_insert" on public.itens;
create policy "itens_insert" on public.itens for insert to authenticated
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo and p.role in ('admin','gestor','operador')));

drop policy if exists "itens_update" on public.itens;
create policy "itens_update" on public.itens for update to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo and p.role in ('admin','gestor')))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo and p.role in ('admin','gestor')));

-- Movimentações: sem DELETE pelo aplicativo.
drop policy if exists "mov_select" on public.movimentacoes;
create policy "mov_select" on public.movimentacoes for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo));

drop policy if exists "mov_insert" on public.movimentacoes;
create policy "mov_insert" on public.movimentacoes for insert to authenticated
with check (
  criado_por = auth.uid()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo and p.role in ('admin','gestor','operador'))
);

drop policy if exists "mov_update" on public.movimentacoes;
create policy "mov_update" on public.movimentacoes for update to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo and p.role in ('admin','gestor')))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo and p.role in ('admin','gestor')));

-- Anexos.
drop policy if exists "anexos_select" on public.anexos;
create policy "anexos_select" on public.anexos for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo));

drop policy if exists "anexos_insert" on public.anexos;
create policy "anexos_insert" on public.anexos for insert to authenticated
with check (criado_por=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo));

-- Auditoria somente leitura para admin, diretor e auditoria.
drop policy if exists "audit_select" on public.audit_logs;
create policy "audit_select" on public.audit_logs for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','diretor','auditoria')));

-- 12) BUCKET PRIVADO
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'documentos-livre-debito',
  'documentos-livre-debito',
  false,
  6291456,
  array[
    'application/pdf','image/jpeg','image/png','image/webp',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set public=false, file_size_limit=6291456;

drop policy if exists "storage_select_authenticated" on storage.objects;
create policy "storage_select_authenticated" on storage.objects for select to authenticated
using (bucket_id='documentos-livre-debito');

drop policy if exists "storage_insert_authenticated" on storage.objects;
create policy "storage_insert_authenticated" on storage.objects for insert to authenticated
with check (
  bucket_id='documentos-livre-debito'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_delete_owner_or_admin" on storage.objects;
create policy "storage_delete_owner_or_admin" on storage.objects for delete to authenticated
using (
  bucket_id='documentos-livre-debito'
  and (
    owner_id=auth.uid()::text
    or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
  )
);

-- 13) PERMISSÕES
grant usage on schema public to authenticated;
grant select on public.vw_estoque_atual to authenticated;
grant select,insert,update on public.itens to authenticated;
grant select,insert,update on public.movimentacoes to authenticated;
grant select,insert on public.anexos to authenticated;
grant select on public.profiles to authenticated;
grant select on public.audit_logs to authenticated;
grant execute on function public.registrar_entrada(uuid,integer,date,text,text,text,text,text,text) to authenticated;
grant execute on function public.registrar_saida(uuid,integer,date,text,text,text,text,text,text,text,text) to authenticated;

-- Depois de criar seu primeiro usuário no Authentication, torne-o administrador:
-- update public.profiles set role='admin', nome='SEU NOME' where id='UUID_DO_USUARIO';
