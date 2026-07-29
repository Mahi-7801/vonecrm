<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('app:process-scheduled-broadcasts')->everyMinute();
Schedule::command('app:process-drip-sequences')->everyFiveMinutes();
Schedule::command('app:process-expiry-alerts')->dailyAt('09:00');
