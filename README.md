# Madram Milsan Voyager

A 3D browser-based space exploration game — dodge debris, survive a star, a neutron star, and
a black hole, thread a singularity, drift free to find a habitable world, land and gather warp
drive materials, then fly the wormhole home.

Built with React, Three.js, and Vite.

## Local development

```
npm install
npm run dev
```

Opens at http://localhost:5173

## Deploy to Netlify (same pattern as your other repos)

1. Push this folder to a new GitHub repo (e.g. `madram-milsan-voyager`):
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/madram-milsan-voyager.git
   git push -u origin main
   ```
2. In Netlify: **Add new site → Import an existing project → GitHub** → select the repo.
3. Build settings (Netlify should auto-detect these from `netlify.toml`, but confirm):
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy. Every future push to `main` will auto-redeploy, same as your other Netlify-linked repos.

## Notes

- Fully client-side — no backend, no environment variables, no API keys needed.
- The bundle is ~670KB (mostly Three.js) — that's normal for a 3D game and won't cause issues
  on Netlify's static hosting.
- Controls: WASD or arrow keys to steer, C or the shutter button to photograph, R to repair
  hull once unlocked. Works on both desktop and touch (on-screen controls appear automatically).
