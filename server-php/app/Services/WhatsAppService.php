<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

use App\Services\SettingService;

class WhatsAppService
{
    private string $graphApiVersion;
    private string $graphApiBase;
    private string $systemUserToken;
    private string $phoneNumberId;
    private string $wabaId;

    public function __construct()
    {
        $this->graphApiVersion = SettingService::get('WHATSAPP_GRAPH_API_VERSION') ?: (config('whatsapp.graph_api_version') ?: 'v21.0');
        $this->graphApiBase = config('whatsapp.graph_api_base') ?: 'https://graph.facebook.com';
        $this->systemUserToken = SettingService::get('WHATSAPP_SYSTEM_USER_TOKEN') ?: (config('whatsapp.system_user_token') ?: '');
        $this->phoneNumberId = SettingService::get('WHATSAPP_PHONE_NUMBER_ID') ?: (config('whatsapp.phone_number_id') ?: '');
        $this->wabaId = SettingService::get('WHATSAPP_WABA_ID') ?: (config('whatsapp.waba_id') ?: '');
    }

    public function getApiUrl(string $endpoint): string
    {
        return "{$this->graphApiBase}/{$this->graphApiVersion}/{$endpoint}";
    }

    public function sendTextMessage(string $phone, string $message, ?string $token = null, ?string $phoneNumberId = null): array
    {
        $token = $token ?: $this->systemUserToken;
        $numId = $phoneNumberId ?: $this->phoneNumberId;

        $response = Http::withToken($token)->post($this->getApiUrl("{$numId}/messages"), [
            'messaging_product' => 'whatsapp',
            'to' => $phone,
            'type' => 'text',
            'text' => ['body' => $message],
        ]);

        return $response->json();
    }

    public function sendTemplateMessage(string $phone, string $templateName, string $language = 'en_US', ?array $parameters = null, ?string $token = null, ?string $phoneNumberId = null): array
    {
        $token = $token ?: $this->systemUserToken;
        $numId = $phoneNumberId ?: $this->phoneNumberId;

        $template = [
            'name' => $templateName,
            'language' => ['code' => $language],
        ];

        if ($parameters) {
            $template['components'] = [
                [
                    'type' => 'body',
                    'parameters' => array_map(function ($param) {
                        if (is_array($param)) {
                            return $param;
                        }
                        return ['type' => 'text', 'text' => (string)$param];
                    }, $parameters),
                ],
            ];
        }

        $response = Http::withToken($token)->post($this->getApiUrl("{$numId}/messages"), [
            'messaging_product' => 'whatsapp',
            'to' => $phone,
            'type' => 'template',
            'template' => $template,
        ]);

        return $response->json();
    }

    public function sendListMessage(string $phone, string $body, string $buttonText, array $sections, ?string $token = null, ?string $phoneNumberId = null): array
    {
        $token = $token ?: $this->systemUserToken;
        $numId = $phoneNumberId ?: $this->phoneNumberId;

        $response = Http::withToken($token)->post($this->getApiUrl("{$numId}/messages"), [
            'messaging_product' => 'whatsapp',
            'to' => $phone,
            'type' => 'interactive',
            'interactive' => [
                'type' => 'list',
                'body' => ['text' => $body],
                'action' => [
                    'button' => $buttonText,
                    'sections' => $sections,
                ],
            ],
        ]);

        return $response->json();
    }

    public function sendReplyButtons(string $phone, string $body, array $buttons, ?string $token = null, ?string $phoneNumberId = null): array
    {
        $token = $token ?: $this->systemUserToken;
        $numId = $phoneNumberId ?: $this->phoneNumberId;

        $response = Http::withToken($token)->post($this->getApiUrl("{$numId}/messages"), [
            'messaging_product' => 'whatsapp',
            'to' => $phone,
            'type' => 'interactive',
            'interactive' => [
                'type' => 'button',
                'body' => ['text' => $body],
                'action' => [
                    'buttons' => array_map(function ($btn) {
                        return [
                            'type' => 'reply',
                            'reply' => ['id' => $btn['id'], 'title' => $btn['title']],
                        ];
                    }, array_slice($buttons, 0, 3)),
                ],
            ],
        ]);

        return $response->json();
    }

    public function uploadMedia(string $filePath, string $mimeType, ?string $token = null, ?string $phoneNumberId = null): ?string
    {
        $token = $token ?: $this->systemUserToken;
        $numId = $phoneNumberId ?: $this->phoneNumberId;

        $response = Http::withToken($token)
            ->attach('file', file_get_contents($filePath), basename($filePath))
            ->post($this->getApiUrl("{$numId}/media"), [
                'messaging_product' => 'whatsapp',
                'type' => $mimeType,
            ]);

        $data = $response->json();
        return $data['id'] ?? null;
    }

    public function submitTemplateToMeta(array $templateData, ?string $wabaId = null): array
    {
        $wabaId = $wabaId ?: $this->wabaId;

        $rawName = strtolower($templateData['name'] ?? 'template');
        $cleanName = preg_replace('/[^a-z0-9_]/', '_', $rawName);
        $uniqueName = substr($cleanName, 0, 45) . '_' . substr(md5((string)microtime(true)), 0, 6);

        $category = strtoupper($templateData['category'] ?? 'UTILITY');
        if (!in_array($category, ['MARKETING', 'UTILITY', 'AUTHENTICATION'])) {
            $category = 'UTILITY';
        }

        $payload = [
            'name' => $uniqueName,
            'language' => $templateData['language'] ?? 'en_US',
            'category' => $category,
            'components' => [],
        ];

        if (!empty($templateData['header'])) {
            $payload['components'][] = [
                'type' => 'HEADER',
                'format' => 'TEXT',
                'text' => $templateData['header'],
            ];
        }

        $bodyComponent = [
            'type' => 'BODY',
            'text' => $templateData['body'],
        ];

        if (preg_match_all('/\{\{(\d+)\}\}/', $templateData['body'], $matches)) {
            $uniqueMatches = array_values(array_unique($matches[1]));
            sort($uniqueMatches);
            $sampleValues = array_map(function ($i) {
                return "Sample {$i}";
            }, $uniqueMatches);
            $bodyComponent['example'] = ['body_text' => [$sampleValues]];
        }

        $payload['components'][] = $bodyComponent;

        if (!empty($templateData['footer'])) {
            $payload['components'][] = [
                'type' => 'FOOTER',
                'text' => $templateData['footer'],
            ];
        }

        if (!empty($templateData['buttons']) && is_array($templateData['buttons'])) {
            $payload['components'][] = [
                'type' => 'BUTTONS',
                'buttons' => array_map(function ($b) {
                    return [
                        'type' => strtoupper($b['type'] ?? 'QUICK_REPLY'),
                        'text' => $b['text'] ?? 'Button',
                    ];
                }, $templateData['buttons']),
            ];
        }

        $response = Http::withToken($this->systemUserToken)
            ->post($this->getApiUrl("{$wabaId}/message_templates"), $payload);

        return $response->json();
    }

    public function getTemplateStatus(string $wabaId = null): array
    {
        $wabaId = $wabaId ?: $this->wabaId;
        $response = Http::withToken($this->systemUserToken)
            ->get($this->getApiUrl("{$wabaId}/message_templates"));
        return $response->json();
    }

    public function getPhoneVerificationStatus(string $phoneNumbersId): array
    {
        $response = Http::withToken($this->systemUserToken)
            ->get($this->getApiUrl("{$phoneNumbersId}"));
        return $response->json();
    }
}
