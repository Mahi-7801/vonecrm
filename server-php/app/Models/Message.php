<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'contact_id',
        'direction',
        'body',
        'template_id',
        'wa_message_id',
        'status',
        'message_type',
        'media_url',
        'label',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }

    public function template()
    {
        return $this->belongsTo(Template::class, 'template_id');
    }

    public function usageLogs()
    {
        return $this->hasMany(UsageLog::class, 'message_id');
    }
}
