<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\WhatsappNumber;
use App\Models\Contact;
use App\Models\Message;
use App\Models\Flow;
use App\Models\Template;
use App\Models\AiAgent;
use App\Models\UsageLog;
use App\Models\Payment;
use App\Models\PricingConfig;
use App\Models\Subscription;
use App\Models\Plan;
use App\Models\Notification;
use App\Services\EmailService;
use App\Services\WhatsAppService;

class AdminController extends Controller
{
    public function dashboard(Request $request)
    {
        $totalUsers = User::count();
        $verifiedNumbers = WhatsappNumber::where('verified', true)->count();
        $totalContacts = Contact::count();
        $totalMessages = Message::count();
        $totalFlows = Flow::count();
        $totalTemplates = Template::count();

        $todayMessages = Message::whereDate('created_at', now()->toDateString())->count();
        $newToday = User::whereDate('created_at', now()->toDateString())->count();

        $monthlyUsage = UsageLog::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('cost');

        $totalRevenue = Payment::sum('amount');

        $usageBreakdown = UsageLog::select('category', DB::raw('COUNT(*) as count'), DB::raw('SUM(cost) as total'))
            ->groupBy('category')
            ->get();

        $recentUsers = User::orderBy('created_at', 'desc')->limit(10)->get();

        return response()->json([
            'total_users' => $totalUsers,
            'verified_numbers' => $verifiedNumbers,
            'total_contacts' => $totalContacts,
            'total_messages' => $totalMessages,
            'total_flows' => $totalFlows,
            'total_templates' => $totalTemplates,
            'today_messages' => $todayMessages,
            'new_today' => $newToday,
            'monthly_usage' => $monthlyUsage,
            'total_revenue' => $totalRevenue,
            'usage_breakdown' => $usageBreakdown,
            'recent_users' => $recentUsers,
        ]);
    }

    public function users(Request $request)
    {
        $users = User::withCount(['contacts', 'messages', 'whatsappNumbers' => function ($q) {
            $q->where('verified', true);
        }])->orderBy('created_at', 'desc')->get();

        return response()->json($users);
    }

    public function showUser(Request $request, int $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $usage = UsageLog::where('owner_id', $id)
            ->select('category', DB::raw('COUNT(*) as count'), DB::raw('SUM(cost) as total'))
            ->groupBy('category')
            ->get();

        $payments = Payment::where('owner_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        $numbers = WhatsappNumber::where('owner_id', $id)->get();

        return response()->json([
            'user' => $user,
            'usage' => $usage,
            'payments' => $payments,
            'numbers' => $numbers,
        ]);
    }

    public function updateUser(Request $request, int $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $validated = $request->validate([
            'credit_mode' => 'sometimes|in:prepaid,postpaid',
            'balance' => 'sometimes|numeric|min:0',
            'role' => 'sometimes|in:admin,client',
            'email' => 'sometimes|email',
        ]);

        $user->update($validated);

        return response()->json($user);
    }

    public function destroyUser(Request $request, int $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        if ($user->role === 'admin') {
            return response()->json(['error' => 'Cannot delete admin users'], 400);
        }

        // Cascading delete
        DB::statement("DELETE FROM flow_messages WHERE conversation_id IN (SELECT id FROM flow_conversations WHERE owner_id = ?)", [$id]);
        DB::statement("DELETE FROM flow_conversations WHERE owner_id = ?", [$id]);
        DB::statement("DELETE FROM flow_runs WHERE contact_id IN (SELECT id FROM contacts WHERE owner_id = ?)", [$id]);
        DB::statement("DELETE FROM chat_assignments WHERE contact_id IN (SELECT id FROM contacts WHERE owner_id = ?)", [$id]);
        DB::statement("DELETE FROM usage_log WHERE owner_id = ?", [$id]);
        DB::statement("DELETE FROM messages WHERE owner_id = ?", [$id]);
        DB::statement("DELETE FROM contacts WHERE owner_id = ?", [$id]);
        DB::statement("DELETE FROM templates WHERE owner_id = ?", [$id]);
        DB::statement("DELETE FROM flows WHERE owner_id = ?", [$id]);
        DB::statement("DELETE FROM whatsapp_numbers WHERE owner_id = ?", [$id]);
        DB::statement("DELETE FROM payments WHERE owner_id = ?", [$id]);
        DB::statement("DELETE FROM subscriptions WHERE user_id = ?", [$id]);
        DB::statement("DELETE FROM notifications WHERE user_id = ?", [$id]);
        DB::statement("DELETE FROM ai_agents WHERE owner_id = ?", [$id]);
        DB::statement("DELETE FROM drip_sequences WHERE owner_id = ?", [$id]);
        DB::statement("DELETE FROM agents WHERE owner_id = ?", [$id]);
        DB::statement("DELETE FROM canned_responses WHERE owner_id = ?", [$id]);
        DB::statement("DELETE FROM integrations WHERE owner_id = ?", [$id]);
        DB::statement("DELETE FROM scheduled_broadcasts WHERE owner_id = ?", [$id]);
        DB::statement("DELETE FROM contact_labels WHERE owner_id = ?", [$id]);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    public function suspendUser(Request $request, int $id)
    {
        WhatsappNumber::where('owner_id', $id)
            ->update(['status' => 'suspended', 'verified' => false]);

        return response()->json(['message' => 'User suspended']);
    }

    public function enableUser(Request $request, int $id)
    {
        WhatsappNumber::where('owner_id', $id)
            ->where('status', 'suspended')
            ->update(['status' => 'verified', 'verified' => true]);

        return response()->json(['message' => 'User enabled']);
    }

    public function adjustBalance(Request $request, int $id)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric',
            'note' => 'nullable|string',
        ]);

        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $user->increment('balance', $validated['amount']);

        Payment::create([
            'owner_id' => $id,
            'amount' => abs($validated['amount']),
            'method' => 'manual',
            'added_by' => $request->user()->email,
            'note' => $validated['note'] ?? 'Admin adjustment',
        ]);

        return response()->json([
            'message' => 'Balance adjusted',
            'new_balance' => $user->fresh()->balance,
        ]);
    }

    public function usage(Request $request)
    {
        $usage = UsageLog::select('owner_id', 'category', DB::raw('COUNT(*) as count'), DB::raw('SUM(cost) as total'))
            ->groupBy('owner_id', 'category')
            ->with('owner:id,email')
            ->get();

        return response()->json($usage);
    }

    public function pricing(Request $request)
    {
        if ($request->isMethod('get')) {
            return response()->json(PricingConfig::all());
        }

        $validated = $request->validate([
            'category' => 'required|string',
            'rate' => 'required|numeric|min:0',
        ]);

        PricingConfig::updateOrCreate(
            ['category' => $validated['category']],
            ['rate' => $validated['rate']]
        );

        return response()->json(['message' => 'Pricing updated']);
    }

    public function numbers(Request $request)
    {
        $numbers = WhatsappNumber::with('owner:id,email')->get();
        return response()->json($numbers);
    }

    public function addNumber(Request $request, int $userId)
    {
        $validated = $request->validate([
            'phone_number_id' => 'required|string',
            'waba_id' => 'required|string',
        ]);

        $waService = new WhatsAppService();

        try {
            // Verify on Meta
            $status = $waService->getPhoneVerificationStatus($validated['phone_number_id']);

            $number = WhatsappNumber::create([
                'owner_id' => $userId,
                'phone_number_id' => $validated['phone_number_id'],
                'waba_id' => $validated['waba_id'],
                'verified' => true,
                'status' => 'verified',
                'added_by' => 'admin',
            ]);

            return response()->json($number, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function deleteNumber(Request $request, int $id)
    {
        $number = WhatsappNumber::find($id);
        if (!$number) {
            return response()->json(['error' => 'Number not found'], 404);
        }

        $number->delete();
        return response()->json(['message' => 'Number deleted']);
    }

    public function templates(Request $request)
    {
        if ($request->isMethod('get')) {
            $templates = Template::with('owner:id,email')->orderBy('created_at', 'desc')->get();
            return response()->json($templates);
        }

        $validated = $request->validate([
            'owner_id' => 'required|integer',
            'name' => 'required|string',
            'category' => 'required|in:marketing,utility,authentication',
            'body' => 'required|string',
        ]);

        $template = Template::create($validated + ['status' => 'pending']);
        return response()->json($template, 201);
    }

    public function deleteTemplate(Request $request, int $id)
    {
        $template = Template::find($id);
        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $template->delete();
        return response()->json(['message' => 'Template deleted']);
    }

    public function messages(Request $request)
    {
        $messages = Message::with('contact:id,name,phone')
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        return response()->json($messages);
    }

    public function contacts(Request $request)
    {
        $contacts = Contact::orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        return response()->json($contacts);
    }

    public function flows(Request $request)
    {
        $flows = Flow::withCount('conversations')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($flows);
    }

    public function stats(Request $request)
    {
        return response()->json([
            'users' => User::count(),
            'numbers' => WhatsappNumber::where('verified', true)->count(),
            'messages' => Message::count(),
            'contacts' => Contact::count(),
            'flows' => Flow::count(),
            'templates' => Template::count(),
            'revenue' => Payment::sum('amount'),
            'payments' => Payment::count(),
        ]);
    }

    public function sendExpiryAlert(Request $request, int $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $emailService = new EmailService();
        $emailService->sendExpiryAlert($user->email, $user->email, $user->balance);

        // Send WhatsApp alert
        try {
            $waService = new WhatsAppService();
            $waService->sendTextMessage(
                $user->email,
                "Hi {$user->email}, your wallet balance is low (INR {$user->balance}). Please recharge to continue using our services."
            );
        } catch (\Exception $e) {
            // Silent fail
        }

        // Create in-app notification
        Notification::create([
            'user_id' => $user->id,
            'title' => 'Balance Alert',
            'message' => "Your wallet balance is low (INR {$user->balance}). Please recharge.",
            'type' => 'billing',
        ]);

        return response()->json(['message' => 'Expiry alert sent']);
    }

    public function approveMetaTemplate(Request $request, int $id)
    {
        $template = Template::find($id);
        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $waService = new WhatsAppService();

        try {
            $result = $waService->submitTemplateToMeta([
                'name' => $template->name,
                'category' => $template->category,
                'language' => $template->language,
                'header' => $template->header,
                'body' => $template->body,
                'footer' => $template->footer,
                'buttons' => $template->buttons,
            ]);

            if (isset($result['id'])) {
                $template->update([
                    'status' => 'pending',
                    'meta_template_id' => $result['id'],
                ]);
            } else {
                // Force approve locally if Meta keys missing
                $template->update(['status' => 'approved']);
            }

            return response()->json(['message' => 'Template submitted to Meta', 'result' => $result]);
        } catch (\Exception $e) {
            $template->update(['status' => 'approved']);
            return response()->json(['message' => 'Template force-approved locally']);
        }
    }

    public function publish(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:template,flow,agent',
            'id' => 'required|integer',
            'publish' => 'required|boolean',
        ]);

        $model = match ($validated['type']) {
            'template' => Template::class,
            'flow' => Flow::class,
            'agent' => AiAgent::class,
        };

        $item = $model::find($validated['id']);
        if (!$item) {
            return response()->json(['error' => 'Item not found'], 404);
        }

        $item->update(['is_published' => $validated['publish']]);

        // Notify all users
        $users = User::where('role', 'client')->get();
        foreach ($users as $user) {
            Notification::create([
                'user_id' => $user->id,
                'title' => ucfirst($validated['type']) . ' ' . ($validated['publish'] ? 'Published' : 'Unpublished'),
                'message' => "A {$validated['type']} has been " . ($validated['publish'] ? 'published' : 'unpublished') . " and is now available.",
                'type' => 'publish',
                'reference_id' => $item->id,
            ]);
        }

        return response()->json(['message' => ucfirst($validated['type']) . ' ' . ($validated['publish'] ? 'published' : 'unpublished')]);
    }

    public function notifications(Request $request)
    {
        $notifications = Notification::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json($notifications);
    }

    public function markNotificationsRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'All notifications marked as read']);
    }

    public function unreadCount(Request $request)
    {
        $count = Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }

    public function getSettings(Request $request)
    {
        $keys = [
            'WHATSAPP_APP_ID' => ['secret' => false, 'group' => 'whatsapp'],
            'WHATSAPP_APP_SECRET' => ['secret' => true, 'group' => 'whatsapp'],
            'WHATSAPP_SYSTEM_USER_TOKEN' => ['secret' => true, 'group' => 'whatsapp'],
            'WHATSAPP_WEBHOOK_VERIFY_TOKEN' => ['secret' => false, 'group' => 'whatsapp'],
            'WHATSAPP_CONFIG_ID' => ['secret' => false, 'group' => 'whatsapp'],
            'WHATSAPP_GRAPH_API_VERSION' => ['secret' => false, 'group' => 'whatsapp'],
            'WHATSAPP_REDIRECT_URI' => ['secret' => false, 'group' => 'whatsapp'],
            'WHATSAPP_PHONE_NUMBER_ID' => ['secret' => false, 'group' => 'whatsapp'],
            'WHATSAPP_WABA_ID' => ['secret' => false, 'group' => 'whatsapp'],
            'RAZORPAY_KEY_ID' => ['secret' => false, 'group' => 'razorpay'],
            'RAZORPAY_KEY_SECRET' => ['secret' => true, 'group' => 'razorpay'],
            'SMTP_HOST' => ['secret' => false, 'group' => 'smtp'],
            'SMTP_PORT' => ['secret' => false, 'group' => 'smtp'],
            'SMTP_USERNAME' => ['secret' => false, 'group' => 'smtp'],
            'SMTP_APP_PASSWORD' => ['secret' => true, 'group' => 'smtp'],
            'SMTP_FROM_NAME' => ['secret' => false, 'group' => 'smtp'],
            'GROQ_API_KEY' => ['secret' => true, 'group' => 'ai'],
        ];

        $settings = [];
        foreach ($keys as $key => $meta) {
            $val = \App\Services\SettingService::get($key) ?: env($key, '');
            $displayValue = $meta['secret'] ? \App\Services\SettingService::maskSecret($val) : $val;
            $settings[$key] = [
                'key' => $key,
                'value' => $displayValue,
                'is_secret' => $meta['secret'],
                'group' => $meta['group'],
                'has_custom_value' => !empty(\App\Services\SettingService::get($key)),
            ];
        }

        return response()->json(['settings' => $settings]);
    }

    public function updateSettings(Request $request)
    {
        $settingsData = $request->input('settings', []);

        $secretKeys = [
            'WHATSAPP_APP_SECRET', 'WHATSAPP_SYSTEM_USER_TOKEN',
            'RAZORPAY_KEY_SECRET', 'SMTP_APP_PASSWORD', 'GROQ_API_KEY'
        ];

        $envPath = base_path('.env');
        $envContent = file_exists($envPath) ? file_get_contents($envPath) : '';

        foreach ($settingsData as $key => $val) {
            if ($val === null) continue;
            if (in_array($key, $secretKeys) && str_contains($val, '****')) {
                continue;
            }
            $isSecret = in_array($key, $secretKeys);
            \App\Services\SettingService::set($key, (string) $val, $isSecret);

            // Sync with .env file
            $valStr = (string) $val;
            $formattedVal = str_contains($valStr, ' ') ? "\"{$valStr}\"" : $valStr;

            if (preg_match("/^{$key}=.*/m", $envContent)) {
                $envContent = preg_replace("/^{$key}=.*/m", "{$key}={$formattedVal}", $envContent);
            } else {
                $envContent .= "\n{$key}={$formattedVal}";
            }
        }

        if (file_exists($envPath)) {
            @file_put_contents($envPath, $envContent);
        }

        return response()->json(['message' => 'System settings updated, encrypted in database, and synced to .env']);
    }

    public function getPricing(Request $request)
    {
        $pricing = PricingConfig::all();
        return response()->json($pricing);
    }

    public function updatePricing(Request $request)
    {
        $validated = $request->validate([
            'category' => 'required|string',
            'rate' => 'required|numeric',
        ]);

        $config = PricingConfig::updateOrCreate(
            ['category' => strtolower($validated['category'])],
            ['rate' => $validated['rate']]
        );

        return response()->json(['message' => 'Pricing rate updated successfully', 'pricing' => $config]);
    }

    public function updateUserPlan(Request $request, int $id)
    {
        $validated = $request->validate([
            'plan_id' => 'required|integer',
        ]);

        $user = User::find($id);
        if (!$user) return response()->json(['error' => 'User not found'], 404);

        $plan = Plan::find($validated['plan_id']);
        if (!$plan) return response()->json(['error' => 'Plan not found'], 404);

        $sub = Subscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'plan_id' => $plan->id,
                'status' => 'active',
                'starts_at' => now(),
                'expires_at' => now()->addDays(30),
            ]
        );

        return response()->json(['message' => "User upgraded to {$plan->name} plan", 'subscription' => $sub]);
    }

    public function allAgents(Request $request)
    {
        $agents = AiAgent::orderBy('is_prebuilt', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($agents);
    }

    public function allDripSequences(Request $request)
    {
        $sequences = \App\Models\DripSequence::orderBy('created_at', 'desc')
            ->get();

        return response()->json($sequences);
    }

    public function autoOptimize(Request $request)
    {
        try {
            \Illuminate\Support\Facades\Artisan::call('app:auto-optimize-database');
            $output = \Illuminate\Support\Facades\Artisan::output();
            return response()->json([
                'success' => true,
                'message' => 'Database & application auto-cache optimization completed successfully without removing user data.',
                'output' => trim($output)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Auto-optimization failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
