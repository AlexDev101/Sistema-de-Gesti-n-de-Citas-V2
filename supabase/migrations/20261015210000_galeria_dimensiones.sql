-- Medidas de cada foto/vídeo, para que la portada pinte el mosaico con la
-- proporción real de cada pieza sin esperar a que cargue (sin saltos).
-- Opcionales: si faltan, la portada usa una proporción por defecto.

alter table galeria_items add column if not exists ancho integer;
alter table galeria_items add column if not exists alto integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'galeria_items_medidas_validas') then
    alter table galeria_items add constraint galeria_items_medidas_validas
      check ((ancho is null and alto is null) or (ancho between 1 and 20000 and alto between 1 and 20000));
  end if;
end $$;

-- Las fotos que venían con la web.
update galeria_items set ancho = 335, alto = 597 where url in ('/uploads/trabajo-1.jpeg', '/uploads/trabajo-3.jpeg') and ancho is null;
update galeria_items set ancho = 360, alto = 640 where url = '/uploads/trabajo-2.jpeg' and ancho is null;
update galeria_items set ancho = 459, alto = 668 where url = '/uploads/trabajo-4.jpeg' and ancho is null;
