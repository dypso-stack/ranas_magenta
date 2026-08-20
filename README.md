# 🐸 Ranas Magenta

Mini juego web hecho con **HTML + CSS + JavaScript puro**, sin frameworks ni backend.
Estilo *endless climber* (tipo Doodle Jump): la rana rebota sola sobre nenúfares
que se generan hacia arriba sin límite, mientras cóndores cruzan la pantalla.

## Cómo jugar

- **← / →** o **A / D**: mover la rana (rebota automáticamente al aterrizar).
- **R**: reiniciar.
- Sube de nenúfar en nenúfar; si caes por debajo de la pantalla, termina la partida.
- **Cóndores**: si te chocan pierdes una vida (tienes 3). Si logras pasarlos por
  encima en el aire sin tocarlos, ganas **+30 puntos de bono**.
- El puntaje combina la altura alcanzada más los bonos de cóndor. Se guarda el récord localmente.

## Qué se corrigió

- **Bug principal**: la rana no llegaba a los nenúfares porque el salto tenía una
  altura máxima fija (~116px) mientras las plataformas podían aparecer a más de
  300px de distancia vertical — físicamente inalcanzable.
- Se rediseñó como scroll vertical infinito: las plataformas ahora **siempre**
  se generan dentro del rango real de salto de la rana (margen de seguridad
  incluido), y la cámara sigue a la rana solo hacia arriba (nunca retrocede).
- Se añadió rebote automático, nenúfares móviles, vidas/invulnerabilidad tras
  choque, cóndores con bono por esquive aéreo, controles táctiles y récord persistente.

## Ejecutarlo localmente

Puedes abrir `index.html` directamente en el navegador o usar cualquier servidor estático.

## Subir a GitHub

```bash
git init
git add .
git commit -m "Rediseñar Ranas Magenta como endless climber con cóndores"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/ranas-magenta.git
git push -u origin main
```

## Publicarlo en Vercel

1. Entra a Vercel y selecciona **Add New → Project**.
2. Importa el repositorio de GitHub.
3. No necesitas framework.
4. Deja el directorio raíz como está.
5. Pulsa **Deploy**.

Vercel detectará el proyecto como sitio estático y servirá `index.html`.

## Estructura

```text
ranas-magenta/
├── index.html
├── style.css
├── game.js
└── README.md
```
