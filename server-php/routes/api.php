<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\TemplateController;
use App\Http\Controllers\FlowController;
use App\Http\Controllers\WhatsAppController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\BroadcastController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AiAgentController;
use App\Http\Controllers\AgentController;
use App\Http\Controllers\CannedResponseController;
use App\Http\Controllers\DripSequenceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CronController;

// Health check
Route::get('/health', fn() => response()->json([
    'status' => 'ok',
    'timestamp' => now()->toIso8601String(),
    'service' => 'VONE DIGITALS CRM API',
    'version' => '1.0.0',
]));

// Public Plans (no auth required)
Route::get('/plans', [PlanController::class, 'index']);

// ─── Auth Routes ───────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('signup', [AuthController::class, 'signup']);
    Route::post('login', [AuthController::class, 'login']);
    Route::post('admin-login', [AuthController::class, 'adminLogin']);
    Route::get('me', [AuthController::class, 'me'])->middleware('auth.jwt');
    Route::put('change-password', [AuthController::class, 'changePassword'])->middleware('auth.jwt');
});

// ─── Protected Routes ──────────────────────────────────────
Route::middleware('auth.jwt')->group(function () {

    // Dashboard
    Route::get('dashboard', [DashboardController::class, 'index']);

    // Contacts
    Route::prefix('contacts')->group(function () {
        Route::get('/', [ContactController::class, 'index']);
        Route::get('/labels', [ContactController::class, 'labels']);
        Route::post('/labels', [ContactController::class, 'createLabel']);
        Route::delete('/labels/{id}', [ContactController::class, 'deleteLabel']);
        Route::get('/{id}', [ContactController::class, 'show']);
        Route::post('/', [ContactController::class, 'store']);
        Route::put('/{id}', [ContactController::class, 'update']);
        Route::delete('/{id}', [ContactController::class, 'destroy']);
        Route::post('/import', [ContactController::class, 'import']);
        Route::post('/{id}/label', [ContactController::class, 'assignLabel']);
    });

    // Messages
    Route::prefix('messages')->group(function () {
        Route::get('/', [MessageController::class, 'inbox']);
        Route::get('/{contactId}', [MessageController::class, 'thread']);
        Route::post('/send', [MessageController::class, 'send']);
        Route::post('/upload-media', [MessageController::class, 'uploadMedia']);
    });

    // Templates
    Route::prefix('templates')->group(function () {
        Route::get('/', [TemplateController::class, 'index']);
        Route::post('/', [TemplateController::class, 'store']);
        Route::put('/{id}', [TemplateController::class, 'update']);
        Route::delete('/{id}', [TemplateController::class, 'destroy']);
        Route::post('/{id}/submit', [TemplateController::class, 'submitToMetaEndpoint']);
        Route::post('/sync', [TemplateController::class, 'syncFromMeta']);
        Route::get('/meta', [TemplateController::class, 'metaTemplates']);
    });

    // Flows
    Route::prefix('flows')->group(function () {
        Route::get('/', [FlowController::class, 'index']);
        Route::get('/{id}', [FlowController::class, 'show']);
        Route::post('/', [FlowController::class, 'store']);
        Route::put('/{id}', [FlowController::class, 'update']);
        Route::delete('/{id}', [FlowController::class, 'destroy']);
        Route::post('/{id}/test', [FlowController::class, 'test']);
        Route::post('/{id}/execute', [FlowController::class, 'execute']);
        Route::post('/{id}/conversation', [FlowController::class, 'startConversation']);
        Route::post('/{id}/conversation/{convId}/button', [FlowController::class, 'handleButton']);
        Route::get('/{id}/conversation/{convId}', [FlowController::class, 'getConversation']);
    });

    // WhatsApp
    Route::prefix('whatsapp')->group(function () {
        Route::get('verification-status', [WhatsAppController::class, 'getVerificationStatus']);
        Route::get('config-id', [WhatsAppController::class, 'getConfigId']);
        Route::get('numbers', [WhatsAppController::class, 'getNumbers']);
        Route::post('connect', [WhatsAppController::class, 'connect']);
        Route::post('connect-direct', [WhatsAppController::class, 'connectDirect']);
        Route::post('auto-connect', [WhatsAppController::class, 'autoConnect']);
        Route::delete('numbers/{id}', [WhatsAppController::class, 'disconnectNumber']);
        Route::post('test-incoming', [WhatsAppController::class, 'testIncoming']);
    });

    // Billing
    Route::prefix('billing')->group(function () {
        Route::get('usage', [BillingController::class, 'usage']);
        Route::get('payments', [BillingController::class, 'payments']);
        Route::post('create-order', [BillingController::class, 'createOrder']);
        Route::post('verify-payment', [BillingController::class, 'verifyPayment']);
        Route::get('invoice/{id}', [BillingController::class, 'downloadInvoice']);
    });

    // Broadcast
    Route::prefix('broadcast')->group(function () {
        Route::post('/send', [BroadcastController::class, 'send']);
        Route::get('/job/{id}', [BroadcastController::class, 'getJobStatus']);
        Route::get('/status', [BroadcastController::class, 'status']);
        Route::get('/history', [BroadcastController::class, 'history']);
        Route::get('/scheduled', [BroadcastController::class, 'scheduled']);
        Route::post('/schedule', [BroadcastController::class, 'schedule']);
        Route::delete('/scheduled/{id}', [BroadcastController::class, 'cancelScheduled']);
    });

    // Plans (authenticated)
    Route::prefix('plans')->group(function () {
        Route::get('/my-subscription', [PlanController::class, 'mySubscription']);
        Route::post('/{id}/create-order', [PlanController::class, 'createOrder']);
        Route::post('/verify-payment', [PlanController::class, 'verifyPayment']);
        Route::post('/{id}/subscribe', [PlanController::class, 'subscribeByBalance']);
    });

    // AI Agents
    Route::prefix('ai-agents')->group(function () {
        Route::get('/', [AiAgentController::class, 'index']);
        Route::get('/{id}', [AiAgentController::class, 'show']);
        Route::post('/', [AiAgentController::class, 'store']);
        Route::put('/{id}', [AiAgentController::class, 'update']);
        Route::delete('/{id}', [AiAgentController::class, 'destroy']);
    });

    // Human Agents
    Route::prefix('agents')->group(function () {
        Route::get('/', [AgentController::class, 'index']);
        Route::post('/', [AgentController::class, 'store']);
        Route::delete('/{id}', [AgentController::class, 'destroy']);
        Route::post('/assign', [AgentController::class, 'assign']);
    });

    // Canned Responses
    Route::prefix('canned-responses')->group(function () {
        Route::get('/', [CannedResponseController::class, 'index']);
        Route::get('/preset', [CannedResponseController::class, 'presets']);
        Route::post('/', [CannedResponseController::class, 'store']);
        Route::put('/{id}', [CannedResponseController::class, 'update']);
        Route::delete('/{id}', [CannedResponseController::class, 'destroy']);
    });

    // Drip Sequences
    Route::prefix('drip-sequences')->group(function () {
        Route::get('/', [DripSequenceController::class, 'index']);
        Route::post('/', [DripSequenceController::class, 'store']);
        Route::put('/{id}', [DripSequenceController::class, 'update']);
        Route::delete('/{id}', [DripSequenceController::class, 'destroy']);
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread', [NotificationController::class, 'unread']);
        Route::put('/read', [NotificationController::class, 'markRead']);
    });

    // Integrations
    Route::prefix('integrations')->group(function () {
        Route::get('/', [IntegrationController::class, 'index']);
        Route::post('/', [IntegrationController::class, 'store']);
        Route::put('/{id}', [IntegrationController::class, 'update']);
        Route::delete('/{id}', [IntegrationController::class, 'destroy']);
        Route::post('/telegram/setup', [IntegrationController::class, 'setupTelegram']);
        Route::post('/telegram/set-webhook', [IntegrationController::class, 'setTelegramWebhook']);
    });
});

// ─── Admin Routes ──────────────────────────────────────────
Route::prefix('admin')->middleware(['auth.jwt', 'admin'])->group(function () {
    Route::get('/dashboard', [AdminController::class, 'dashboard']);
    Route::get('/users', [AdminController::class, 'users']);
    Route::get('/users/{id}', [AdminController::class, 'showUser']);
    Route::put('/users/{id}', [AdminController::class, 'updateUser']);
    Route::delete('/users/{id}', [AdminController::class, 'destroyUser']);
    Route::put('/users/{id}/suspend', [AdminController::class, 'suspendUser']);
    Route::put('/users/{id}/enable', [AdminController::class, 'enableUser']);
    Route::post('/users/{id}/adjust-balance', [AdminController::class, 'adjustBalance']);
    Route::get('/usage', [AdminController::class, 'usage']);
    Route::post('/pricing', [AdminController::class, 'pricing']);
    Route::get('/pricing', [AdminController::class, 'pricing']);
    Route::get('/numbers', [AdminController::class, 'numbers']);
    Route::post('/users/{id}/numbers', [AdminController::class, 'addNumber']);
    Route::delete('/numbers/{id}', [AdminController::class, 'deleteNumber']);
    Route::get('/templates', [AdminController::class, 'templates']);
    Route::post('/templates', [AdminController::class, 'templates']);
    Route::delete('/templates/{id}', [AdminController::class, 'deleteTemplate']);
    Route::get('/messages', [AdminController::class, 'messages']);
    Route::get('/contacts', [AdminController::class, 'contacts']);
    Route::get('/flows', [AdminController::class, 'flows']);
    Route::get('/stats', [AdminController::class, 'stats']);
    Route::post('/users/{id}/send-expiry-alert', [AdminController::class, 'sendExpiryAlert']);
    Route::post('/templates/{id}/approve-meta', [AdminController::class, 'approveMetaTemplate']);
    Route::post('/publish', [AdminController::class, 'publish']);
    Route::get('/notifications', [AdminController::class, 'notifications']);
    Route::put('/notifications/read', [AdminController::class, 'markNotificationsRead']);
    Route::get('/notifications/unread', [AdminController::class, 'unreadCount']);

    // Admin Settings (Encrypted DB credentials)
    Route::get('/settings', [AdminController::class, 'getSettings']);
    Route::post('/settings', [AdminController::class, 'updateSettings']);

    // Admin AI Agents (all agents across all users)
    Route::get('/ai-agents', [AdminController::class, 'allAgents']);

    // Admin Drip Sequences (all sequences across all users)
    Route::get('/drip-sequences', [AdminController::class, 'allDripSequences']);

    // Admin Plans
    Route::get('/plans', [PlanController::class, 'all']);
    Route::post('/plans', [PlanController::class, 'store']);
    Route::put('/plans/{id}', [PlanController::class, 'update']);
    Route::delete('/plans/{id}', [PlanController::class, 'destroy']);
    Route::get('/subscriptions', [PlanController::class, 'adminSubscriptions']);

    // Admin Category Pricing Rates & User Plan Overrides
    Route::get('/pricing', [AdminController::class, 'getPricing']);
    Route::post('/pricing', [AdminController::class, 'updatePricing']);
    Route::post('/users/{id}/plan', [AdminController::class, 'updateUserPlan']);

    // Auto Database Optimization & Cache Clearing (Zero data removal)
    Route::match(['get', 'post'], '/auto-optimize', [AdminController::class, 'autoOptimize']);
});

// ─── Webhook Routes (No Auth) ──────────────────────────────
Route::prefix('whatsapp')->group(function () {
    Route::get('webhook', [WhatsAppController::class, 'verifyWebhook']);
    Route::post('webhook', [WhatsAppController::class, 'handleWebhook']);
});

Route::get('webhook', [WhatsAppController::class, 'verifyWebhook']);
Route::post('webhook', [WhatsAppController::class, 'handleWebhook']);

// ─── External Webhook Routes (No Auth) ─────────────────────
Route::prefix('integrations')->group(function () {
    Route::post('telegram/webhook', [IntegrationController::class, 'telegramWebhook']);
    Route::post('n8n/webhook', [IntegrationController::class, 'n8nWebhook']);
});

// Razorpay Webhook
Route::post('billing/webhook', [BillingController::class, 'razorpayWebhook']);

// ─── Cron Routes (Public with token check) ────────────────
Route::prefix('cron')->group(function () {
    Route::get('scheduled-broadcasts', [CronController::class, 'processScheduledBroadcasts']);
    Route::get('drip-sequences', [CronController::class, 'processDripSequences']);
    Route::get('expiry-alerts', [CronController::class, 'processExpiryAlerts']);
    Route::get('process-all', [CronController::class, 'processAll']);
});
