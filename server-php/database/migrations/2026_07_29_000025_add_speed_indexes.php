<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->index(['owner_id', 'created_at'], 'idx_msg_owner_created');
            $table->index(['owner_id', 'status'], 'idx_msg_owner_status');
        });

        Schema::table('contacts', function (Blueprint $table) {
            $table->index(['owner_id', 'phone'], 'idx_contact_owner_phone');
        });

        Schema::table('whatsapp_numbers', function (Blueprint $table) {
            $table->index(['owner_id', 'verified'], 'idx_wnum_owner_verified');
        });

        Schema::table('scheduled_broadcasts', function (Blueprint $table) {
            $table->index(['status', 'scheduled_at'], 'idx_sbroadcast_status_sched');
        });

        Schema::table('usage_log', function (Blueprint $table) {
            $table->index(['owner_id', 'created_at'], 'idx_usage_owner_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex('idx_msg_owner_created');
            $table->dropIndex('idx_msg_owner_status');
        });

        Schema::table('contacts', function (Blueprint $table) {
            $table->dropIndex('idx_contact_owner_phone');
        });

        Schema::table('whatsapp_numbers', function (Blueprint $table) {
            $table->dropIndex('idx_wnum_owner_verified');
        });

        Schema::table('scheduled_broadcasts', function (Blueprint $table) {
            $table->dropIndex('idx_sbroadcast_status_sched');
        });

        Schema::table('usage_log', function (Blueprint $table) {
            $table->dropIndex('idx_usage_owner_created');
        });
    }
};
