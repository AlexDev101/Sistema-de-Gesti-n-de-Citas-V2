import { render } from '@react-email/render';
import React from 'react';
import { ConfirmacionCita } from '../src/emails/ConfirmacionCita.tsx';
import { RecordatorioCita } from '../src/emails/RecordatorioCita.tsx';

const confirmacionProps = {
  nombreCliente: 'Marc',
  cuando: 'jueves, 13 de agosto a las 10:00',
  servicios: 'Corte + Barba',
  totalTxt: '13 €',
  direccion: 'Calle Carlos Cano, Niebla, Huelva, 21840',
  nombreNegocio: 'Francíso García Barbershop',
  gestionUrl: 'https://fg-barbershop.vercel.app/reservar/confirmacion/xxxx',
};

const recordatorioProps = {
  nombreCliente: 'Marc',
  cuando: 'jueves, 13 de agosto a las 10:00',
  servicios: 'Corte + Barba',
  direccion: 'Calle Carlos Cano, Niebla, Huelva, 21840',
  nombreNegocio: 'Francíso García Barbershop',
  gestionUrl: 'https://fg-barbershop.vercel.app/reservar/confirmacion/xxxx',
};

const html1 = await render(React.createElement(ConfirmacionCita, confirmacionProps));
const html2 = await render(React.createElement(RecordatorioCita, recordatorioProps));

const fs = await import('fs');
fs.writeFileSync('scripts/out-confirmacion.html', html1);
fs.writeFileSync('scripts/out-recordatorio.html', html2);
console.log('done');
