<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\DripSequence;
use App\Models\Contact;
use App\Models\Message;
use App\Models\WhatsappNumber;
use App\Services\WhatsAppService;
use Illuminate\Support\Facades\Log;

class ProcessDripSequences extends Command
{
    protected $signature = 'app:process-drip-sequences';
    protected $description = 'Process active drip sequence steps for contacts';

    public function handle()
    {
        $activeSequences = DripSequence::where('active', true)->get();

        if ($activeSequences->isEmpty()) {
            $this->info('No active drip sequences.');
            return 0;
        }

        $waService = new WhatsAppService();

        foreach ($activeSequences as $sequence) {
            $steps = is_string($sequence->steps) ? json_decode($sequence->steps, true) : ($sequence->steps ?? []);
            if (empty($steps) || !is_array($steps)) continue;

            $contacts = Contact::where('owner_id', $sequence->owner_id)->get();

            $waNumber = WhatsappNumber::where('owner_id', $sequence->owner_id)
                ->where('verified', true)
                ->first();
            $token = $waNumber ? $waNumber->access_token : null;
            $numId = $waNumber ? ($waNumber->phone_number_id ?: $waNumber->waba_id) : null;

            foreach ($contacts as $contact) {
                // Determine contact registration or enrollment time
                $enrolledAt = $contact->created_at ?: now();
                $hoursElapsed = now()->diffInHours($enrolledAt);

                foreach ($steps as $stepIndex => $step) {
                    $requiredDelay = (int)($step['delay'] ?? 0);
                    if ($hoursElapsed >= $requiredDelay) {
                        // Check if step message was already sent to this contact
                        $alreadySent = Message::where('owner_id', $sequence->owner_id)
                            ->where('contact_id', $contact->id)
                            ->where('direction', 'outbound')
                            ->where('body', 'LIKE', "%[Drip #{$sequence->id}-S{$stepIndex}]%")
                            ->exists();

                        if (!$alreadySent) {
                            $cleanPhone = preg_replace('/[\s\-()+]/', '', (string)$contact->phone);
                            if (strlen($cleanPhone) === 10 && !str_starts_with($cleanPhone, '91')) {
                                $cleanPhone = '91' . $cleanPhone;
                            }

                            $msgText = str_replace('{{1}}', $contact->name ?: 'Customer', $step['message'] ?? '');
                            $msgWithTag = "{$msgText}\n[Drip #{$sequence->id}-S{$stepIndex}]";

                            try {
                                if (!empty($step['template_name'])) {
                                    $waService->sendTemplateMessage($cleanPhone, $step['template_name'], 'en_US', [], $token, $numId);
                                } else {
                                    $waService->sendTextMessage($cleanPhone, $msgText, $token, $numId);
                                }

                                Message::create([
                                    'owner_id' => $sequence->owner_id,
                                    'contact_id' => $contact->id,
                                    'direction' => 'outbound',
                                    'body' => $msgWithTag,
                                    'status' => 'sent',
                                ]);
                                $this->info("Sent Drip Step {$stepIndex} to contact {$contact->id}");
                            } catch (\Exception $e) {
                                Log::error("Drip step send error for contact {$contact->id}: " . $e->getMessage());
                            }
                        }
                    }
                }
            }
        }

        return 0;
    }
}
