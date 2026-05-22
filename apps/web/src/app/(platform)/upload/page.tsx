'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import { ContentType, Privacy } from '@/types';

const CONTENT_TYPES: { value: ContentType; label: string; emoji: string }[] = [
  { value: 'FILM',         label: 'Film / Video',  emoji: '🎬' },
  { value: 'MUSIC',        label: 'Music',         emoji: '🎵' },
  { value: 'PODCAST',      label: 'Podcast',       emoji: '🎙️' },
  { value: 'SPOKEN_WORD',  label: 'Spoken Word',   emoji: '🎤' },
  { value: 'DADDYMAN_ISMS',label: 'DaddyMan-Isms', emoji: '💡' },
  { value: 'BOOK',         label: 'Book',          emoji: '📖' },
];

export default function UploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ContentType>('FILM');
  const [privacy, setPrivacy] = useState<Privacy>('PUBLIC');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [publishAt, setPublishAt] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const onDropMedia = useCallback((accepted: File[]) => {
    if (accepted[0]) setMediaFile(accepted[0]);
  }, []);

  const onDropThumb = useCallback((accepted: File[]) => {
    if (accepted[0]) setThumbFile(accepted[0]);
  }, []);

  const mediaAccept: Record<string, string[]> = type === 'BOOK'
    ? { 'application/pdf': ['.pdf'], 'application/epub+zip': ['.epub'] }
    : type === 'FILM'
      ? { 'video/mp4': ['.mp4'], 'video/webm': ['.webm'], 'video/quicktime': ['.mov'] }
      : { 'audio/mpeg': ['.mp3'], 'audio/wav': ['.wav'], 'audio/aac': ['.aac'], 'audio/flac': ['.flac'], 'audio/ogg': ['.ogg'] };

  const { getRootProps: mediaProps, getInputProps: mediaInputProps, isDragActive: mediaDrag, open: openMedia } = useDropzone({
    onDrop: onDropMedia,
    accept: mediaAccept,
    maxFiles: 1,
    noClick: true,
  });

  const { getRootProps: thumbProps, getInputProps: thumbInputProps, isDragActive: thumbDrag, open: openThumb } = useDropzone({
    onDrop: onDropThumb,
    accept: { 'image/*': [] },
    maxFiles: 1,
    noClick: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mediaFile) return setError('Please select a media file.');
    if (!title.trim()) return setError('Title is required.');

    setError('');
    setUploading(true);
    setUploadProgress(0);

    const fd = new FormData();
    fd.append('media', mediaFile);
    if (thumbFile) fd.append('thumbnail', thumbFile);
    fd.append('title', title);
    fd.append('description', description);
    fd.append('type', type);
    fd.append('privacy', privacy);
    fd.append('tags', tags);
    if (scheduleEnabled && publishAt) fd.append('publishAt', publishAt);

    try {
      const { data } = await api.post('/content/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      router.push(`/watch/${data.content.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-white mb-8">Upload Content</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-lg">{error}</p>}

        {/* Media drop zone */}
        <div {...mediaProps()} className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${mediaDrag ? 'border-brand-400 bg-brand-400/5' : 'border-surface-600'}`}>
          <input {...mediaInputProps()} />
          {mediaFile ? (
            <div>
              <p className="text-brand-400 font-medium">{mediaFile.name}</p>
              <button type="button" onClick={openMedia} className="text-xs text-gray-500 hover:text-gray-300 mt-1 transition-colors">Change file</button>
            </div>
          ) : (
            <>
              <p className="text-3xl mb-3">📁</p>
              <p className="text-gray-300 mb-3">
                {type === 'BOOK' ? 'Drag your PDF or EPUB here' : type === 'FILM' ? 'Drag your video file here' : 'Drag your audio file here'}
              </p>
              <button type="button" onClick={openMedia}
                className="px-5 py-2 bg-camp-500 hover:bg-camp-600 text-white rounded-lg text-sm font-semibold transition-colors">
                Click to select file
              </button>
              <p className="text-gray-500 text-xs mt-3">
                {type === 'BOOK'
                  ? <><span className="text-gray-400 font-medium">Book:</span> PDF, EPUB &nbsp;·&nbsp; Max 2GB</>
                  : type === 'FILM'
                    ? <><span className="text-gray-400 font-medium">Video:</span> MP4, WebM, MOV &nbsp;·&nbsp; Max 2GB</>
                    : <><span className="text-gray-400 font-medium">Audio:</span> MP3, WAV, AAC, FLAC, OGG &nbsp;·&nbsp; Max 2GB</>
                }
              </p>
            </>
          )}
        </div>

        {/* Content type */}
        <div>
          <label className="block text-sm text-gray-300 mb-2">Content Type</label>
          <div className="grid grid-cols-3 gap-2">
            {CONTENT_TYPES.map((t) => (
              <button
                key={t.value} type="button"
                onClick={() => setType(t.value)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-center ${type === t.value ? 'bg-brand-500 text-black' : 'bg-surface-700 text-gray-300 hover:bg-surface-600'}`}
              >
                <span className="block text-base mb-0.5">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required
            className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
            placeholder="Give your content a title" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors resize-none"
            placeholder="Describe your content..." />
        </div>

        {/* Privacy */}
        <div>
          <label className="block text-sm text-gray-300 mb-2">Visibility</label>
          <select value={privacy} onChange={(e) => setPrivacy(e.target.value as Privacy)}
            className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors">
            <option value="PUBLIC">Public — anyone can watch</option>
            <option value="SUBSCRIBERS_ONLY">Members Only — subscribers only</option>
            <option value="PRIVATE">Private — only you</option>
          </select>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Tags (comma-separated)</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)}
            className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
            placeholder="reggae, motivation, live" />
        </div>

        {/* Schedule */}
        <div className="bg-surface-700/50 border border-surface-600 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">Schedule for later</p>
              <p className="text-xs text-gray-500 mt-0.5">Choose a future date and time to publish automatically</p>
            </div>
            <button
              type="button"
              onClick={() => setScheduleEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${scheduleEnabled ? 'bg-brand-500' : 'bg-surface-500'}`}
              role="switch"
              aria-checked={scheduleEnabled}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${scheduleEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          {scheduleEnabled && (
            <div className="mt-3">
              <input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                min={new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 16)}
                required={scheduleEnabled}
                className="w-full bg-surface-700 border border-surface-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Thumbnail */}
        <div {...thumbProps()} className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${thumbDrag ? 'border-brand-400 bg-brand-400/5' : 'border-surface-600'}`}>
          <input {...thumbInputProps()} />
          {thumbFile ? (
            <div>
              <p className="text-brand-400 text-sm font-medium">{thumbFile.name}</p>
              <button type="button" onClick={openThumb} className="text-xs text-gray-500 hover:text-gray-300 mt-1 transition-colors">Change image</button>
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-sm mb-2">Thumbnail image (optional)</p>
              <button type="button" onClick={openThumb}
                className="px-4 py-1.5 bg-surface-600 hover:bg-surface-500 text-white rounded-lg text-xs font-medium transition-colors">
                Click to select image
              </button>
              <p className="text-gray-500 text-xs mt-2">JPG, PNG, WebP — or drag here</p>
            </>
          )}
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
              </span>
              <span className="text-brand-400 font-medium">{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
        <Button type="submit" disabled={uploading} size="lg" className="w-full">
          {uploading
            ? (uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Processing...')
            : scheduleEnabled ? 'Schedule' : 'Publish'}
        </Button>
      </form>
    </div>
  );
}
