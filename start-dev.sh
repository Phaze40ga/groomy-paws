#!/bin/bash

# Start both frontend and backend servers for development

echo "🚀 Starting Groomy Paws Development Servers..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env files exist
if [ ! -f "server/.env" ]; then
    echo "${YELLOW}⚠️  Warning: server/.env not found${NC}"
    echo "Creating server/.env from template..."
    cat > server/.env << EOF
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=groomy_paws
PORT=3001
JWT_SECRET=dev-secret-key-change-in-production
EOF
    echo "${GREEN}✅ Created server/.env${NC}"
fi

if [ ! -f ".env" ]; then
    echo "${YELLOW}⚠️  Warning: .env not found${NC}"
    echo "Creating .env..."
    echo "VITE_API_URL=http://localhost:3001/api" > .env
    echo "${GREEN}✅ Created .env${NC}"
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "${YELLOW}🛑 Stopping servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Trap Ctrl+C
trap cleanup INT TERM

# Start backend server
echo "${BLUE}📦 Starting backend server on http://localhost:3001${NC}"
cd server
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "${YELLOW}⚠️  Backend failed to start. Check backend.log for errors${NC}"
    exit 1
fi

# Start frontend server
echo "${BLUE}🎨 Starting frontend server...${NC}"
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "${YELLOW}⚠️  Frontend failed to start. Check frontend.log for errors${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "${GREEN}✅ Both servers are running!${NC}"
echo ""
echo "📊 Backend:  http://localhost:3001"
echo "🎨 Frontend: http://localhost:5173 (or check terminal output)"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

