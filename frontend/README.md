# PC Builder Frontend

A modern web application for creating and sharing PC builds. Built with React, TypeScript, and Tailwind CSS.

## Features

- User authentication (login/register)
- Create, edit, and view PC builds
- Browse and search components
- Like and comment on builds
- User profiles with followers/following
- Dark mode support
- Responsive design

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API running on `http://localhost:8000`

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd pc-builder/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory:
   ```
   VITE_API_URL=http://localhost:8000/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

The application will be available at `http://localhost:3000`.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Structure

```
src/
├── components/     # Reusable UI components
├── layouts/        # Layout components
├── pages/         # Page components
├── services/      # API services
├── store/         # Redux store and slices
├── router/        # React Router configuration
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
├── App.tsx        # Root component
└── main.tsx       # Application entry point
```

## Technologies Used

- React 18
- TypeScript
- Redux Toolkit
- React Router
- Tailwind CSS
- Axios
- Vite

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
