<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Message;
use App\Models\Campaign;
use App\Models\UsageLog;
use App\Models\PricingConfig;
use App\Services\WhatsAppService;

class SendBroadcastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $user;
    protected $template;
    protected $templateName;
    protected $contacts;
    protected $token;
    protected $numId;
    protected $campaignId;
    protected $customParamValues;

    public function __construct($user, $template, string $templateName, $contacts, ?string $token, ?string $numId, int $campaignId, array $customParamValues = [])
    {
        $this->user = $user;
        $this->template = $template;
        $this->templateName = $templateName;
        $this->contacts = $contacts;
        $this->token = $token;
        $this->numId = $numId;
        $this->campaignId = $campaignId;
        $this->customParamValues = $customParamValues;
    }

    public function handle()
    {
        $campaign = Campaign::find($this->campaignId);
        if ($campaign) {
            $campaign->update(['status' => 'running']);
        }

        $waService = new WhatsAppService();
        $sent = 0;
        $failed = 0;
        $messageLogs = [];
        $usageLogs = [];
        $category = $this->template ? $this->template->category : 'marketing';
        $costPerMessage = PricingConfig::getRate($category);
        $languageCode = $this->template && !empty($this->template->language) ? $this->template->language : 'en';

        foreach ($this->contacts as $contact) {
            try {
                $cleanPhone = preg_replace('/[\s\-()+]/', '', (string)$contact->phone);
                if (strlen($cleanPhone) === 10 && !str_starts_with($cleanPhone, '91')) {
                    $cleanPhone = '91' . $cleanPhone;
                }

                // Build dynamic parameters (Fixes Hardcoded 'Value 3' Bug)
                $parameters = $this->buildParameters($this->template, $contact, $this->customParamValues);

                $result = $waService->sendTemplateMessage(
                    $cleanPhone,
                    $this->templateName,
                    $languageCode,
                    $parameters,
                    $this->token,
                    $this->numId
                );

                $waMessageId = $result['messages'][0]['id'] ?? null;

                $messageLogs[] = [
                    'owner_id' => $this->user->id,
                    'contact_id' => $contact->id,
                    'direction' => 'outbound',
                    'body' => "Template: {$this->templateName}",
                    'template_id' => $this->template ? $this->template->id : null,
                    'wa_message_id' => $waMessageId,
                    'status' => 'sent',
                    'message_type' => 'template',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $usageLogs[] = [
                    'owner_id' => $this->user->id,
                    'category' => $category,
                    'cost' => $costPerMessage,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $sent++;
            } catch (\Exception $e) {
                Log::error("Async bulk send error for contact ID {$contact->id}: " . $e->getMessage());

                $messageLogs[] = [
                    'owner_id' => $this->user->id,
                    'contact_id' => $contact->id,
                    'direction' => 'outbound',
                    'body' => "Template: {$this->templateName}",
                    'template_id' => $this->template ? $this->template->id : null,
                    'wa_message_id' => null,
                    'status' => 'failed',
                    'message_type' => 'template',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $failed++;
            }

            // Periodically update campaign progress
            if (($sent + $failed) % 10 === 0 && $campaign) {
                $campaign->update([
                    'sent_count' => $sent,
                    'failed_count' => $failed,
                ]);
            }

            usleep(15000); // 15ms rate limit pause
        }

        // Chunked DB Bulk Logging (Fixes DB Connection Exhaustion Bug - Ticket 06)
        if (!empty($messageLogs)) {
            foreach (array_chunk($messageLogs, 100) as $chunk) {
                DB::table('messages')->insert($chunk);
            }
        }

        if (!empty($usageLogs)) {
            foreach (array_chunk($usageLogs, 100) as $chunk) {
                DB::table('usage_log')->insert($chunk);
            }
        }

        if ($campaign) {
            $campaign->update([
                'sent_count' => $sent,
                'failed_count' => $failed,
                'status' => 'completed',
            ]);
        }
    }

    private function buildParameters($template, $contact, array $customParamValues = []): array
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

                if (!empty($customParamValues[$varKey])) {
                    $val = $customParamValues[$varKey];
                } elseif (!empty($customParamValues[(string)($index + 1)])) {
                    $val = $customParamValues[(string)($index + 1)];
                } elseif ($index === 0 && !empty($contact->name)) {
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
