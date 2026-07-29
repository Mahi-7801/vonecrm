<?php

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use Illuminate\Support\Facades\Log;

use App\Services\SettingService;

class EmailService
{
    private string $host;
    private int $port;
    private string $username;
    private string $password;
    private string $fromName;

    public function __construct()
    {
        $this->host = SettingService::get('SMTP_HOST') ?: (config('mail.mailers.smtp.host') ?: env('SMTP_HOST', 'smtp.gmail.com'));
        $this->port = (int) (SettingService::get('SMTP_PORT') ?: (config('mail.mailers.smtp.port') ?: env('SMTP_PORT', 587)));
        $this->username = SettingService::get('SMTP_USERNAME') ?: (config('mail.from.address') ?: env('SMTP_USERNAME', ''));
        $this->password = SettingService::get('SMTP_APP_PASSWORD') ?: (config('mail.mailers.smtp.password') ?: env('SMTP_APP_PASSWORD', ''));
        $this->fromName = SettingService::get('SMTP_FROM_NAME') ?: (config('mail.from.name') ?: env('SMTP_FROM_NAME', 'V ONE DIGITALS'));
    }

    private function createMailer(): PHPMailer
    {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $this->host;
        $mail->SMTPAuth = true;
        $mail->Username = $this->username;
        $mail->Password = $this->password;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = $this->port;
        $mail->CharSet = 'UTF-8';
        $mail->setFrom($this->username, $this->fromName);
        return $mail;
    }

    public function sendPaymentConfirmation(string $toEmail, string $userName, array $paymentData): bool
    {
        try {
            $mail = $this->createMailer();
            $mail->addAddress($toEmail, $userName);
            $mail->isHTML(true);
            $mail->Subject = 'Payment Confirmation - V ONE DIGITALS';

            $amount = $paymentData['amount'] ?? 0;
            $planName = $paymentData['plan_name'] ?? 'N/A';
            $validUntil = $paymentData['expires_at'] ?? 'N/A';
            $paymentId = $paymentData['payment_id'] ?? 'N/A';

            $mail->Body = $this->getPaymentConfirmationHtml($userName, $amount, $planName, $validUntil, $paymentId);
            $mail->AltBody = "Hi {$userName}, your payment of INR {$amount} for {$planName} plan has been confirmed. Valid until {$validUntil}. Payment ID: {$paymentId}";

            $mail->send();
            return true;
        } catch (Exception $e) {
            Log::error('Email send failed: ' . $e->getMessage());
            return false;
        }
    }

    public function sendExpiryAlert(string $toEmail, string $userName, float $balance, string $reason = ''): bool
    {
        try {
            $mail = $this->createMailer();
            $mail->addAddress($toEmail, $userName);
            $mail->isHTML(true);
            $mail->Subject = 'Account Alert - V ONE DIGITALS';

            $reason = $reason ?: 'Your wallet balance is low or your subscription has expired.';
            $mail->Body = $this->getExpiryAlertHtml($userName, $balance, $reason);
            $mail->AltBody = "Hi {$userName}, {$reason} Current balance: INR {$balance}. Please recharge to continue using our services.";

            $mail->send();
            return true;
        } catch (Exception $e) {
            Log::error('Expiry alert email failed: ' . $e->getMessage());
            return false;
        }
    }

    private function getPaymentConfirmationHtml(string $name, float $amount, string $plan, string $validUntil, string $paymentId): string
    {
        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">V ONE DIGITALS</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Payment Confirmation</p>
            </div>
            <div style="padding: 30px;">
                <p style="color: #333; font-size: 16px;">Hi <strong>{$name}</strong>,</p>
                <p style="color: #555; line-height: 1.6;">Your payment has been successfully processed!</p>
                <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; color: #666;">Amount Paid</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">INR {$amount}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">Plan</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">{$plan}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">Valid Until</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">{$validUntil}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">Payment ID</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">{$paymentId}</td></tr>
                    </table>
                </div>
                <p style="color: #555; line-height: 1.6;">Thank you for choosing V ONE DIGITALS CRM. You now have access to all premium features.</p>
            </div>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px;">
                V ONE DIGITALS &copy; 2026. All rights reserved.
            </div>
        </div>
        </body></html>
        HTML;
    }

    private function getExpiryAlertHtml(string $name, float $balance, string $reason): string
    {
        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #1a1a2e; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #16213e; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Account Alert</h1>
            </div>
            <div style="padding: 30px;">
                <p style="color: #ecf0f1; font-size: 16px;">Hi <strong>{$name}</strong>,</p>
                <p style="color: #bdc3c7; line-height: 1.6;">{$reason}</p>
                <div style="background: #0f3460; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="color: #95a5a6; margin: 0;">Current Balance</p>
                    <p style="color: #e74c3c; font-size: 28px; font-weight: bold; margin: 10px 0;">INR {$balance}</p>
                </div>
                <p style="color: #bdc3c7; line-height: 1.6;">Please recharge your wallet to continue using WhatsApp CRM services without interruption.</p>
            </div>
            <div style="background: #0f3460; padding: 20px; text-align: center; color: #7f8c8d; font-size: 12px;">
                V ONE DIGITALS &copy; 2026. All rights reserved.
            </div>
        </div>
        </body></html>
        HTML;
    }
}
