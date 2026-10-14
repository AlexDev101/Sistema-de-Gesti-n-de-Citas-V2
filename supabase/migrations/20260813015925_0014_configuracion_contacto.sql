alter table configuracion add column telefono text;
alter table configuracion add column ciudad text not null default 'Niebla, Huelva';

update configuracion set
  direccion = 'Calle Carlos Cano, Niebla, Huelva, 21840',
  telefono = '+34 673 600 880',
  ciudad = 'Niebla, Huelva';
