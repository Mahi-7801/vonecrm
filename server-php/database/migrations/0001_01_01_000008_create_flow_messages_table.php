<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('flow_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('flow_conversations')->cascadeOnDelete();
            $table->string('node_id')->nullable();
            $table->enum('role', ['user', 'assistant', 'button_click'])->default('user');
            $table->text('content')->nullable();
            $table->string('button_label')->nullable();
            $table->json('ai_context')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flow_messages');
    }
};
