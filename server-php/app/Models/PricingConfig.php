<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PricingConfig extends Model
{
    protected $table = 'pricing_config';
    protected $fillable = [
        'category',
        'rate',
    ];

    protected $casts = [
        'rate' => 'decimal:4',
    ];

    public static function getRate(string $category): float
    {
        $config = static::where('category', $category)->first();
        return $config ? (float) $config->rate : 0.0;
    }
}
