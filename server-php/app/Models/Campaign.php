<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Campaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'name',
        'template_id',
        'contact_ids',
        'status',
        'scheduled_at',
        'total_contacts',
        'sent_count',
        'failed_count',
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
