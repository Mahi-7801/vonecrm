<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Message;
use App\Models\Contact;
use App\Models\WhatsappNumber;
use App\Models\UsageLog;
use App\Models\PricingConfig;
use App\Services\WhatsAppService;

class MessageController extends Controller
{
    public function inbox(Request $request)
    {
        $user = $request->user();

        $conversations = Message::select('contact_id', DB::raw('MAX(id) as last_message_id'))
            ->where('owner_id', $user->id)
            ->groupBy('contact_id')
            ->orderByDesc('last_message_id')
            ->get();

        $result = [];
        foreach ($conversations as $conv) {
            $contact = Contact::find($conv->contact_id);
            $lastMessage = Message::with('template')->find($conv->last_message_id);

            if ($contact && $lastMessage) {
                $result[] = [
                    'contact' => $contact,
                    'last_message' => $lastMessage,
                ];
            }
        }

        return response()->json($result);
    }

    public function thread(Request $request, int $contactId)
    {
        $user = $request->user();

        $messages = Message::with('template')
            ->where('owner_id', $user->id)
            ->where('contact_id', $contactId)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($messages);
    }

    public function send(Request $request)
    {
        $validated = $request->validate([
            'contact_id' => 'required|integer',
            'body' => 'nullable|string',
            'template_id' => 'nullable|integer',
            'message_type' => 'nullable|string',
            'media_url' => 'nullable|string',
        ]);

        $user = $request->user();
        $contact = Contact::where('id', $validated['contact_id'])
            ->where('owner_id', $user->id)
            ->first();

        if (!$contact) {
            return response()->json(['error' => 'Contact not found'], 404);
        }

        $waNumber = WhatsappNumber::where('owner_id', $user->id)
            ->where('verified', true)
            ->first();

        if (!$waNumber) {
            return response()->json(['error' => 'No verified WhatsApp number found'], 400);
        }

        $waService = new WhatsAppService();
        $cleanPhone = $this->cleanPhone($contact->phone);
        $token = $waNumber->access_token ?: config('whatsapp.system_user_token');

        try {
            $result = null;

            if (!empty($validated['template_id'])) {
                // Send template message
                $template = \App\Models\Template::find($validated['template_id']);
                if ($template) {
                    $parameters = null;
                    if ($template->body && preg_match_all('/\{\{(\d+)\}\}/', $template->body, $matches)) {
                        $parameters = array_map(fn($i) => $i == 1 ? $contact->name : ($contact->phone ?? "Value {$i}"), $matches[1]);
                    }
                    $result = $waService->sendTemplateMessage($cleanPhone, $template->name, $template->language, $parameters, $token, $waNumber->phone_number_id);
                }
            } else {
                // Send text message
                $result = $waService->sendTextMessage($cleanPhone, $validated['body'], $token, $waNumber->phone_number_id);
            }

            $waMessageId = $result['messages'][0]['id'] ?? null;

            $message = Message::create([
                'owner_id' => $user->id,
                'contact_id' => $contact->id,
                'direction' => 'outbound',
                'body' => $validated['body'] ?? null,
                'template_id' => $validated['template_id'] ?? null,
                'wa_message_id' => $waMessageId,
                'status' => 'sent',
                'message_type' => $validated['message_type'] ?? 'text',
                'media_url' => $validated['media_url'] ?? null,
            ]);

            // Log usage cost
            $category = 'message';
            if (!empty($validated['template_id'])) {
                $template = \App\Models\Template::find($validated['template_id']);
                $category = $template->category ?? 'utility';
            }
            $cost = PricingConfig::getRate($category);

            UsageLog::create([
                'owner_id' => $user->id,
                'message_id' => $message->id,
                'category' => $category,
                'cost' => $cost,
            ]);

            // Deduct balance for prepaid users
            if ($user->credit_mode === 'prepaid') {
                $user->decrement('balance', $cost);
            }

            return response()->json($message, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to send message: ' . $e->getMessage()], 500);
        }
    }

    public function uploadMedia(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:16384',
        ]);

        $user = $request->user();
        $file = $request->file('file');

        // Store file locally in public/uploads/media
        $destinationPath = public_path('uploads/media');
        if (!file_exists($destinationPath)) {
            mkdir($destinationPath, 0777, true);
        }

        $filename = time() . '-' . rand(100000, 999999) . '.' . $file->getClientOriginalExtension();
        $file->move($destinationPath, $filename);
        $fileUrl = "/uploads/media/{$filename}";
        $fullPath = $destinationPath . '/' . $filename;
        $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';

        $mediaType = 'document';
        if (str_contains($mimeType, 'image')) {
            $mediaType = 'image';
        } elseif (str_contains($mimeType, 'video')) {
            $mediaType = 'video';
        } elseif (str_contains($mimeType, 'audio')) {
            $mediaType = 'audio';
        }

        // Upload to Meta WhatsApp if number exists (best effort)
        $mediaId = null;
        try {
            $waNumber = WhatsappNumber::where('owner_id', $user->id)
                ->where('verified', true)
                ->first();

            if ($waNumber) {
                $waService = new WhatsAppService();
                $token = $waNumber->access_token ?: config('whatsapp.system_user_token');
                $mediaId = $waService->uploadMedia($fullPath, $mimeType, $token);
            }
        } catch (\Exception $e) {
            // Ignore Meta upload error for local preview
        }

        return response()->json([
            'file_url' => $fileUrl,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => filesize($fullPath),
            'mime_type' => $mimeType,
            'media_type' => $mediaType,
            'media_id' => $mediaId,
        ]);
    }

    private function cleanPhone(string $phone): string
    {
        $clean = preg_replace('/[\s\-()+]/', '', $phone);
        if (!str_starts_with($clean, '91') && strlen($clean) === 10) {
            $clean = '91' . $clean;
        }
        return $clean;
    }
}
