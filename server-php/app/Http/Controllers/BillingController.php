<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\UsageLog;
use App\Models\Payment;
use App\Models\PricingConfig;
use App\Services\RazorpayService;
use App\Services\EmailService;

class BillingController extends Controller
{
    public function usage(Request $request)
    {
        $user = $request->user();
        $period = $request->query('period', 'all');

        $query = UsageLog::where('owner_id', $user->id);

        switch ($period) {
            case 'daily':
                $query->whereDate('created_at', now()->toDateString());
                break;
            case 'weekly':
                $query->where('created_at', '>=', now()->subWeek());
                break;
            case 'monthly':
                $query->where('created_at', '>=', now()->subMonth());
                break;
        }

        $logs = $query->get();

        $breakdown = $logs->groupBy('category')->map(fn($items) => [
            'count' => $items->count(),
            'total' => $items->sum('cost'),
        ]);

        return response()->json([
            'usage' => $logs,
            'breakdown' => $breakdown,
            'total' => $logs->sum('cost'),
            'balance' => $user->balance,
            'credit_mode' => $user->credit_mode,
        ]);
    }

    public function payments(Request $request)
    {
        $user = $request->user();

        $payments = Payment::where('owner_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($payments);
    }

    public function createOrder(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
        ]);

        $user = $request->user();
        $razorpayService = new RazorpayService();

        $receipt = "user_{$user->id}_" . time();
        $order = $razorpayService->createOrder($validated['amount'], $receipt);

        if (!$order) {
            return response()->json(['error' => 'Failed to create order'], 500);
        }

        return response()->json([
            'order_id' => $order['id'],
            'amount' => $order['amount'],
            'currency' => $order['currency'],
            'key' => config('razorpay.key_id'),
        ]);
    }

    public function verifyPayment(Request $request)
    {
        $validated = $request->validate([
            'razorpay_order_id' => 'required|string',
            'razorpay_payment_id' => 'required|string',
            'razorpay_signature' => 'required|string',
        ]);

        $user = $request->user();
        $razorpayService = new RazorpayService();

        $isValid = $razorpayService->verifyPayment(
            $validated['razorpay_order_id'],
            $validated['razorpay_payment_id'],
            $validated['razorpay_signature']
        );

        if (!$isValid) {
            return response()->json(['error' => 'Payment verification failed'], 400);
        }

        // Check for duplicate payment
        $existing = Payment::where('razorpay_payment_id', $validated['razorpay_payment_id'])->first();
        if ($existing) {
            return response()->json(['error' => 'Payment already processed'], 400);
        }

        // Fetch order to get amount
        $order = $razorpayService->fetchOrder($validated['razorpay_order_id']);
        $amount = ($order['amount'] ?? 0) / 100;

        // Create payment record
        $payment = Payment::create([
            'owner_id' => $user->id,
            'amount' => $amount,
            'method' => 'razorpay',
            'razorpay_payment_id' => $validated['razorpay_payment_id'],
        ]);

        // Credit balance
        $user->increment('balance', $amount);

        // Send confirmation email
        $emailService = new EmailService();
        $emailService->sendPaymentConfirmation(
            $user->email,
            $user->email,
            [
                'amount' => $amount,
                'plan_name' => 'Wallet Recharge',
                'expires_at' => 'N/A',
                'payment_id' => $validated['razorpay_payment_id'],
            ]
        );

        return response()->json([
            'message' => 'Payment verified successfully',
            'payment' => $payment,
            'new_balance' => $user->fresh()->balance,
        ]);
    }

    public function razorpayWebhook(Request $request)
    {
        $body = $request->all();

        if (($body['event'] ?? '') === 'payment.captured') {
            $paymentData = $body['payload']['payment']['entity'] ?? null;
            if ($paymentData) {
                $receipt = $paymentData['notes']['user_id'] ?? null;
                if ($receipt) {
                    $userId = (int) str_replace('user_', '', $receipt);
                    $user = User::find($userId);
                    if ($user) {
                        $amount = ($paymentData['amount'] ?? 0) / 100;
                        $user->increment('balance', $amount);

                        Payment::create([
                            'owner_id' => $user->id,
                            'amount' => $amount,
                            'method' => 'razorpay',
                            'razorpay_payment_id' => $paymentData['id'] ?? null,
                        ]);
                    }
                }
            }
        }

        return response()->json(['status' => 'ok']);
    }

    public function downloadInvoice(Request $request, $id)
    {
        $user = $request->user();
        $payment = Payment::where('id', $id)
            ->where(function ($q) use ($user) {
                if ($user->role !== 'admin') {
                    $q->where('owner_id', $user->id);
                }
            })->first();

        if (!$payment) {
            return response()->json(['error' => 'Payment invoice not found'], 404);
        }

        $paymentUser = User::find($payment->owner_id) ?: $user;
        $subtotal = round($payment->amount / 1.18, 2);
        $gstAmount = round($payment->amount - $subtotal, 2);
        $cgst = round($gstAmount / 2, 2);
        $sgst = round($gstAmount / 2, 2);
        $invoiceNum = "INV-" . str_pad($payment->id, 6, "0", STR_PAD_LEFT);
        $dateStr = date('d M Y, h:i A', strtotime($payment->created_at));

        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>TAX INVOICE - {$invoiceNum}</title>
<style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 40px; background: #fff; }
    .invoice-card { max-width: 800px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; }
    .brand-title { font-size: 26px; font-weight: 900; color: #1e3a8a; letter-spacing: -0.5px; }
    .brand-subtitle { font-size: 11px; font-weight: 700; color: #dc2626; text-transform: uppercase; letter-spacing: 1px; }
    .invoice-title { font-size: 24px; font-weight: 800; color: #111827; text-align: right; }
    .invoice-meta { font-size: 12px; color: #4b5563; text-align: right; margin-top: 4px; }
    .info-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info-box { width: 48%; }
    .info-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px; margin-bottom: 4px; }
    .info-name { font-size: 15px; font-weight: 700; color: #111827; }
    .info-text { font-size: 13px; color: #4b5563; line-height: 1.5; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .table th { background: #f9fafb; border-bottom: 1px solid #e5e7eb; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #374151; }
    .table td { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #1f2937; }
    .totals { width: 320px; margin-left: auto; margin-bottom: 30px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #4b5563; }
    .totals-row.grand { border-top: 2px solid #111827; border-bottom: 2px solid #111827; padding: 10px 0; margin-top: 6px; font-size: 16px; font-weight: 800; color: #111827; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; font-size: 11px; color: #9ca3af; }
    @media print { body { padding: 0; } .invoice-card { border: none; padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<div class="no-print" style="max-width: 800px; margin: 0 auto 20px; text-align: right;">
    <button onclick="window.print()" style="background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">🖨️ Print / Download PDF</button>
</div>
<div class="invoice-card">
    <div class="header">
        <div>
            <div class="brand-title">VONE DIGITALS</div>
            <div class="brand-subtitle">WhatsApp CRM & Automation Platform</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 6px;">GSTIN: 36ABCDE1234F1Z5 | PAN: ABCDE1234F</div>
        </div>
        <div>
            <div class="invoice-title">TAX INVOICE</div>
            <div class="invoice-meta"><strong>Invoice No:</strong> {$invoiceNum}</div>
            <div class="invoice-meta"><strong>Date:</strong> {$dateStr}</div>
            <div class="invoice-meta"><strong>Payment ID:</strong> {$payment->razorpay_payment_id}</div>
        </div>
    </div>

    <div class="info-grid">
        <div class="info-box">
            <div class="info-label">Billed From</div>
            <div class="info-name">V ONE DIGITALS PRIVATE LIMITED</div>
            <div class="info-text">Plot No. 42, Tech Enclave, Hitech City<br>Hyderabad, Telangana - 500081<br>Email: support@vonedigitals.com</div>
        </div>
        <div class="info-box">
            <div class="info-label">Billed To</div>
            <div class="info-name">{$paymentUser->email}</div>
            <div class="info-text">Customer ID: USR-{$paymentUser->id}<br>Payment Method: {$payment->method}<br>Status: <span style="color: #059669; font-weight: bold;">PAID</span></div>
        </div>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th>Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Base Price (INR)</th>
                <th style="text-align: right;">GST (18%)</th>
                <th style="text-align: right;">Total Amount (INR)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>WhatsApp CRM Wallet Credit / Plan Subscription</strong><br><span style="font-size: 11px; color: #6b7280;">Prepaid message sending quota & platform access</span></td>
                <td style="text-align: center;">1</td>
                <td style="text-align: right;">₹{$subtotal}</td>
                <td style="text-align: right;">₹{$gstAmount}</td>
                <td style="text-align: right;"><strong>₹{$payment->amount}</strong></td>
            </tr>
        </tbody>
    </table>

    <div class="totals">
        <div class="totals-row"><span>Subtotal (Excl. Tax)</span><span>₹{$subtotal}</span></div>
        <div class="totals-row"><span>CGST (9%)</span><span>₹{$cgst}</span></div>
        <div class="totals-row"><span>SGST (9%)</span><span>₹{$sgst}</span></div>
        <div class="totals-row grand"><span>Total Amount Paid</span><span>₹{$payment->amount}</span></div>
    </div>

    <div class="footer">
        This is a computer-generated Tax Invoice and does not require a physical signature.<br>
        Thank you for choosing V ONE DIGITALS CRM!
    </div>
</div>
</body>
</html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html');
    }
}
