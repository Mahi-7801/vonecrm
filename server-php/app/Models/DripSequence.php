<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DripSequence extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'name',
        'steps',
        'active',
    ];

    protected $casts = [
        'steps' => 'array',
        'active' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
