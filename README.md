# aaadlander - Laravel Dashboard

A Laravel-based dashboard application with key metrics overview and recent activity tracking.

## Requirements

- PHP 8.3+
- Composer
- Node.js & npm

## Getting Started

```bash
# Install dependencies
composer install

# Copy environment file and generate app key
cp .env.example .env
php artisan key:generate

# Run database migrations
php artisan migrate

# Start the development server
php artisan serve
```

Visit [http://localhost:8000](http://localhost:8000) to view the dashboard.

## Features

- **Stats Overview** – Cards displaying key metrics (users, revenue, orders, conversion rate) with trend indicators
- **Recent Activity** – Feed of the latest user actions
- **Quick Links** – Shortcuts to common management pages
- Responsive layout using Tailwind CSS

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
