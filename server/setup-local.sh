#!/bin/bash

# Local Development Setup Script
echo "Setting up local development environment..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Database Configuration - Local Development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=groomy_paws

# Server Configuration
PORT=3001

# JWT Secret (change this in production!)
JWT_SECRET=dev-secret-key-change-in-production
EOF
    echo ".env file created! Please edit it with your MySQL credentials."
else
    echo ".env file already exists. Skipping creation."
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit server/.env with your MySQL credentials"
echo "2. Make sure MySQL is running"
echo "3. Run: mysql -u root -p groomy_paws < ../mysql/schema.sql"
echo "4. Start server: npm run dev"

