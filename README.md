<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ca091fc1-c5c3-44e4-89a5-ae1095671ba2

## Run locally (Docker only)

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2.

Do **not** run `npm install` / `npm run dev` on your machine for this app. All installs and Node commands happen **inside the image** at build/runtime.

1. From the project root:
   - `make up`  
   or  
   - `docker compose up --build`
2. Open [http://localhost:8080](http://localhost:8080) (maps container port 3000 → host 8080).
3. Weather history SQLite is stored under `./data` on the host (mounted at `/app/data` in the container).

Optional: copy [`.env.example`](.env.example) to `.env` and adjust variables; `docker compose` loads `.env` automatically for substitution where referenced.

Other Make targets: `make down`, `make build`, `make logs`, `make ps`.

If you change application code, rebuild so the image picks it up: `make up` (includes `--build`).
