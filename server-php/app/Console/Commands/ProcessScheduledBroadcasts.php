<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ScheduledBroadcast;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Template;
use App\Models\WhatsappNumber;
use App\Services\WhatsAppService;
use Illuminate\Support\Facades\Log;

use Illuminate\Support\Facades\DB;

class ProcessScheduledBroadcasts extends Command
{
    protected $signature = 'app:process-scheduled-broadcasts';
    protected $description = 'Process and send pending scheduled broadcasts';

    public function handle()
    {
        $now = now();
        $broadcasts = ScheduledBroadcast::whereIn('status', ['pending', 'scheduled'])
            ->where('scheduled_at', '<=', $now)
            ->get();

        if ($broadcasts->isEmpty()) {
            $this->info('No due scheduled broadcasts found.');
            return 0;
        }

        $waService = new WhatsAppService();

        foreach ($broadcasts as $broadcast) {
            $this->info("Processing scheduled broadcast ID: {$broadcast->id} ({$broadcast->template_name})");
            $broadcast->update(['status' => 'processing']);

            try {
                // Get target contacts
                $contactIds = $broadcast->contact_ids;
                if (is_string($contactIds)) {
                    $contactIds = json_decode($contactIds, true);
                }

                if (!empty($contactIds) && is_array($contactIds)) {
                    $contacts = Contact::whereIn('id', $contactIds)
                        ->where('owner_id', $broadcast->owner_id)
                        ->get();
                } else {
                    $contacts = Contact::where('owner_id', $broadcast->owner_id)->get();
                }

                // Get owner's WhatsApp credentials
                $waNumber = WhatsappNumber::where('owner_id', $broadcast->owner_id)
                    ->where('verified', true)
                    ->first();
                $token = $waNumber ? $waNumber->access_token : null;
                $numId = $waNumber ? ($waNumber->phone_number_id ?: $waNumber->waba_id) : null;

                $sentCount = 0;
                $failCount = 0;
                $messageLogs = [];

                $tpl = null;
                if ($broadcast->template_id) {
                    $tpl = Template::find($broadcast->template_id);
                }
                $languageCode = ($tpl && !empty($tpl->language)) ? $tpl->language : 'en';

                foreach ($contacts as $contact) {
                    $cleanPhone = preg_replace('/[\s\-()+]/', '', (string)$contact->phone);
                    if (strlen($cleanPhone) === 10 && !str_starts_with($cleanPhone, '91')) {
                        $cleanPhone = '91' . $cleanPhone;
                    }

                    // Dynamic Parameters (Fixes Ticket 02)
                    $parameters = $this->buildParameters($tpl, $contact);

                    try {
                        $res = $waService->sendTemplateMessage(
                            $cleanPhone,
                            $broadcast->template_name,
                            $languageCode,
                            $parameters,
                            $token,
                            $numId
                        );

                        $waMsgId = $res['messages'][0]['id'] ?? null;
                        $messageLogs[] = [
                            'owner_id' => $broadcast->owner_id,
                            'contact_id' => $contact->id,
                            'direction' => 'outbound',
                            'body' => "Template: {$broadcast->template_name}",
                            'template_id' => $broadcast->template_id,
                            'wa_message_id' => $waMsgId,
                            'status' => 'sent',
                            'message_type' => 'template',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                        $sentCount++;
                    } catch (\Exception $e) {
                        Log::error("Scheduled broadcast failed for {$cleanPhone}: " . $e->getMessage());
                        $messageLogs[] = [
                            'owner_id' => $broadcast->owner_id,
                            'contact_id' => $contact->id,
                            'direction' => 'outbound',
                            'body' => "Template: {$broadcast->template_name}",
                            'template_id' => $broadcast->template_id,
                            'wa_message_id' => null,
                            'status' => 'failed',
                            'message_type' => 'template',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                        $failCount++;
                    }
                    usleep(15000); // 15ms rate limit pause
                }

                // Chunked DB Bulk Logging (Fixes Ticket 06)
                if (!empty($messageLogs)) {
                    foreach (array_chunk($messageLogs, 100) as $chunk) {
                        DB::table('messages')->insert($chunk);
                    }
                }

                $broadcast->update(['status' => 'completed']);
                $this->info("Completed broadcast ID {$broadcast->id}: Sent {$sentCount}, Failed {$failCount}");
            } catch (\Exception $e) {
                Log::error("Scheduled broadcast {$broadcast->id} exception: " . $e->getMessage());
                $broadcast->update(['status' => 'failed']);
            }
        }

        return 0;
    }

    private function buildParameters($template, $contact): array
    {
        if (!$template || !isset($template->body) || empty($template->body)) {
            return [];
        }

        $parameters = [];
        if (preg_match_all('/\{\{(\d+)\}\}/', $template->body, $matches)) {
            $uniqueMatches = array_values(array_unique($matches[1]));
            sort($uniqueMatches);

            $customFields = [];
            if (is_array($contact->custom_fields)) {
                $customFields = $contact->custom_fields;
            } elseif (is_string($contact->custom_fields)) {
                $customFields = json_decode($contact->custom_fields, true) ?: [];
            }

            foreach ($uniqueMatches as $index => $matchNum) {
                $varKey = "var_" . ($index + 1);
                $val = '';

                if ($index === 0 && !empty($contact->name)) {
                    $val = $contact->name;
                } elseif ($index === 1 && !empty($contact->phone)) {
                    $val = $contact->phone;
                } elseif ($index === 2 && !empty($contact->company)) {
                    $val = $contact->company;
                } elseif (!empty($customFields[$varKey])) {
                    $val = $customFields[$varKey];
                } else {
                    $val = $contact->name ?: 'Customer';
                }

                $parameters[] = ['type' => 'text', 'text' => (string)$val];
            }
        }

        return $parameters;
    }
}
