# Simple Vote App

A real-time voting application built with Node.js and WebSockets.

## Features

- Create voting rooms
- Real-time voting with instant results
- Host controls for starting and ending votes
- Responsive design for desktop and mobile devices

## Technologies Used

- Node.js
- Express.js
- WebSocket (ws)
- SQLite3
- UUID

## Getting Started

### Prerequisites

- Node.js (v12 or higher)
- npm (Node Package Manager)

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/simple-vote-app.git
   ```

2. Navigate to the project directory:

   ```
   cd simple-vote-app
   ```

3. Install dependencies:

   ```
   npm install
   ```

4. Start the server:

   ```
   node server.js
   ```

5. Open your browser and visit `http://localhost:3000` (or the port you've configured).

## Usage

1. Create a new room by clicking "Create Room" on the homepage.
2. Share the room link with participants.
3. As the host, start the voting when ready.
4. Participants can cast their votes in real-time.
5. View live results as votes are submitted.
6. End the voting session to finalize results.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Thanks to all contributors who have helped with this project.
- Inspired by the need for simple, real-time voting solutions.
