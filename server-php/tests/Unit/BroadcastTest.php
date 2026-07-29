<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\SettingService;
use App\Services\WhatsAppService;

class BroadcastTest extends TestCase
{
    public function test_setting_service_encryption()
    {
        $plain = "mahi_secret_token_123";
        $encrypted = SettingService::encrypt($plain);
        $this->assertNotEmpty($encrypted);
        $this->assertNotEquals($plain, $encrypted);

        $decrypted = SettingService::decrypt($encrypted);
        $this->assertEquals($plain, $decrypted);
    }

    public function test_setting_service_mask_secret()
    {
        $secret = "EAAWm0gq99388283ZDZD";
        $masked = SettingService::maskSecret($secret);
        $this->assertStringStartsWith("EAAWm0", $masked);
        $this->assertStringEndsWith("ZDZD", $masked);
        $this->assertStringContainsString("****", $masked);
    }

    public function test_whatsapp_service_instantiation()
    {
        $service = new WhatsAppService();
        $this->assertInstanceOf(WhatsAppService::class, $service);
    }
}
