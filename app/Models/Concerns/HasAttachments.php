<?php

namespace App\Models\Concerns;

use App\Models\Attachment;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Lets a model (Announcement, Complaint) own uploaded files.
 * Deleting the model also deletes its files from disk, so no orphans pile up.
 */
trait HasAttachments
{
    public const MAX_ATTACHMENTS = 5;

    public const ATTACHMENT_TYPES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

    public const ATTACHMENT_MAX_KB = 10240; // 10 MB

    protected static function bootHasAttachments(): void
    {
        static::deleting(function ($model): void {
            $model->deleteAllAttachments();
        });
    }

    /** @return MorphMany<Attachment, $this> */
    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable')->oldest('id');
    }

    /**
     * Validation rules shared by every form that accepts files.
     *
     * @return array<string, array<int, mixed>>
     */
    public static function attachmentRules(): array
    {
        return [
            'files' => ['nullable', 'array', 'max:'.self::MAX_ATTACHMENTS],
            'files.*' => ['file', 'mimes:'.implode(',', self::ATTACHMENT_TYPES), 'max:'.self::ATTACHMENT_MAX_KB],
            'remove_files' => ['nullable', 'array'],
            'remove_files.*' => ['integer'],
        ];
    }

    /**
     * Remove the files the person ticked, then store the new uploads. The 5-file cap counts what is left.
     *
     * @param  array<int, UploadedFile>  $uploads
     * @param  array<int, int|string>  $removeIds
     */
    public function syncAttachments(array $uploads, array $removeIds, ?int $userId): void
    {
        $remove = array_map('intval', $removeIds);
        $remaining = $this->attachments()->whereNotIn('id', $remove ?: [0])->count();

        if ($remaining + count($uploads) > self::MAX_ATTACHMENTS) {
            throw ValidationException::withMessages([
                'files' => 'You can attach up to '.self::MAX_ATTACHMENTS.' files per post.',
            ]);
        }

        if ($remove) {
            // Only this post's own files can be removed (a forged id for someone else's file does nothing).
            foreach ($this->attachments()->whereIn('id', $remove)->get() as $file) {
                $path = $file->path;
                $file->delete();
                // Filesystem deletion must wait until the database transaction commits; otherwise a rollback
                // could restore the attachment row while its file has already been destroyed.
                DB::afterCommit(static fn () => Storage::disk('public')->delete($path));
            }
        }

        $newPaths = [];
        try {
            foreach ($uploads as $upload) {
                $stored = $upload->store('attachments', 'public');

                if ($stored === false) {
                    throw ValidationException::withMessages(['files' => 'An attachment could not be saved. Please try again.']);
                }
                $newPaths[] = $stored;

                // Never trust the browser's name: strip tags / control characters and cap the length.
                $name = trim((string) preg_replace('/[\x00-\x1F\x7F\/\\\\]+/u', '', strip_tags($upload->getClientOriginalName())));

                $this->attachments()->create([
                    'user_id' => $userId,
                    'path' => $stored,
                    'original_name' => Str::limit($name !== '' ? $name : 'file', 150, ''),
                    'mime' => (string) $upload->getMimeType(), // sniffed from the file content, not the browser's claim
                    'size' => (int) $upload->getSize(),
                ]);
            }
        } catch (\Throwable $exception) {
            foreach ($newPaths as $path) {
                Storage::disk('public')->delete($path);
            }
            throw $exception;
        }
    }

    public function deleteAllAttachments(): void
    {
        foreach ($this->attachments()->get() as $file) {
            $path = $file->path;
            $file->delete();
            DB::afterCommit(static fn () => Storage::disk('public')->delete($path));
        }
    }

    /** @return array<int, array{id: int, name: string, size: int, is_pdf: bool, url: string, download_url: string}> */
    public function presentAttachments(): array
    {
        return $this->attachments->map(fn (Attachment $a) => $a->present())->values()->all();
    }
}
