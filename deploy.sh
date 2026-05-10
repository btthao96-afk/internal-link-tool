#!/bin/bash

# Internal Link SEO Tool - Deployment Script
# This script helps deploy both backend and frontend to Vercel

set -e

echo "🚀 Internal Link SEO Tool - Deployment Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Vercel CLI is installed
check_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI is not installed. Please install it first:"
        echo "npm install -g vercel"
        exit 1
    fi
}

# Check if user is logged in to Vercel
check_vercel_login() {
    if ! vercel whoami &> /dev/null; then
        print_warning "You are not logged in to Vercel. Please login:"
        vercel login
    fi
}

# Deploy backend
deploy_backend() {
    print_status "Deploying backend API..."

    cd web-app/backend

    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found in backend. Creating from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_warning "Please edit .env file with your actual values before deploying!"
            read -p "Press Enter after editing .env file..."
        else
            print_error ".env.example file not found. Please create environment variables manually in Vercel dashboard."
        fi
    fi

    # Deploy to Vercel
    print_status "Deploying to Vercel..."
    BACKEND_URL=$(vercel --prod 2>&1 | grep -o 'https://[^ ]*\.vercel\.app')

    if [ -z "$BACKEND_URL" ]; then
        print_error "Failed to get backend URL from Vercel deployment"
        exit 1
    fi

    print_success "Backend deployed successfully!"
    print_success "Backend URL: $BACKEND_URL"

    cd ../..
}

# Deploy frontend
deploy_frontend() {
    print_status "Deploying frontend..."

    cd web-app/frontend

    # Set API URL environment variable
    if [ -n "$BACKEND_URL" ]; then
        print_status "Setting REACT_APP_API_URL to $BACKEND_URL/api"
        vercel env add REACT_APP_API_URL
        echo "$BACKEND_URL/api" | vercel env add REACT_APP_API_URL
    else
        print_warning "Backend URL not found. Please set REACT_APP_API_URL manually in Vercel dashboard."
    fi

    # Deploy to Vercel
    print_status "Deploying frontend to Vercel..."
    FRONTEND_URL=$(vercel --prod 2>&1 | grep -o 'https://[^ ]*\.vercel\.app')

    if [ -z "$FRONTEND_URL" ]; then
        print_error "Failed to get frontend URL from Vercel deployment"
        exit 1
    fi

    print_success "Frontend deployed successfully!"
    print_success "Frontend URL: $FRONTEND_URL"

    cd ../..
}

# Update CORS in backend
update_cors() {
    if [ -n "$FRONTEND_URL" ]; then
        print_status "Updating CORS settings in backend..."

        # This would need to be done manually in Vercel dashboard or by updating the code
        print_warning "Please update CORS settings in your backend Vercel deployment:"
        print_warning "Add $FRONTEND_URL to allowed origins in server.js"
    fi
}

# Main deployment process
main() {
    print_status "Starting deployment process..."

    # Check prerequisites
    check_vercel_cli
    check_vercel_login

    # Confirm deployment
    echo
    print_warning "This will deploy both backend and frontend to Vercel."
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled."
        exit 0
    fi

    # Deploy backend first
    deploy_backend

    # Deploy frontend
    deploy_frontend

    # Update CORS
    update_cors

    # Final instructions
    echo
    print_success "🎉 Deployment completed successfully!"
    echo
    print_success "Your Internal Link SEO Tool is now live:"
    if [ -n "$FRONTEND_URL" ]; then
        print_success "Frontend: $FRONTEND_URL"
    fi
    if [ -n "$BACKEND_URL" ]; then
        print_success "Backend API: $BACKEND_URL"
    fi
    echo
    print_warning "Next steps:"
    echo "1. Update CORS settings in backend to allow frontend domain"
    echo "2. Set up your PostgreSQL database"
    echo "3. Test user registration and login"
    echo "4. Create your first project!"
    echo
    print_status "Happy linking! 🔗"
}

# Run main function
main "$@"