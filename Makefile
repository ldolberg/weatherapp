# Run everything via Docker — do not use npm on the host for this app.
.PHONY: up down build logs ps

up:
	docker compose up --build

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f web

ps:
	docker compose ps
