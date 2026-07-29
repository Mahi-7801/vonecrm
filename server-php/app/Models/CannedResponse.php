<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CannedResponse extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'shortcut',
        'message',
        'category',
        'published',
        'is_preset',
    ];

    protected $casts = [
        'published' => 'boolean',
        'is_preset' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
