Taekwondo Scoreboard
Web application for managing and displaying scores for a taekwondo tournament.
Setup

Install Node.js: Download from nodejs.org.

Clone Repository:
git clone <repository-url>
cd taekwondo-scoreboard

Backend Setup:
cd backend
npm install
node server.js

Frontend Setup:
cd frontend
npm install
npm start

Access:

Mobile: http://localhost:3000/mobile
TV: http://localhost:3000/tv

Features

Mobile Interface: Select mat, control rounds, timer, scores, and gamgeoms.
TV Interface: Display real-time scores for one or both mats, with winner announcements.
Real-Time Sync: Updates from mobile instantly reflect on TV via WebSockets.
