<?php

return [
    // A post is automatically hidden when it receives this many distinct resident reports.
    'auto_hold_threshold' => (int) env('MODERATION_AUTO_HOLD_THRESHOLD', 6),
    // Active users are those with a request in the last five minutes.
    'online_window_minutes' => (int) env('MODERATION_ONLINE_WINDOW_MINUTES', 5),
    'default_avatar' => 'images/anonymous-avatar.svg',
];
