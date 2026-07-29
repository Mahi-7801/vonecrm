<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

use App\Services\SettingService;

class GroqAiService
{
    private string $apiKey;
    private string $model;
    private string $apiUrl;

    public function __construct()
    {
        $this->apiKey = SettingService::get('GROQ_API_KEY') ?: (config('services.groq.api_key') ?: env('GROQ_API_KEY', ''));
        $this->model = config('services.groq.model', 'llama-3.3-70b-versatile');
        $this->apiUrl = config('services.groq.api_url', 'https://api.groq.com/openai/v1/chat/completions');
    }

    public function generateResponse(string $userMessage, string $systemPrompt = '', array $context = []): string
    {
        try {
            $messages = [];

            if ($systemPrompt) {
                $messages[] = ['role' => 'system', 'content' => $systemPrompt];
            } else {
                $messages[] = [
                    'role' => 'system',
                    'content' => 'You are a helpful customer support agent for V ONE DIGITALS, a digital services company. Be professional, friendly, and concise. Help customers with their inquiries about web development, digital marketing, WordPress, branding, and bulk messaging services.',
                ];
            }

            if (!empty($context['website_data'])) {
                $messages[] = [
                    'role' => 'system',
                    'content' => "Additional context from website: {$context['website_data']}",
                ];
            }

            $messages[] = ['role' => 'user', 'content' => $userMessage];

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->apiKey}",
                'Content-Type' => 'application/json',
            ])->timeout(30)->post($this->apiUrl, [
                'model' => $this->model,
                'messages' => $messages,
                'max_tokens' => 500,
                'temperature' => 0.7,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['choices'][0]['message']['content'] ?? 'I apologize, but I could not generate a response at this time.';
            }

            Log::error('Groq API error: ' . $response->body());
            return 'I apologize, but I am experiencing technical difficulties. Please try again later.';
        } catch (\Exception $e) {
            Log::error('Groq AI error: ' . $e->getMessage());
            return 'I apologize, but I am currently unavailable. Please try again later.';
        }
    }

    public function generateFlowResponse(string $userMessage, string $agentPrompt, string $websiteData = ''): string
    {
        $context = [];
        if ($websiteData) {
            $context['website_data'] = $websiteData;
        }

        return $this->generateResponse($userMessage, $agentPrompt, $context);
    }
}
