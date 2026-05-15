'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import { ContentType, Privacy } from '@/types';

const CONTENT_TYPES: { value: ContentType; label: string; accept: string }[] = [
  { value: 'FILM', label: 'Film / Video', accept: 'video/*' },
  { value: 'MUSIC', label: 'Music / Audio', accept: 'audio/*' },
  { value: 'PODCAST', label: 'Podcast', accept: 'audio/*' },
  { value: 'SPOKEN_WORD', label: 'Spoken Word', accept: 'audio/*' },
  { value: 'DADDYMAN_ISMS', label: 'DaddyMan-Ism', accept: 'audio/*,video/*' },
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

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const onDropMedia = useCallback((accepted: File[]) => {
    if (accepted[0]) setMediaFile(accepted[0]);
  }, []);

  const onDropThumb = useCallback((accepted: File[]) => {
    if (accepted[0]) setThumbFile(accepted[0]);
  }, []);

  const { getRootProps: mediaProps, isDragActive: mediaDrag } = useDropzone({
    onDrop: onDropMedia,
    accept: { 'video/*': [], 'audio/*': [] },
    maxFiles: 1,
  });

  const { getRootProps: thumbProps, isDragActive: thumbDrag } = useDropzone({
    onDrop: onDropThumb,
    accept: { 'image/*': [] },
    maxFiles: 1,
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
        <div {...mediaProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${mediaDrag ? 'border-brand-400 bg-brand-400/5' : 'border-surface-600 hover:border-surface-500'}`}>
          {mediaFile ? (
            <p className="text-brand-400 font-medium">{mediaFile.name}</p>
          ) : (
            <>
              <p className="text-3xl mb-2">📁</p>
              <p className="text-gray-300">Drop your video or audio file here</p>
              <p className="text-gray-500 text-sm mt-1">MP4, MOV, MP3, WAV, AAC, FLAC up to 2GB</p>
            </>
          )}
        </div>

        {/* Content type */}
        <div>
          <label className="block text-sm text-gray-300 mb-2">Content Type</label>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_TYPES.map((t) => (
              <button
                key={t.value} type="button"
                onClick={() => setType(t.value)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${type === t.value ? 'bg-brand-500 text-black' : 'bg-surface-700 text-gray-300 hover:bg-surface-600'}`}
              >
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

        {/* Thumbnail */}
        <div {...thumbProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${thumbDrag ? 'border-brand-400 bg-brand-400/5' : 'border-surface-600 hover:border-surface-500'}`}>
          {thumbFile ? (
            <p className="text-brand-400 text-sm font-medium">{thumbFile.name}</p>
          ) : (
            <>
              <p className="text-gray-400 text-sm">Drop thumbnail image here (optional)</p>
              <p className="text-gray-500 text-xs mt-1">JPG, PNG, WebP</p>
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
          {uploading ? (uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Processing...') : 'Publish'}
        </Button>
      </form>
    </div>
  );
}
