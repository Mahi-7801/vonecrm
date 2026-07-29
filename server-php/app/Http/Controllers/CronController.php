<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use App\Services\SettingService;

class CronController extends Controller
{
    private function verifyToken(Request $request): bool
    {
        $token = $request->query('token') ?: $request->header('X-Cron-Token');
        $expectedToken = SettingService::get('WHATSAPP_CRON_SECRET') ?: env('WHATSAPP_CRON_SECRET', 'mahi_cron_secret_2026');

        return !empty($token) && $token === $expectedToken;
    }

    public function processScheduledBroadcasts(Request $request)
    {
        if (!$this->verifyToken($request)) {
            return response()->json(['error' => 'Unauthorized cron request'], 401);
        }

        Artisan::call('app:process-scheduled-broadcasts');
        $output = Artisan::output();

        return response()->json([
            'status' => 'ok',
            'command' => 'app:process-scheduled-broadcasts',
            'output' => trim($output),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function processDripSequences(Request $request)
    {
        if (!$this->verifyToken($request)) {
            return response()->json(['error' => 'Unauthorized cron request'], 401);
        }

        Artisan::call('app:process-drip-sequences');
        $output = Artisan::output();

        return response()->json([
            'status' => 'ok',
            'command' => 'app:process-drip-sequences',
            'output' => trim($output),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function processExpiryAlerts(Request $request)
    {
        if (!$this->verifyToken($request)) {
            return response()->json(['error' => 'Unauthorized cron request'], 401);
        }

        Artisan::call('app:process-expiry-alerts');
        $output = Artisan::output();

        return response()->json([
            'status' => 'ok',
            'command' => 'app:process-expiry-alerts',
            'output' => trim($output),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function processAll(Request $request)
    {
        if (!$this->verifyToken($request)) {
            return response()->json(['error' => 'Unauthorized cron request'], 401);
        }

        Artisan::call('app:process-scheduled-broadcasts');
        $broadcastOut = Artisan::output();

        Artisan::call('app:process-drip-sequences');
        $dripOut = Artisan::output();

        Artisan::call('app:process-expiry-alerts');
        $expiryOut = Artisan::output();

        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
            'results' => [
                'scheduled_broadcasts' => trim($broadcastOut),
                'drip_sequences' => trim($dripOut),
                'expiry_alerts' => trim($expiryOut),
            ],
        ]);
    }
}
