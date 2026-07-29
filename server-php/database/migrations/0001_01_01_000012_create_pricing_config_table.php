<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_config', function (Blueprint $table) {
            $table->id();
            $table->string('category', 30)->unique();
            $table->decimal('rate', 10, 4);
            $table->timestamps();
        });

        // Seed default pricing
        DB::table('pricing_config')->insert([
            ['category' => 'marketing', 'rate' => 0.9000, 'created_at' => now(), 'updated_at' => now()],
            ['category' => 'utility', 'rate' => 0.1200, 'created_at' => now(), 'updated_at' => now()],
            ['category' => 'authentication', 'rate' => 0.1200, 'created_at' => now(), 'updated_at' => now()],
            ['category' => 'service', 'rate' => 0.0000, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_config');
    }
};
