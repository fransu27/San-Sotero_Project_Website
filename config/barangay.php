<?php

/*
 * Settings used by the database seeder. env() is only allowed inside the config directory
 * (it returns null once `php artisan config:cache` has run), so the seeder reads these values with config().
 */
return [
    'admin_email' => env('ADMIN_EMAIL', 'admin@barangay.test'),
    'admin_password' => env('ADMIN_PASSWORD'),
];
