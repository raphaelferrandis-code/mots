-- Paquets d'exception : 1 paquet ordinaire sur 10000 ne contient que des Légendaires holographiques, 1 sur 30000 que des Hors-série. Après 23-six-timbres.sql.
-- Aucune fonction serveur (Edge) à redéployer : le jeu peut être publié avant ou après ce script.
begin;
create or replace function public.tirer_les_cartes(p_utilisateur uuid, p_masques text[], p_mode text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c public.comptes%rowtype;
  emplacements jsonb := '[{"Commune":70,"Peu commune":25,"Rare":5},{"Commune":70,"Peu commune":25,"Rare":5},{"Commune":70,"Peu commune":25,"Rare":5},{"Peu commune":75,"Rare":20,"Épique":5},{"Rare":74,"Épique":22,"Légendaire":4},{"Rare":74,"Épique":22,"Légendaire":4}]'::jsonb;
  chances jsonb;
  numero integer := 0;
  dernier boolean;
  garantie boolean;
  depart boolean;
  masques text[] := coalesce(p_masques, '{}');
  seuil numeric;
  rarete text;
  r text;
  ordre text[];
  id_choisie text;
  rarete_choisie text;
  pris text[] := '{}';
  finition text;
  tirage double precision;
  possession public.possessions%rowtype;
  gain integer;
  tirees jsonb := '[]'::jsonb;
  legendaire boolean := false;
  exceptionnel text;
begin
  select * into c from public.comptes where utilisateur = p_utilisateur;
  -- Seulement les registres connus : un tableau fabriqué ne sert ni à orienter les tirages ni à alourdir le calcul.
  masques := array(select distinct m from unnest(coalesce(p_masques, '{}')) m where m in ('Familier', 'Injurieux', 'Littéraire', 'Vieilli'));
  -- Le fil d'activité ne note que les trouvailles tirées d'un paquet (serveur/activite.ts), pas les échanges ni le marché.
  perform set_config('philamots.tirage', 'oui', true);
  -- Au plus tard au 20e paquet sans Légendaire, la dernière carte en est une.
  if p_mode = 'achat' then emplacements := '[{"Hors-série":100}]'::jsonb;
  elsif p_mode = 'hebdomadaire' then
    emplacements := jsonb_set(emplacements, array[(jsonb_array_length(emplacements)-1)::text], '{"Épique":89,"Légendaire":10,"Hors-série":1}'::jsonb);
  elsif p_mode <> 'normal' then raise exception 'Tirage inconnu.';
  end if;
  garantie := p_mode = 'normal' and c.sans_legendaire + 1 >= 20;
  -- Les 3 paquets de départ ne contiennent que des cartes nouvelles, pour composer un deck tout de suite.
  depart := p_mode = 'normal' and c.ouverts < 3;
  -- Paquet d'exception (src/jeu/paquets.ts) : un seul jet, d'abord le paquet Hors-série (1 paquet ordinaire sur
  -- 30000), sinon le paquet de Légendaires holographiques (1 sur 10000), s'il y a assez de cartes pour le remplir.
  if p_mode = 'normal' and not depart then
    tirage := random();
    if tirage < 0.000033333333333333335 then
      if (select count(*) from public.cartes k where k.rarete = 'Hors-série' and not (k.registre && masques)) >= jsonb_array_length(emplacements) then exceptionnel := 'Hors-série'; end if;
    elsif tirage < 0.00013333333333333334 then
      if (select count(*) from public.cartes k where k.rarete = 'Légendaire' and not (k.registre && masques)) >= jsonb_array_length(emplacements) then exceptionnel := 'Légendaire'; end if;
    end if;
    if exceptionnel is not null then
      emplacements := (select jsonb_agg(jsonb_build_object(exceptionnel, 100)) from generate_series(1, jsonb_array_length(emplacements)));
    end if;
  end if;

  for chances in select * from jsonb_array_elements(emplacements) loop
    numero := numero + 1;
    dernier := numero = jsonb_array_length(emplacements);

    -- La rareté de l'emplacement, selon ses chances.
    seuil := random() * (select sum(e.value::numeric) from jsonb_each_text(chances) e);
    rarete := null;
    foreach r in array array['Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire', 'Hors-série'] loop
      seuil := seuil - coalesce((chances ->> r)::numeric, 0);
      if seuil < 0 then rarete := r; exit; end if;
    end loop;
    if rarete is null then rarete := 'Commune'; end if;
    if dernier and p_mode = 'normal' and exceptionnel is null then
      -- La garantie de Légendaire passe avant tout ; sinon, une toute petite chance de carte Hors-série.
      if garantie then rarete := 'Légendaire';
      elsif exists (select 1 from public.cartes k where k.rarete = 'Hors-série' and not (k.registre && masques)) and random() < 0.001 then rarete := 'Hors-série';
      end if;
    end if;

    -- La carte : de cette rareté, sinon de la plus proche ; jamais deux fois la même dans un paquet.
    ordre := case rarete when 'Commune' then array['Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire'] when 'Peu commune' then array['Peu commune', 'Commune', 'Rare', 'Épique', 'Légendaire'] when 'Rare' then array['Rare', 'Peu commune', 'Commune', 'Épique', 'Légendaire'] when 'Épique' then array['Épique', 'Rare', 'Peu commune', 'Commune', 'Légendaire'] when 'Légendaire' then array['Légendaire', 'Épique', 'Rare', 'Peu commune', 'Commune'] when 'Hors-série' then array['Hors-série', 'Légendaire', 'Épique', 'Rare', 'Peu commune', 'Commune'] end;
    if p_mode = 'achat' or (p_mode = 'hebdomadaire' and dernier) or exceptionnel is not null then
      -- Ne jamais dégrader la garantie en cas de catalogue ou filtre incompatible.
      ordre := array[rarete];
    end if;
    id_choisie := null;
    foreach r in array ordre loop
      select k.id, k.rarete into id_choisie, rarete_choisie from public.cartes k
      where k.rarete = r and not (k.registre && masques) and k.id <> all (pris)
        and (not depart or not exists (select 1 from public.possessions p where p.utilisateur = p_utilisateur and p.carte = k.id))
      order by random() limit 1;
      if found then exit; end if;
    end loop;
    if id_choisie is null then raise exception 'Aucune carte disponible pour ce tirage.'; end if;
    pris := pris || id_choisie;

    -- La finition, tirée à part (une Hors-série a sa propre impression : pas de finition).
    if rarete_choisie = 'Hors-série' then finition := 'Normale';
    elsif exceptionnel = 'Légendaire' then finition := 'Holographique';
    else
      tirage := random();
      finition := case when tirage < 0.0125 then 'Holographique' when tirage < 0.09583333333333333 then 'Brillante' else 'Normale' end;
    end if;
    if rarete_choisie = 'Légendaire' then legendaire := true; end if;

    -- Rangement : carte nouvelle, finition nouvelle, ou vrai doublon changé en Encre.
    select * into possession from public.possessions p where p.utilisateur = p_utilisateur and p.carte = id_choisie for update;
    if not found then
      insert into public.possessions (utilisateur, carte, finitions) values (p_utilisateur, id_choisie, jsonb_build_object(finition, 1));
      tirees := tirees || jsonb_build_object('id', id_choisie, 'finition', finition, 'nouvelle', true, 'nouvelleFinition', true, 'encre', 0);
    elsif coalesce((possession.finitions ->> finition)::integer, 0) = 0 then
      update public.possessions set finitions = finitions || jsonb_build_object(finition, 1) where utilisateur = p_utilisateur and carte = id_choisie;
      tirees := tirees || jsonb_build_object('id', id_choisie, 'finition', finition, 'nouvelle', false, 'nouvelleFinition', true, 'encre', 0);
    else
      gain := (case rarete_choisie when 'Commune' then 1 when 'Peu commune' then 3 when 'Rare' then 10 when 'Épique' then 30 when 'Légendaire' then 100 when 'Hors-série' then 500 else 0 end)
            * (case finition when 'Normale' then 1 when 'Brillante' then 3 when 'Holographique' then 10 else 1 end)
            * (case when public.niveau(c) >= 2 then 1 else 1 end);
      update public.possessions
        set doublons = doublons + 1
        where utilisateur = p_utilisateur and carte = id_choisie;
      c.encre := c.encre + gain;
      tirees := tirees || jsonb_build_object('id', id_choisie, 'finition', finition, 'nouvelle', false, 'nouvelleFinition', false, 'encre', gain);
    end if;
  end loop;

  update public.comptes
    set encre = c.encre, ouverts = ouverts + case when p_mode = 'normal' then 1 else 0 end, sans_legendaire = case when p_mode <> 'normal' then sans_legendaire when legendaire then 0 else sans_legendaire + 1 end, maj_le = now()
    where utilisateur = p_utilisateur;
  perform public.gagner_xp(p_utilisateur, case when p_mode='achat' then 0 else 20 end
    + 15 * (select count(*)::integer from jsonb_array_elements(tirees) t where (t->>'nouvelle')::boolean), false);
  return tirees;
end $$;

commit;
