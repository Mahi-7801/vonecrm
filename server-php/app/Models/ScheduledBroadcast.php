<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScheduledBroadcast extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'template_id',
        'template_name',
        'contact_ids',
        'status',
        'scheduled_at',
    ];

    protected $casts = [
        'contact_ids' => 'array',
        'scheduled_at' => 'datetime',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function template()
    {
        return $this->belongsTo(Template::class, 'template_id');
    }
}
