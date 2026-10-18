# Prospección de barberías

Herramienta para encontrar barberías a las que ofrecer el sistema de citas.
**Prepara la lista y los mensajes; el envío lo haces tú, uno a uno.**

```
node scripts/prospeccion/buscar.mjs --ciudad "Huelva"
```

Necesita Node 20 o superior y salida a internet. No instala nada ni usa claves de API.
Al terminar abre `informe.html` (y `leads.csv` si prefieres Excel) en la carpeta
`scripts/prospeccion/salida/<ciudad>-<fecha>/`.

## Qué hace

1. Localiza la ciudad (Nominatim) y saca las barberías que hay en OpenStreetMap
   (Overpass): nombre, dirección, teléfono y web, si alguien los ha publicado.
2. Abre la **portada pública** de la web de cada negocio (una petición, respetando su
   `robots.txt`) y mira si reserva con Booksy, Treatwell o Fresha, si usa otra herramienta
   de citas, y si enseña su WhatsApp o su Instagram.
3. Puntúa cada negocio de 0 a 100 con los motivos a la vista. Encajan mejor los que
   reservan en una plataforma ajena, los que tienen web sin reserva online y los
   que tienen un móvil publicado. Los que ya usan una herramienta propia, peor.
4. Redacta para cada uno un WhatsApp y un guion de llamada con lo que se ha visto de verdad.
   En el informe, «Abrir WhatsApp» abre el chat con el texto escrito; envías tú.

Opciones: `--max` (cuántos analizar, 60 por defecto), `--todas` (también peluquerías
de señoras), `--nombre`, `--demo` (el enlace del ejemplo), `--sin-webs`, `--salida`,
`--excluir`. `node scripts/prospeccion/buscar.mjs --ayuda` las lista.

## Qué NO hace, a propósito

- **No consulta Booksy, Instagram ni Facebook.** Extraer datos de ellos incumple sus
  condiciones. Si la «web» de un negocio es una de esas direcciones, solo se deduce de la
  propia dirección.
- **No envía nada.** Mandar mensajes o emails comerciales en masa a quien no lo ha pedido
  lo prohíbe la ley española (LSSI art. 21) y el RGPD, y muchos de estos negocios son autónomos.
- **No guarda emails.** Solo teléfono, web y redes públicos.

## Cómo usarla bien

- Escribe una vez, a quien tenga sentido, y ofrece salir sin compromiso (los mensajes ya
  lo hacen). Si te dicen que no, no vuelvas a escribir: apunta el negocio en
  `scripts/prospeccion/no-contactar.txt` (un nombre o teléfono por línea; `#` para comentarios)
  y la herramienta lo saltará en las búsquedas siguientes.
- «Contactado» y «Descartar» se guardan solo en tu navegador, en ese ordenador.
- `salida/` y `no-contactar.txt` no se suben al repositorio (están en `.gitignore`).
  Borra las listas que ya no necesites.
- Datos de OpenStreetMap: © colaboradores de OpenStreetMap, licencia ODbL.
  Haz una búsqueda por ciudad cada vez, sin repetirla en bucle (política de uso de Nominatim y Overpass).
