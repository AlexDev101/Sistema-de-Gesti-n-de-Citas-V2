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
   De esa misma portada **guarda lo que el negocio publica**: descripción, textos,
   servicios con precio, horario, dirección, redes, logo y fotos (ver «Información e imágenes»).
3. Puntúa cada negocio de 0 a 100 con los motivos a la vista. Encajan mejor los que
   reservan en una plataforma ajena, los que tienen web sin reserva online y los
   que tienen un móvil publicado. Los que ya usan una herramienta propia, peor.
4. Redacta para cada uno un WhatsApp y un guion de llamada con lo que se ha visto de verdad.
   En el informe, «Abrir WhatsApp» abre el chat con el texto escrito; envías tú.

## Información e imágenes de cada negocio

Junto al informe se crea `negocios/<nombre>/` con:

- `perfil.json`: nombre, descripción, textos, titulares, servicios y precios, horario
  (el de su web o, si no hay, el de OpenStreetMap), dirección y redes.
- `imagenes/`: su logo (`logo.*`) y hasta 6 fotos (`foto-01.*`…), la primera suele ser su foto de portada.

En el informe, cada negocio tiene el desplegable «Lo que publica su web» con todo eso, y el CSV
lleva las columnas de descripción, servicios, horario, redes y carpeta.
`--sin-imagenes` guarda solo los textos; `--max-imagenes 10` cambia cuántas fotos se bajan.

Límites a propósito: solo la portada de su web, un máximo de 3 MB por imagen, solo archivos de
imagen, nunca direcciones internas de red, y los nombres de archivo los pone la herramienta.
**No se guardan emails.** Si una web no publica sus precios o su horario en la portada,
esos campos salen vacíos (no se inventa nada).

**Uso de las imágenes y textos:** son del negocio. Sirven para preparar una demostración
de su propia página con tu sistema y enseñársela a él; no las publiques ni las reutilices en otro sitio.

Opciones: `--max` (cuántos analizar, 60 por defecto), `--todas` (también peluquerías
de señoras), `--nombre`, `--demo` (el enlace del ejemplo), `--sin-webs`, `--salida`,
`--excluir`, `--sin-imagenes`, `--max-imagenes`. `node scripts/prospeccion/buscar.mjs --ayuda` las lista.

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
