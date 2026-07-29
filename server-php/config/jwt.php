<?php

return [
    'secret' => env('JWT_SECRET', 'whatsapp_crm_jwt_secret_2026_k8x9m2'),
    'expiry' => (int) env('JWT_EXPIRY', 604800), // 7 days in seconds
    'algo' => 'HS256',
];
