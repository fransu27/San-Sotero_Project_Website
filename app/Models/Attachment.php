<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * A file (PDF / Word / Excel / PowerPoint) attached to an announcement or a complaint.
 * The file itself lives on the "public" disk under attachments/ with a random name, but it is NEVER linked
 * directly: it is streamed by AttachmentController, which checks who may see the parent post first.
 *
 * @property int $id
 * @property string $attachable_type
 * @property int $attachable_id
 * @property int|null $user_id
 * @property string $path
 * @property string $original_name
 * @property string $mime
 * @property int $size
 */
class Attachment extends Model
{
    protected $fillable = ['attachable_type', 'attachable_id', 'user_id', 'path', 'original_name', 'mime', 'size'];

    /** @return MorphTo<Model, $this> */
    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    /** Only real PDFs (sniffed from the file content at upload time) can be previewed in the browser. */
    public function isPdf(): bool
    {
        return $this->mime === 'application/pdf';
    }

    /** The shape React receives. */
    /** @return array{id: int, name: string, size: int, is_pdf: bool, url: string, download_url: string} */
    public function present(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->original_name,
            'size' => (int) $this->size,
            'is_pdf' => $this->isPdf(),
            'url' => '/attachments/'.$this->id,
            'download_url' => '/attachments/'.$this->id.'?download=1',
        ];
    }
}
