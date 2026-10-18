<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Complaint;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;

class AssistantChatController extends Controller
{
    /**
     * A report as the chat lists it. The ticket code is a private reference: only the person who filed the report
     * and the barangay admins ever receive it. Everybody else gets null, so it cannot leak through the assistant.
     *
     * @return array{id:int,title:string,category:string,status:string,ticket_code:?string}
     */
    private function item(Complaint $report, User $viewer): array
    {
        return [
            'id' => $report->id,
            'title' => $report->title,
            'category' => (string) ($report->custom_category ?: $report->category),
            'status' => $report->approval_status === Complaint::APPROVAL_PENDING ? 'Waiting for approval' : (string) $report->status,
            'ticket_code' => ($viewer->isAdmin() || $report->user_id === $viewer->id) ? $report->ticket_code : null,
        ];
    }

    /**
     * Data for the pop-out the chat opens when someone presses "Open report": the same post the newsfeed shows
     * (reactions, comments, files), so it can be liked / commented on right there.
     * SECURITY: the `view` policy decides (admin, the author, or a public + approved + not removed post); anything
     * else is a plain 403, so a guessed id reveals nothing.
     */
    public function report(Request $request, Complaint $complaint, DashboardController $feed): JsonResponse
    {
        Gate::authorize('view', $complaint);
        $user = $request->user();

        return response()->json([
            'complaint' => $feed->reportPayload($complaint, $user),
            'isAdmin' => $user->isAdmin(),
            'categories' => Complaint::CATEGORIES,
            'statuses' => Complaint::STATUSES,
        ]);
    }

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate(['message' => ['required', 'string', 'max:500'], 'ticket' => ['nullable', 'string', 'max:40']]);
        $user = $request->user();
        $message = mb_strtolower(trim($data['message']));
        $base = Complaint::query();
        if (! $user->isAdmin()) {
            $base->where(fn ($q) => $q->where('user_id', $user->id)->orWhere(fn ($p) => $p->where('visibility', 'public')->where('approval_status', Complaint::APPROVAL_APPROVED)->whereNull('removed_at')));
        }
        $ticket = $data['ticket'] ?? null;
        if (! $ticket && preg_match('/SS-[A-Z0-9-]{6,30}/i', $message, $match)) {
            $ticket = strtoupper($match[0]);
        }
        if ($ticket) {
            // A ticket code is private to the person who filed the report (and the admins), so only they can look one up.
            $report = Complaint::query()->where('ticket_code', $ticket)
                ->when(! $user->isAdmin(), fn ($q) => $q->where('user_id', $user->id))->first();
            if (! $report) {
                return response()->json(['answer' => 'I could not find a report of yours with that ticket code. Please check the code or open My Submissions.']);
            }
            $latestEvent = $report->events()->latest('created_at')->first();
            $item = $this->item($report, $user);
            $answer = "Ticket {$report->ticket_code}: {$report->title}. Status: {$item['status']}. Category: {$item['category']}. Submitted: ".$report->created_at?->format('M j, Y g:i A').'.';
            if ($latestEvent?->note) {
                $answer .= ' Latest staff note: '.$latestEvent->note;
            }

            return response()->json(['answer' => $answer, 'items' => [$item]]);
        }
        if (str_contains($message, 'today') || str_contains($message, 'update') || str_contains($message, 'posted') || str_contains($message, 'latest')) {
            $today = Carbon::today();
            $posts = (clone $base)->where('created_at', '>=', $today)->where('created_at', '<', $today->copy()->addDay())
                ->where('approval_status', Complaint::APPROVAL_APPROVED)->whereNull('removed_at')->latest()->limit(8)->get(['id', 'user_id', 'ticket_code', 'title', 'category', 'custom_category', 'status', 'approval_status', 'created_at']);
            $announcements = Announcement::query()->whereDate('created_at', $today)->latest()->limit(5)->get(['title', 'body', 'created_at']);
            $lines = [];
            foreach ($announcements as $a) {
                $lines[] = '- Announcement: '.$a->title.' ('.$a->created_at?->format('g:i A').')';
            }

            return response()->json([
                'answer' => ($posts->isNotEmpty() || $lines) ? "Today's visible updates:".($lines ? "\n".implode("\n", $lines) : '') : 'There are no approved reports or announcements posted today that you can currently view.',
                'items' => $posts->map(fn ($post) => $this->item($post, $user))->values()->all(),
            ]);
        }
        if (str_contains($message, 'my report') || str_contains($message, 'my ticket') || str_contains($message, 'my submission') || str_contains($message, 'my progress')) {
            $mine = Complaint::query()->where('user_id', $user->id)->latest()->limit(10)->get();
            if ($mine->isEmpty()) {
                return response()->json(['answer' => 'You have not submitted any reports yet.']);
            }

            return response()->json(['answer' => 'Here are your latest reports:', 'items' => $mine->map(fn ($r) => $this->item($r, $user))->values()->all()]);
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

            return response()->json([
                'answer' => $items->isNotEmpty() ? $heading.':' : 'There are no matching approved reports available to show.',
                'items' => $items->map(fn ($r) => $this->item($r, $user))->values()->all(),
            ]);
        }

        if (str_contains($message, 'waiting') || str_contains($message, 'approval')) {
            $countQuery = Complaint::query()->where('approval_status', Complaint::APPROVAL_PENDING)->whereNull('removed_at');
            if (! $user->isAdmin()) {
                $countQuery->where('user_id', $user->id);
            }
            $count = $countQuery->count();

            return response()->json(['answer' => $user->isAdmin() ? "There are {$count} reports waiting for administrator approval. Open Submission moderation → Waiting approval to review them." : "You have {$count} report(s) waiting for approval. Pending reports are shown in My Submissions, not in the public newsfeed."]);
        }

        return response()->json(['answer' => 'I can help with today’s visible updates, recent posts, waiting-for-approval counts, and your report progress. Ask “What was posted today?”, “Show my reports”, or enter a ticket code such as SS-2610-ABC123. I only use information your account is permitted to see.']);
    }
}
