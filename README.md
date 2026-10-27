# Nexora – Campus Events (Node + Express + MongoDB)

## Run
```
npm install
npm start          # http://localhost:3000
```
`.env` me `MONGO_URI` (Atlas), `JWT_SECRET`, `ORGANIZER_CODE` hain. Pehli baar server chalne par 7 starter events seed ho jaate hain.

## Kya kahan hai
| Topic | File |
|---|---|
| Express server + static frontend | `server.js` |
| MongoDB models (Mongoose) | `models/*.js` |
| Authentication (signup/login, bcrypt, JWT cookie) | `routes/auth.js`, `middleware/auth.js` → `requireAuth` |
| Authorization (roles student/organizer, ownership) | `requireRole(...)`, `routes/events.js` (owner check) |
| Multer (photo upload, type + size filter) | `middleware/upload.js`, `routes/experiences.js` |
| Trips (type `Trip`, hamesha paid, destination field) | `routes/events.js`, `public/index.html` (#trips), organizer form |
| Duty Leave (DL) events | `dutyLeave` field, DL section + navbar link in `public/index.html` |
| Experiences (photo + rating) | `routes/experiences.js`, `public/script.js` |

## Rules
- Organizer signup needs `ORGANIZER_CODE` (server par check hota hai).
- Student sirf register kar sakta hai; organizer sirf apne events edit/delete/registrants dekh sakta hai.
- Experience: student sirf register kiye hue event par, organizer sirf apne event par likh sakta hai. Photo optional (JPG/PNG/WEBP, max 3 MB).

> `.env` ko kisi ke saath share ya GitHub par push mat karna.
