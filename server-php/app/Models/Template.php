<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Template extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'owner_id',
        'name',
        'category',
        'language',
        'header',
        'body',
        'footer',
        'buttons',
        'status',
        'meta_template_id',
        'is_published',
    ];

    protected $casts = [
        'buttons' => 'array',
        'is_published' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class, 'template_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'approved')
            ->orWhere('status', 'active');
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }
}
