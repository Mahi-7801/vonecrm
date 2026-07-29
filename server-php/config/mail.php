<?php

return [
    'default' => env('MAIL_MAILER', 'smtp'),

    'mailers' => [
        'smtp' => [
            'transport' => 'smtp',
            'host' => env('SMTP_HOST', 'smtp.gmail.com'),
            'port' => (int) env('SMTP_PORT', 587),
            'encryption' => env('MAIL_ENCRYPTION', 'tls'),
            'username' => env('SMTP_USERNAME'),
            'password' => env('SMTP_APP_PASSWORD'),
            'timeout' => null,
            'local_domain' => null,
        ],
    ],

    'from' => [
        'address' => env('SMTP_USERNAME', 'kornepatimahankali35@gmail.com'),
        'name' => env('SMTP_FROM_NAME', 'V ONE DIGITALS'),
    ],
];
