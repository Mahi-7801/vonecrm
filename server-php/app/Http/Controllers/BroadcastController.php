<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Message;
use App\Models\Contact;
use App\Models\Template;
use App\Models\WhatsappNumber;
use App\Models\UsageLog;
use App\Models\PricingConfig;
use App\Models\ScheduledBroadcast;
use App\Models\Campaign;
use App\Jobs\SendBroadcastJob;
use App\Services\WhatsAppService;

class BroadcastController extends Controller
{
    public function send(Request $request)
    {
        $validated = $request->validate([
            'contact_ids' => 'nullable|array',
            'template_id' => 'nullable|integer',
            'template_name' => 'nullable|string',
            'scheduled_at' => 'nullable|date',
            'custom_param_values' => 'nullable|array',
        ]);

        $user = $request->user();
        $template = null;

        if (!empty($validated['template_id'])) {
            $template = Template::find($validated['template_id']);
        }

        if (!$template && !empty($validated['template_name'])) {
            $template = Template::where('name', $validated['template_name'])->first();
        }

        $templateName = $template ? $template->name : ($validated['template_name'] ?? null);

        if (!$templateName) {
            return response()->json(['error' => 'Template name or ID is required'], 400);
        }

        if (!empty($validated['contact_ids'])) {
            $contacts = Contact::whereIn('id', $validated['contact_ids'])
                ->where('owner_id', $user->id)
                ->get();
        } else {
            $contacts = Contact::where('owner_id', $user->id)->get();
        }

        if ($contacts->isEmpty()) {
            return response()->json(['error' => 'No contacts selected or found'], 400);
        }

        // Pre-calculate cost and reserve balance upfront for prepaid users (Fixes Ticket 05)
        $costPerMsg = PricingConfig::getRate($template ? $template->category : 'marketing');
        $targetCount = count($contacts);
        $totalCost = $costPerMsg * $targetCount;

        if ($user->credit_mode === 'prepaid') {
            if (floatval($user->balance) < $totalCost) {
                return response()->json([
                    'error' => "Insufficient wallet balance. Total campaign cost: ₹{$totalCost}, Balance: ₹{$user->balance}"
                ], 402);
            }
            // Pre-reserve total campaign cost upfront
            $user->decrement('balance', $totalCost);
        }

        // Schedule broadcast for later
        if (!empty($validated['scheduled_at'])) {
            $broadcast = ScheduledBroadcast::create([
                'owner_id' => $user->id,
                'template_id' => $template ? $template->id : null,
                'template_name' => $templateName,
                'contact_ids' => $validated['contact_ids'] ?? [],
                'status' => 'pending',
                'scheduled_at' => $validated['scheduled_at'],
            ]);

            return response()->json([
                'message' => 'Broadcast scheduled successfully',
                'broadcast' => $broadcast,
            ]);
        }

        // Check WhatsApp API Credentials
        $waNumber = WhatsappNumber::where('owner_id', $user->id)
            ->where('verified', true)
            ->first();

        $token = $waNumber ? $waNumber->access_token : (config('whatsapp.system_user_token') ?: env('WHATSAPP_SYSTEM_USER_TOKEN'));
        $numId = $waNumber ? ($waNumber->phone_number_id ?: $waNumber->waba_id) : (config('whatsapp.phone_number_id') ?: (config('whatsapp.waba_id') ?: env('WHATSAPP_PHONE_NUMBER_ID')));

        if (empty($token) || empty($numId)) {
            return response()->json(['error' => 'WhatsApp API credentials not configured'], 400);
        }

        // Create Campaign record for job tracking
        $campaign = Campaign::create([
            'owner_id' => $user->id,
            'name' => $templateName,
            'template_id' => $template ? $template->id : null,
            'contact_ids' => $validated['contact_ids'] ?? [],
            'status' => 'running',
            'total_contacts' => count($contacts),
            'sent_count' => 0,
            'failed_count' => 0,
        ]);

        // Dispatch async background sending job (Fixes Ticket 01 - 504 Timeout)
        SendBroadcastJob::dispatchAfterResponse(
            $user,
            $template,
            $templateName,
            $contacts,
            $token,
            $numId,
            $campaign->id,
            $request->input('custom_param_values', [])
        );

        // Immediate 202 Accepted HTTP response to UI
        return response()->json([
            'message' => 'Broadcast job started in background',
            'job_id' => $campaign->id,
            'total_contacts' => count($contacts),
            'status' => 'processing',
        ], 202);
    }

    public function getJobStatus(Request $request, int $id)
    {
        $user = $request->user();
        $campaign = Campaign::where('id', $id)->where('owner_id', $user->id)->first();
        if (!$campaign) {
            return response()->json(['error' => 'Broadcast job not found'], 404);
        }

        return response()->json([
            'job_id' => $campaign->id,
            'total' => $campaign->total_contacts,
            'sent' => $campaign->sent_count,
            'failed' => $campaign->failed_count,
            'status' => $campaign->status === 'running' ? 'processing' : $campaign->status,
        ]);
    }

    public function status(Request $request)
    {
        $user = $request->user();

        $statuses = Message::where('owner_id', $user->id)
            ->where('direction', 'outbound')
            ->select('status', \DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->get();

        return response()->json($statuses);
    }

    public function history(Request $request)
    {
        $user = $request->user();

        $messages = Message::with('template')
            ->where('owner_id', $user->id)
            ->where('direction', 'outbound')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json($messages);
    }

    public function scheduled(Request $request)
    {
        $user = $request->user();

        $scheduled = ScheduledBroadcast::where('owner_id', $user->id)
            ->whereIn('status', ['pending', 'scheduled'])
            ->orderBy('scheduled_at', 'desc')
            ->get();

        return response()->json($scheduled);
    }

    public function schedule(Request $request)
    {
        $validated = $request->validate([
            'contact_ids' => 'nullable|array',
            'template_id' => 'nullable|integer',
            'template_name' => 'nullable|string',
            'scheduled_at' => 'required|string',
        ]);

        $user = $request->user();
        $template = null;

        if (!empty($validated['template_id'])) {
            $template = Template::find($validated['template_id']);
        }

        if (!$template && !empty($validated['template_name'])) {
            $template = Template::where('name', $validated['template_name'])->first();
        }

        $templateName = $template ? $template->name : ($validated['template_name'] ?? null);

        if (!$templateName) {
            return response()->json(['error' => 'Template name or ID is required'], 400);
        }

        $broadcast = ScheduledBroadcast::create([
            'owner_id' => $user->id,
            'template_id' => $template ? $template->id : null,
            'template_name' => $templateName,
            'contact_ids' => $validated['contact_ids'] ?? [],
            'status' => 'pending',
            'scheduled_at' => $validated['scheduled_at'],
        ]);

        return response()->json($broadcast, 201);
    }

    public function cancelScheduled(Request $request, int $id)
    {
        $user = $request->user();
        $broadcast = ScheduledBroadcast::where('id', $id)
            ->where('owner_id', $user->id)
            ->whereIn('status', ['pending', 'scheduled'])
            ->first();

        if (!$broadcast) {
            return response()->json(['error' => 'Broadcast not found or not cancellable'], 404);
        }

        $broadcast->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Broadcast cancelled']);
    }
}

