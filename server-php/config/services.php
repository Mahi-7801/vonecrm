<?php

return [
    'groq' => [
        'api_key' => env('GROQ_API_KEY'),
        'model' => 'llama-3.1-70b-versatile',
        'api_url' => 'https://api.groq.com/openai/v1/chat/completions',
    ],
];
