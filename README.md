# 🐸 Ranas Magenta

Mini juego web hecho con **HTML + CSS + JavaScript puro**, sin frameworks ni backend.

## Cómo jugar

- **← / →** o **A / D**: mover la rana.
- **Espacio**: saltar.
- **R**: reiniciar.
- Aterriza sobre los nenúfares y evita caer al agua. La partida comienza sobre un nenúfar grande para que la rana nunca aparezca en el vacío.

## Ejecutarlo localmente

Puedes abrir `index.html` directamente en el navegador o usar cualquier servidor estático.

## Subir a GitHub

```bash
git init
git add .
git commit -m "Crear juego Ranas Magenta"
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
