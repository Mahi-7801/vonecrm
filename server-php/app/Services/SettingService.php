<?php

namespace App\Services;

use App\Models\Setting;

class SettingService
{
    private static function getCipherKey(): string
    {
        $appKey = config('app.key') ?: 'whatsapp_crm_secret_key_2026';
        return substr(hash('sha256', $appKey), 0, 32);
    }

    public static function encrypt(string $plainText): string
    {
        if (empty($plainText)) return '';
        $key = self::getCipherKey();
        $iv = openssl_random_pseudo_bytes(16);
        $encrypted = openssl_encrypt($plainText, 'AES-256-CBC', $key, 0, $iv);
        return bin2hex($iv . $encrypted);
    }

    public static function decrypt(string $hexText): string
    {
        if (empty($hexText)) return '';
        if (strlen($hexText) < 32 || !ctype_xdigit($hexText)) {
            return $hexText; // Return plain text if not hex-encrypted
        }
        try {
            $raw = hex2bin($hexText);
            if ($raw === false || strlen($raw) <= 16) return $hexText;
            $key = self::getCipherKey();
            $iv = substr($raw, 0, 16);
            $cipherText = substr($raw, 16);
            $decrypted = openssl_decrypt($cipherText, 'AES-256-CBC', $key, 0, $iv);
            return $decrypted !== false ? $decrypted : $hexText;
        } catch (\Exception $e) {
            return $hexText;
        }
    }

    public static function get(string $key, $default = null)
    {
        try {
            return \Illuminate\Support\Facades\Cache::remember('vone_setting_' . $key, 300, function () use ($key, $default) {
                $setting = Setting::where('key', $key)->first();
                if ($setting && !empty($setting->value)) {
                    return self::decrypt($setting->value);
                }
                return $default;
            });
        } catch (\Exception $e) {
            // Fallback
        }
        return $default;
    }

    public static function set(string $key, string $value, bool $isSecret = false, string $group = 'general')
    {
        \Illuminate\Support\Facades\Cache::forget('vone_setting_' . $key);
        $encryptedValue = self::encrypt($value);
        return Setting::updateOrCreate(
            ['key' => $key],
            [
                'value' => $encryptedValue,
                'is_secret' => $isSecret,
                'group' => $group,
            ]
        );
    }

    public static function maskSecret(string $value): string
    {
        if (empty($value)) return '';
        $len = strlen($value);
        if ($len <= 8) return str_repeat('*', $len);
        return substr($value, 0, 6) . str_repeat('*', $len - 10) . substr($value, -4);
    }
}
