<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_labels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('color')->default('#3B82F6');
            $table->timestamps();
        });

        Schema::table('contacts', function (Blueprint $table) {
            $table->unsignedBigInteger('label_id')->nullable()->after('label');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_labels');
    }
};
