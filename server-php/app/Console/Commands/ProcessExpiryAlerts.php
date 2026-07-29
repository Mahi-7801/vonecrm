<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Subscription;
use App\Models\User;
use App\Services\EmailService;
use Illuminate\Support\Facades\Log;

class ProcessExpiryAlerts extends Command
{
    protected $signature = 'app:process-expiry-alerts';
    protected $description = 'Check for expiring subscriptions and send warning emails';

    public function handle()
    {
        $today = now()->startOfDay();
        $inThreeDays = now()->addDays(3)->startOfDay();
        $inOneDay = now()->addDays(1)->startOfDay();

        // 1. Expiring in 3 days
        $expiring3Days = Subscription::where('status', 'active')
            ->whereDate('expires_at', $inThreeDays->toDateString())
            ->get();

        // 2. Expiring tomorrow
        $expiringTomorrow = Subscription::where('status', 'active')
            ->whereDate('expires_at', $inOneDay->toDateString())
            ->get();

        // 3. Expiring today / expired
        $expiredToday = Subscription::where('status', 'active')
            ->whereDate('expires_at', '<=', $today->toDateString())
            ->get();

        $emailService = new EmailService();
        $alertsCount = 0;

        foreach ($expiring3Days as $sub) {
            $user = User::find($sub->user_id);
            if ($user && $user->email) {
                $emailService->sendExpiryAlert($user->email, $user->name ?: 'User', 0, 'Your WhatsApp CRM subscription will expire in 3 days. Please renew to keep your automation active.');
                $alertsCount++;
            }
        }

        foreach ($expiringTomorrow as $sub) {
            $user = User::find($sub->user_id);
            if ($user && $user->email) {
                $emailService->sendExpiryAlert($user->email, $user->name ?: 'User', 0, 'URGENT: Your WhatsApp CRM subscription expires tomorrow!');
                $alertsCount++;
            }
        }

        foreach ($expiredToday as $sub) {
            $sub->update(['status' => 'expired']);
            $user = User::find($sub->user_id);
            if ($user && $user->email) {
                $emailService->sendExpiryAlert($user->email, $user->name ?: 'User', 0, 'Your WhatsApp CRM subscription has expired. Recharge or upgrade your plan to restore access.');
                $alertsCount++;
            }
        }

        $this->info("Processed expiry alerts: Sent {$alertsCount} notifications.");
        return 0;
    }
}
