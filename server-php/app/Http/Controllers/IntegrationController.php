<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\Integration;
use App\Models\Contact;
use App\Models\Message;
use App\Services\WhatsAppService;
use App\Services\GroqAiService;

class IntegrationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $integrations = Integration::where('owner_id', $user->id)->get();
        return response()->json($integrations);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:telegram,n8n,zapier,webhook',
            'name' => 'required|string|max:255',
            'config' => 'nullable|array',
        ]);

        $user = $request->user();

        $integration = Integration::create([
            'owner_id' => $user->id,
            'type' => $validated['type'],
            'name' => $validated['name'],
            'config' => $validated['config'] ?? [],
        ]);

        return response()->json($integration, 201);
    }

    public function update(Request $request, int $id)
    {
        $user = $request->user();
        $integration = Integration::where('id', $id)->where('owner_id', $user->id)->first();

        if (!$integration) {
            return response()->json(['error' => 'Integration not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'config' => 'nullable|array',
            'active' => 'sometimes|boolean',
        ]);

        $integration->update($validated);

        return response()->json($integration);
    }

    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $integration = Integration::where('id', $id)->where('owner_id', $user->id)->first();

        if (!$integration) {
            return response()->json(['error' => 'Integration not found'], 404);
        }

        $integration->delete();
        return response()->json(['message' => 'Integration deleted']);
    }

    public function setupTelegram(Request $request)
    {
        $validated = $request->validate([
            'bot_token' => 'required|string',
        ]);

        $user = $request->user();

        // Validate bot token
        try {
            $response = Http::get("https://api.telegram.org/bot{$validated['bot_token']}/getMe");
            $botData = $response->json();

            if (!$botData['ok']) {
                return response()->json(['error' => 'Invalid bot token'], 400);
            }

            // Set webhook
            $webhookUrl = url('/api/integrations/telegram/webhook');
            Http::get("https://api.telegram.org/bot{$validated['bot_token']}/setWebhook", [
                'url' => $webhookUrl,
            ]);

            $integration = Integration::create([
                'owner_id' => $user->id,
                'type' => 'telegram',
                'name' => $botData['result']['username'] ?? 'Telegram Bot',
                'config' => [
                    'bot_token' => $validated['bot_token'],
                    'bot_username' => $botData['result']['username'] ?? '',
                    'bot_name' => $botData['result']['first_name'] ?? '',
                ],
            ]);

            return response()->json([
                'message' => 'Telegram bot connected',
                'integration' => $integration,
                'bot' => $botData['result'],
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to setup Telegram: ' . $e->getMessage()], 500);
        }
    }

    public function telegramWebhook(Request $request)
    {
        $update = $request->all();

        $message = $update['message'] ?? null;
        if (!$message) return response()->json(['status' => 'ok']);

        $chatId = $message['chat']['id'] ?? null;
        $text = $message['text'] ?? null;
        $from = $message['from'] ?? null;

        if (!$chatId || !$text) return response()->json(['status' => 'ok']);

        // Find integration by bot
        $integration = Integration::where('type', 'telegram')
            ->where('active', true)
            ->first();

        if (!$integration) return response()->json(['status' => 'ok']);

        $ownerId = $integration->owner_id;
        $phone = "tg_{$chatId}";

        // Find or create contact
        $contact = Contact::where('owner_id', $ownerId)
            ->where('phone', $phone)
            ->first();

        if (!$contact) {
            $contact = Contact::create([
                'owner_id' => $ownerId,
                'name' => ($from['first_name'] ?? '') . ' ' . ($from['last_name'] ?? ''),
                'phone' => $phone,
            ]);
        }

        // Save inbound message
        Message::create([
            'owner_id' => $ownerId,
            'contact_id' => $contact->id,
            'direction' => 'inbound',
            'body' => $text,
            'status' => 'received',
        ]);

        // Generate reply
        $reply = $this->generateTelegramReply($text, $ownerId);

        // Send reply
        $botToken = $integration->config['bot_token'] ?? null;
        if ($botToken && $reply) {
            Http::get("https://api.telegram.org/bot{$botToken}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $reply,
            ]);

            Message::create([
                'owner_id' => $ownerId,
                'contact_id' => $contact->id,
                'direction' => 'outbound',
                'body' => $reply,
                'status' => 'sent',
            ]);
        }

        return response()->json(['status' => 'ok']);
    }

    private function generateTelegramReply(string $message, int $ownerId): string
    {
        $lowerMessage = strtolower(trim($message));

        // Check for commands
        if ($lowerMessage === '/start' || $lowerMessage === '/help') {
            return "Welcome to V ONE DIGITALS! 🚀\n\nWe offer:\n• Web Development\n• WordPress Solutions\n• Digital Marketing\n• Branding & Design\n• Bulk Messaging\n• Coaching & Training\n\nType your message to get started!";
        }

        if ($lowerMessage === '/services') {
            return "Our Services:\n\n1. 🌐 Full Stack Web Development\n2. 📱 WordPress Development\n3. 📢 Digital Marketing\n4. 🎨 Branding & Design\n5. 💬 Bulk WhatsApp Messaging\n6. 📚 Coaching & Training\n\nSelect a service to learn more!";
        }

        // Use Groq AI for other messages
        $groqService = new GroqAiService();
        return $groqService->generateResponse($message);
    }

    public function setTelegramWebhook(Request $request)
    {
        $validated = $request->validate([
            'integration_id' => 'required|integer',
        ]);

        $user = $request->user();
        $integration = Integration::where('id', $validated['integration_id'])
            ->where('owner_id', $user->id)
            ->where('type', 'telegram')
            ->first();

        if (!$integration) {
            return response()->json(['error' => 'Integration not found'], 404);
        }

        $botToken = $integration->config['bot_token'] ?? null;
        if (!$botToken) {
            return response()->json(['error' => 'Bot token not configured'], 400);
        }

        $webhookUrl = url('/api/integrations/telegram/webhook');
        $response = Http::get("https://api.telegram.org/bot{$botToken}/setWebhook", [
            'url' => $webhookUrl,
        ]);

        return response()->json(['message' => 'Webhook set', 'result' => $response->json()]);
    }

    public function n8nWebhook(Request $request)
    {
        $body = $request->all();
        $action = $body['action'] ?? null;

        match ($action) {
            'send_message' => $this->n8nSendMessage($body),
            'get_contacts' => $this->n8nGetContacts($body),
            'get_messages' => $this->n8nGetMessages($body),
            default => null,
        };

        return response()->json(['status' => 'ok']);
    }

    private function n8nSendMessage(array $body): void
    {
        // Implementation for n8n send message
    }

    private function n8nGetContacts(array $body): void
    {
        // Implementation for n8n get contacts
    }

    private function n8nGetMessages(array $body): void
    {
        // Implementation for n8n get messages
    }
}
