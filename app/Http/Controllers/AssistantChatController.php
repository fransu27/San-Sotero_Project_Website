<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Complaint;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AssistantChatController extends Controller
{
    public function __invoke(Request $request)
    {
        $data = $request->validate(['message' => ['required', 'string', 'max:500'], 'ticket' => ['nullable', 'string', 'max:40']]);
        $user = $request->user();
        $message = mb_strtolower(trim($data['message']));
        $base = Complaint::query();
        if (! $user->isAdmin()) {
            $base->where(fn ($q) => $q->where('user_id', $user->id)->orWhere(fn ($p) => $p->where('visibility', 'public')->where('approval_status', Complaint::APPROVAL_APPROVED)->whereNull('removed_at')));
        }
        $ticket = $data['ticket'] ?? null;
        if (! $ticket && preg_match('/SS-[A-Z0-9-]{6,30}/i', $message, $match)) $ticket = strtoupper($match[0]);
        if ($ticket) {
            $report = (clone $base)->where('ticket_code', $ticket)->first();
            if (! $report || (! $user->isAdmin() && $report->user_id !== $user->id && ($report->visibility !== 'public' || $report->approval_status !== Complaint::APPROVAL_APPROVED || $report->removed_at))) {
                return response()->json(['answer' => 'I could not find a report you are allowed to view with that ticket code. Please check the code or open My Submissions.']);
            }
            $latestEvent = $report->events()->latest('created_at')->first();
            $status = $report->approval_status === Complaint::APPROVAL_PENDING ? 'Waiting for approval' : $report->status;
            $answer = "Ticket {$report->ticket_code}: {$report->title}. Status: {$status}. Category: ".($report->custom_category ?: $report->category).". Submitted: ".$report->created_at?->format('M j, Y g:i A').'.';
            if ($latestEvent?->note) $answer .= ' Latest staff note: '.$latestEvent->note;
            return response()->json(['answer' => $answer, 'report' => ['ticket_code' => $report->ticket_code, 'title' => $report->title, 'status' => $status, 'url' => $user->isAdmin() ? '/admin/moderation?ticket='.urlencode((string) $report->ticket_code) : '/my-submissions?ticket='.urlencode((string) $report->ticket_code)] ]);
        }
        if (str_contains($message, 'today') || str_contains($message, 'update') || str_contains($message, 'posted') || str_contains($message, 'latest')) {
            $today = Carbon::today();
            $posts = (clone $base)->where('created_at', '>=', $today)->where('created_at', '<', $today->copy()->addDay())
                ->where('approval_status', Complaint::APPROVAL_APPROVED)->whereNull('removed_at')->latest()->limit(8)->get(['ticket_code','title','category','custom_category','status','created_at']);
            $announcements = Announcement::query()->whereDate('created_at', $today)->latest()->limit(5)->get(['title','body','created_at']);
            $lines = [];
            foreach ($posts as $post) $lines[] = '- '.$post->title.' ('.($post->custom_category ?: $post->category).', '.$post->status.', '.$post->created_at?->format('g:i A').')'.($user->isAdmin() && $post->ticket_code ? ' ['.$post->ticket_code.']' : '');
            foreach ($announcements as $a) $lines[] = '- Announcement: '.$a->title.' ('.$a->created_at?->format('g:i A').')';
            return response()->json(['answer' => $lines ? "Today's visible updates:\n".implode("\n", $lines) : 'There are no approved reports or announcements posted today that you can currently view.']);
        }
        if (str_contains($message, 'my report') || str_contains($message, 'my ticket') || str_contains($message, 'my submission') || str_contains($message, 'my progress')) {
            $mine = Complaint::query()->where('user_id', $user->id)->latest()->limit(10)->get(['ticket_code','title','status','approval_status','created_at']);
            if ($mine->isEmpty()) return response()->json(['answer' => 'You have not submitted any reports yet.']);
            $lines = $mine->map(fn ($r) => '- '.($r->ticket_code ?: 'No ticket code').' — '.$r->title.' — '.($r->approval_status === Complaint::APPROVAL_PENDING ? 'Waiting for approval' : $r->status).' — '.$r->created_at?->format('M j, Y g:i A').' — Open: /my-submissions?ticket='.urlencode((string) $r->ticket_code))->all();
            return response()->json(['answer' => "Here are your latest reports:\n".implode("\n", $lines)]);
        }
        if (str_contains($message, 'best') || str_contains($message, 'hot') || str_contains($message, 'latest reports') || str_contains($message, 'recent reports')) {
            $query = (clone $base)->where('approval_status', Complaint::APPROVAL_APPROVED)->whereNull('removed_at');
            if (str_contains($message, 'best')) {
                $items = $query->withAvg('ratings', 'rating')->withCount(['reactions as satisfied_count' => fn ($q) => $q->where('type', 'satisfied')])->orderByDesc('ratings_avg_rating')->orderByDesc('satisfied_count')->limit(5)->get();
                $heading = 'Top-rated visible reports';
            } elseif (str_contains($message, 'hot')) {
                $items = $query->withCount(['reactions as satisfied_count' => fn ($q) => $q->where('type', 'satisfied')])->orderByDesc('satisfied_count')->latest()->limit(5)->get();
                $heading = 'Hot visible reports';
            } else {
                $items = $query->latest()->limit(5)->get();
                $heading = 'Latest visible reports';
            }
            $lines = $items->map(fn ($r) => '- '.$r->title.' — '.($r->custom_category ?: $r->category).' — '.$r->status.' — '.($r->ticket_code ?: 'Ticket unavailable').' — Open: '.($user->isAdmin() ? '/admin/moderation?ticket='.urlencode((string) $r->ticket_code) : '/my-submissions?ticket='.urlencode((string) $r->ticket_code)))->all();
            return response()->json(['answer' => $lines ? $heading.":\n".implode("\n", $lines) : 'There are no matching approved reports available to show.']);
        }

        if (str_contains($message, 'waiting') || str_contains($message, 'approval')) {
            $countQuery = Complaint::query()->where('approval_status', Complaint::APPROVAL_PENDING)->whereNull('removed_at');
            if (! $user->isAdmin()) $countQuery->where('user_id', $user->id);
            $count = $countQuery->count();
            return response()->json(['answer' => $user->isAdmin() ? "There are {$count} reports waiting for administrator approval. Open Submission moderation → Waiting approval to review them." : "You have {$count} report(s) waiting for approval. Pending reports are shown in My Submissions, not in the public newsfeed."]);
        }
        return response()->json(['answer' => 'I can help with today’s visible updates, recent posts, waiting-for-approval counts, and your report progress. Ask “What was posted today?”, “Show my reports”, or enter a ticket code such as SS-2610-ABC123. I only use information your account is permitted to see.']);
    }
}
