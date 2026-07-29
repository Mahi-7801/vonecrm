<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('role')->nullable();
            $table->string('specialty')->nullable();
            $table->text('system_prompt')->nullable();
            $table->text('personality')->nullable();
            $table->string('avatar_emoji')->default('🤖');
            $table->boolean('is_published')->default(false);
            $table->boolean('is_prebuilt')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_agents');
    }
};
