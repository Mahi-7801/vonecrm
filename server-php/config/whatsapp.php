<?php

return [
    'graph_api_version' => env('WHATSAPP_GRAPH_API_VERSION', 'v25.0'),
    'graph_api_base' => 'https://graph.facebook.com',
    'app_id' => env('WHATSAPP_APP_ID'),
    'app_secret' => env('WHATSAPP_APP_SECRET'),
    'system_user_token' => env('WHATSAPP_SYSTEM_USER_TOKEN'),
    'webhook_verify_token' => env('WHATSAPP_WEBHOOK_VERIFY_TOKEN'),
    'config_id' => env('WHATSAPP_CONFIG_ID'),
    'redirect_uri' => env('WHATSAPP_REDIRECT_URI'),
    'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
    'waba_id' => env('WHATSAPP_WABA_ID'),
];
