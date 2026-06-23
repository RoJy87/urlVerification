# URL Verifier

Асинхронная проверка доступности списка URL. Fullstack-приложение на TypeScript.

## Стек

- **Бэкенд:** Express + TypeScript, Zod, Pino
- **Фронтенд:** React 18 + TypeScript, Vite, Zustand
- **Инфра:** Docker, docker-compose

## Структура

```
├── backend/          # API-сервер (порт 3000)
├── frontend/         # React-приложение (порт 5173 dev / 80 prod)
└── docker-compose.yml
```

## Запуск

### Dev (без Docker)

```bash
# Бэкенд
cd backend
npm install
npm run dev

# Фронтенд (в отдельном терминале)
cd frontend
npm install
npm run dev
```

Фронтенд доступен на `http://localhost:5173`, API проксируется на `localhost:3000`.

### Docker

```bash
docker compose up --build
```

- Бэкенд: `http://localhost:3000`
- Фронтенд: `http://localhost:80`

## API

| Метод | Endpoint | Описание |
|---|---|---|
| `POST` | `/api/jobs` | Создать задание. Body: `{ "urls": ["https://..."] }` |
| `GET` | `/api/jobs` | Список всех заданий |
| `GET` | `/api/jobs/:id` | Детальная информация по заданию |
| `DELETE` | `/api/jobs/:id` | Отменить задание |
| `GET` | `/api/health` | Проверка здоровья |

## Логика проверки URL

- Для каждого URL выполняется HTTP HEAD-запрос
- Перед сохранением — случайная задержка 0–10 секунд
- Не более 5 одновременных HEAD-запросов на задание
- Несколько заданий могут выполняться параллельно
- Отмена помечает необработанные URL как `cancelled`

## Типы статусов

### Задание (`JobStatus`)
`pending` → `in_progress` → `completed` / `failed`  
Отмена: → `cancelled`

### URL (`UrlStatus`)
`pending` → `in_progress` → `success` / `error`  
Отмена: → `cancelled`
