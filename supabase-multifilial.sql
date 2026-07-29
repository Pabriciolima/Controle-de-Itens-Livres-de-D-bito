-- ============================================================
-- MIGRAÇÃO MULTIFILIAL — EXECUTAR UMA ÚNICA VEZ
-- Este arquivo preserva os dados já cadastrados.
-- ============================================================

-- 1) Cadastro oficial das unidades
create table if not exists public.filiais (
  id uuid primary key default gen_random_uuid(),
  codigo_login text not null unique,
  cnpj text not null unique,
  localidade text not null unique,
  uf char(2) not null,
  slug text not null unique,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.filiais (codigo_login,cnpj,localidade,uf,slug) values
('4700','05024583000104','BELÉM','PA','belem'),
('4701','05442121000107','SÃO LUÍS','MA','sao-luis'),
('4702','05442121000298','BACABAL','MA','bacabal'),
('4703','09597026000133','MACAPÁ','AP','macapa'),
('4704','05285816000122','TERESINA','PI','teresina'),
('4705','05285816000394','URUÇUÍ','PI','urucui'),
('4706','07811058000245','RONDONÓPOLIS','MT','rondonopolis'),
('4707','07811058000326','SINOP','MT','sinop'),
('4708','07811058000164','CUIABÁ','MT','cuiaba'),
('4709','84652296000115','PORTO VELHO','RO','porto-velho'),
('4710','84652296000204','VILHENA','RO','vilhena'),
('4711','84652296000620','JI-PARANÁ','RO','ji-parana')
on conflict (codigo_login) do update set
  cnpj=excluded.cnpj,
  localidade=excluded.localidade,
  uf=excluded.uf,
  slug=excluded.slug,
  ativa=true;

alter table public.filiais enable row level security;
drop policy if exists filiais_select_authenticated on public.filiais;
create policy filiais_select_authenticated on public.filiais
for select to authenticated using (ativa=true);
grant select on public.filiais to authenticated;

-- 2) Campos de unidade no perfil
alter table public.profiles add column if not exists codigo_login text;
alter table public.profiles add column if not exists filial_slug text;
create unique index if not exists profiles_codigo_login_unique
on public.profiles(codigo_login) where codigo_login is not null;

-- 3) Funções auxiliares. SECURITY DEFINER evita recursão nas políticas de profiles.
create or replace function public.app_is_global()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1 from public.profiles
    where id=auth.uid() and ativo=true and role in ('admin','diretor')
  );
$$;

create or replace function public.app_filial()
returns text
language sql
stable
security definer
set search_path=public
as $$
  select filial from public.profiles where id=auth.uid() and ativo=true;
$$;

create or replace function public.app_filial_slug()
returns text
language sql
stable
security definer
set search_path=public
as $$
  select filial_slug from public.profiles where id=auth.uid() and ativo=true;
$$;

grant execute on function public.app_is_global() to authenticated;
grant execute on function public.app_filial() to authenticated;
grant execute on function public.app_filial_slug() to authenticated;

-- 4) Perfil: cada conta lê o próprio perfil.
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated using (id=auth.uid());

-- 5) ITENS: filial só enxerga e grava sua unidade. Admin/Diretoria enxerga todas.
drop policy if exists "itens_select" on public.itens;
drop policy if exists "itens_insert" on public.itens;
drop policy if exists "itens_update" on public.itens;

create policy itens_select_multifilial on public.itens
for select to authenticated
using (
  public.app_is_global()
  or (status <> 'arquivado' and filial=public.app_filial())
);

create policy itens_insert_multifilial on public.itens
for insert to authenticated
with check (
  criado_por=auth.uid()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo and p.role in ('admin','gestor','operador'))
  and (public.app_is_global() or filial=public.app_filial())
);

create policy itens_update_multifilial on public.itens
for update to authenticated
using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo and p.role in ('admin','gestor'))
  and (public.app_is_global() or filial=public.app_filial())
)
with check (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo and p.role in ('admin','gestor'))
  and (public.app_is_global() or filial=public.app_filial())
);

-- 6) MOVIMENTAÇÕES: acesso depende da filial do item.
drop policy if exists "mov_select" on public.movimentacoes;
drop policy if exists "mov_insert" on public.movimentacoes;
drop policy if exists "mov_update" on public.movimentacoes;

create policy mov_select_multifilial on public.movimentacoes
for select to authenticated
using (
  public.app_is_global()
  or exists (
    select 1 from public.itens i
    where i.id=movimentacoes.item_id and i.filial=public.app_filial()
  )
);

create policy mov_insert_multifilial on public.movimentacoes
for insert to authenticated
with check (
  criado_por=auth.uid()
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo and p.role in ('admin','gestor','operador'))
  and (
    public.app_is_global()
    or exists (
      select 1 from public.itens i
      where i.id=movimentacoes.item_id and i.filial=public.app_filial()
    )
  )
);

create policy mov_update_multifilial on public.movimentacoes
for update to authenticated
using (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo and p.role in ('admin','gestor'))
  and (
    public.app_is_global()
    or exists (
      select 1 from public.itens i
      where i.id=movimentacoes.item_id and i.filial=public.app_filial()
    )
  )
)
with check (
  exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo and p.role in ('admin','gestor'))
  and (
    public.app_is_global()
    or exists (
      select 1 from public.itens i
      where i.id=movimentacoes.item_id and i.filial=public.app_filial()
    )
  )
);

-- 7) ANEXOS: somente documentos da filial visível.
drop policy if exists "anexos_select" on public.anexos;
drop policy if exists "anexos_insert" on public.anexos;

create policy anexos_select_multifilial on public.anexos
for select to authenticated
using (
  public.app_is_global()
  or exists (
    select 1
    from public.movimentacoes m
    join public.itens i on i.id=m.item_id
    where m.id=anexos.movimentacao_id and i.filial=public.app_filial()
  )
);

create policy anexos_insert_multifilial on public.anexos
for insert to authenticated
with check (
  criado_por=auth.uid()
  and (
    public.app_is_global()
    or exists (
      select 1
      from public.movimentacoes m
      join public.itens i on i.id=m.item_id
      where m.id=anexos.movimentacao_id and i.filial=public.app_filial()
    )
  )
);

-- 8) Storage: pastas por filial. O novo script grava slug/usuario/ano/...
drop policy if exists "storage_select_authenticated" on storage.objects;
drop policy if exists "storage_insert_authenticated" on storage.objects;
drop policy if exists "storage_delete_owner_or_admin" on storage.objects;

create policy storage_select_multifilial on storage.objects
for select to authenticated
using (
  bucket_id='documentos-livre-debito'
  and (
    public.app_is_global()
    or (storage.foldername(name))[1]=public.app_filial_slug()
  )
);

create policy storage_insert_multifilial on storage.objects
for insert to authenticated
with check (
  bucket_id='documentos-livre-debito'
  and (
    (public.app_is_global() and (storage.foldername(name))[1] is not null)
    or (storage.foldername(name))[1]=public.app_filial_slug()
  )
  and (storage.foldername(name))[2]=auth.uid()::text
);

create policy storage_delete_multifilial on storage.objects
for delete to authenticated
using (
  bucket_id='documentos-livre-debito'
  and (
    public.app_is_global()
    or (
      (storage.foldername(name))[1]=public.app_filial_slug()
      and (storage.foldername(name))[2]=auth.uid()::text
    )
  )
);

-- 9) View continua respeitando as políticas da tabela itens/movimentações.
create or replace view public.vw_estoque_atual
with (security_invoker=true)
as
select
  i.*,
  coalesce(sum(
    case
      when m.status <> 'ativo' then 0
      when m.tipo='entrada' then m.quantidade
      when m.tipo='saida' then -m.quantidade
      when m.tipo='ajuste' then m.quantidade
      else 0
    end
  ),0)::integer as saldo
from public.itens i
left join public.movimentacoes m on m.item_id=i.id
group by i.id;

grant select on public.vw_estoque_atual to authenticated;

-- 10) Vincula as contas de filial depois que elas forem criadas no Authentication.
-- O e-mail técnico é ocultado pela tela; o usuário digita apenas 4700, 4701 etc.
update public.profiles p set
  nome='FILIAL BELÉM', role='operador', filial='BELÉM', filial_slug='belem', codigo_login='4700', ativo=true
from auth.users u where p.id=u.id and lower(u.email)='4700@acesso.grupomonaco.com.br';
update public.profiles p set
  nome='FILIAL SÃO LUÍS', role='operador', filial='SÃO LUÍS', filial_slug='sao-luis', codigo_login='4701', ativo=true
from auth.users u where p.id=u.id and lower(u.email)='4701@acesso.grupomonaco.com.br';
update public.profiles p set
  nome='FILIAL BACABAL', role='operador', filial='BACABAL', filial_slug='bacabal', codigo_login='4702', ativo=true
from auth.users u where p.id=u.id and lower(u.email)='4702@acesso.grupomonaco.com.br';
update public.profiles p set
  nome='FILIAL MACAPÁ', role='operador', filial='MACAPÁ', filial_slug='macapa', codigo_login='4703', ativo=true
from auth.users u where p.id=u.id and lower(u.email)='4703@acesso.grupomonaco.com.br';
update public.profiles p set
  nome='FILIAL TERESINA', role='operador', filial='TERESINA', filial_slug='teresina', codigo_login='4704', ativo=true
from auth.users u where p.id=u.id and lower(u.email)='4704@acesso.grupomonaco.com.br';
update public.profiles p set
  nome='FILIAL URUÇUÍ', role='operador', filial='URUÇUÍ', filial_slug='urucui', codigo_login='4705', ativo=true
from auth.users u where p.id=u.id and lower(u.email)='4705@acesso.grupomonaco.com.br';
update public.profiles p set
  nome='FILIAL RONDONÓPOLIS', role='operador', filial='RONDONÓPOLIS', filial_slug='rondonopolis', codigo_login='4706', ativo=true
from auth.users u where p.id=u.id and lower(u.email)='4706@acesso.grupomonaco.com.br';
update public.profiles p set
  nome='FILIAL SINOP', role='operador', filial='SINOP', filial_slug='sinop', codigo_login='4707', ativo=true
from auth.users u where p.id=u.id and lower(u.email)='4707@acesso.grupomonaco.com.br';
update public.profiles p set
  nome='FILIAL CUIABÁ', role='operador', filial='CUIABÁ', filial_slug='cuiaba', codigo_login='4708', ativo=true
from auth.users u where p.id=u.id and lower(u.email)='4708@acesso.grupomonaco.com.br';
update public.profiles p set
  nome='FILIAL PORTO VELHO', role='operador', filial='PORTO VELHO', filial_slug='porto-velho', codigo_login='4709', ativo=true
from auth.users u where p.id=u.id and lower(u.email)='4709@acesso.grupomonaco.com.br';
update public.profiles p set
  nome='FILIAL VILHENA', role='operador', filial='VILHENA', filial_slug='vilhena', codigo_login='4710', ativo=true
from auth.users u where p.id=u.id and lower(u.email)='4710@acesso.grupomonaco.com.br';
update public.profiles p set
  nome='FILIAL JI-PARANÁ', role='operador', filial='JI-PARANÁ', filial_slug='ji-parana', codigo_login='4711', ativo=true
from auth.users u where p.id=u.id and lower(u.email)='4711@acesso.grupomonaco.com.br';

-- Garanta que o usuário da Diretoria permaneça com acesso global:
-- update public.profiles set role='admin', filial=null, filial_slug='diretoria', codigo_login=null
-- where id='UUID_DO_USUARIO_DA_DIRETORIA';