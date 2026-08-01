'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, Feather, ImagePlus, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  deleteArticleImage,
  getActiveChallenge,
  getMySubmission,
  submitStory,
  updateStory,
  uploadArticleImage,
  getChallengePhase,
  type StoryChallenge,
  type Story,
} from '@/lib/stories';

const TITLE_MIN = 3;
const TITLE_MAX = 80;
const CONTENT_MIN_WORDS = 100;
const CONTENT_MAX_WORDS = 1000;
const CONTENT_MAX_CHARS = 8000;

function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function articlePrompt(prompt: string): string {
  return prompt.replace(/\bshort story\b/gi, 'short article').replace(/\bstory\b/gi, 'article');
}

export default function SubmitArticlePage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [challenge, setChallenge] = useState<StoryChallenge | null>(null);
  const [existing, setExisting] = useState<Story | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const active = await getActiveChallenge();
      setChallenge(active);
      if (active) {
        const mine = await getMySubmission(active.id, user.id);
        setExisting(mine);
        if (mine) {
          setTitle(mine.title);
          setContent(mine.content);
          setImagePreview(mine.image_url);
        }
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load the article challenge.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const phase = challenge ? getChallengePhase(challenge) : null;
  const wordCount = countWords(content);
  const titleValid = title.trim().length >= TITLE_MIN && title.trim().length <= TITLE_MAX;
  const contentValid = wordCount >= CONTENT_MIN_WORDS && wordCount <= CONTENT_MAX_WORDS;
  const canSubmit = titleValid && contentValid && phase === 'submissions' && !saving;

  const chooseImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Choose a JPG, PNG, WebP, or GIF image.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('The cover image must be 5 MB or smaller.'); return; }
    setError(null);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(objectUrlRef.current);
    setRemoveExistingImage(false);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveExistingImage(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!user || !challenge || !canSubmit) return;
    setSaving(true);
    setError(null);
    let uploadedUrl: string | null = null;
    try {
      let finalImageUrl = removeExistingImage ? null : existing?.image_url ?? null;
      if (imageFile) {
        uploadedUrl = await uploadArticleImage(imageFile, user.id);
        finalImageUrl = uploadedUrl;
      }
      if (existing) await updateStory(existing.id, title.trim(), content.trim(), finalImageUrl);
      else await submitStory(challenge.id, title.trim(), content.trim(), user.id, finalImageUrl);

      if (existing?.image_url && existing.image_url !== finalImageUrl) {
        await deleteArticleImage(existing.image_url, user.id);
      }
      router.push('/app/stories');
    } catch (e) {
      if (uploadedUrl) await deleteArticleImage(uploadedUrl, user.id);
      setError((e as Error).message || 'Failed to publish the article.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-24 max-w-3xl mx-auto">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/app/stories" className="text-text-muted hover:text-text-primary transition"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted mb-1">Community</p>
            <h1 className="text-2xl font-serif">{existing ? 'Edit Your Article' : 'Create a Short Article'}</h1>
          </div>
        </div>
        {!loading && challenge && phase === 'submissions' && (
          <button onClick={() => setShowPreview((value) => !value)} className="inline-flex items-center gap-2 border border-border rounded-xl px-3 py-2 text-xs font-mono text-text-muted hover:text-text-primary">
            <Eye className="w-4 h-4" /> {showPreview ? 'Edit' : 'Preview'}
          </button>
        )}
      </header>

      {error && <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 text-sm text-red-400 font-mono">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-text-muted font-mono text-sm">Loading article composer...</div>
      ) : !challenge || phase !== 'submissions' ? (
        <div className="bg-surface border border-border rounded-3xl p-8 text-center space-y-2">
          <Feather className="w-8 h-8 text-accent mx-auto" />
          <h3 className="font-serif text-lg">Article submissions aren&apos;t open</h3>
          <p className="text-xs font-mono text-text-muted">{challenge ? 'This submission window has closed.' : 'There is no active article challenge right now.'}</p>
        </div>
      ) : showPreview ? (
        <article className="bg-surface border border-border rounded-3xl overflow-hidden">
          {imagePreview && <div className="aspect-[16/9] bg-cover bg-center" style={{ backgroundImage: `url(${imagePreview})` }} role="img" aria-label="Article cover" />}
          <div className="p-6 sm:p-8 space-y-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-accent">Short Article</p>
            <h2 className="font-serif text-3xl leading-tight">{title.trim() || 'Your headline appears here'}</h2>
            <p className="text-xs font-mono text-text-muted">by {user?.user_metadata?.username || user?.email?.split('@')[0] || 'you'} · {wordCount} words</p>
            <div className="whitespace-pre-wrap text-sm sm:text-base leading-7 text-text-primary/90">{content.trim() || 'Your article will appear here.'}</div>
          </div>
        </article>
      ) : (
        <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-xl shadow-black/10">
          <div className="p-5 sm:p-7 border-b border-border space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-accent">Monthly prompt</p>
            <p className="font-serif italic text-text-muted">{articlePrompt(challenge.prompt)}</p>
          </div>

          <div className="relative aspect-[16/7] bg-bg/50 border-b border-border group">
            {imagePreview ? (
              <>
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imagePreview})` }} role="img" aria-label="Selected article cover" />
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                  <button onClick={() => fileInputRef.current?.click()} className="bg-white text-black rounded-xl px-4 py-2 text-xs font-mono font-bold">Replace image</button>
                  <button onClick={removeImage} className="bg-red-500 text-white rounded-xl p-2.5" aria-label="Remove image"><Trash2 className="w-4 h-4" /></button>
                </div>
              </>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 w-full flex flex-col items-center justify-center gap-2 text-text-muted hover:text-accent hover:bg-accent/5 transition">
                <span className="w-12 h-12 rounded-full border border-border flex items-center justify-center"><ImagePlus className="w-5 h-5" /></span>
                <span className="text-xs font-mono">Add a cover image</span>
                <span className="text-[10px] font-mono opacity-60">JPG, PNG, WebP or GIF · max 5 MB</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => chooseImage(event.target.files?.[0])} className="hidden" />
          </div>

          <div className="p-5 sm:p-7 space-y-6">
            <div className="space-y-1.5">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Write a clear headline" maxLength={TITLE_MAX} className="w-full bg-transparent border-0 border-b border-border px-0 py-3 font-serif text-2xl sm:text-3xl focus:outline-none focus:border-accent placeholder:text-text-muted/45" />
              <p className={`text-[10px] font-mono text-right ${title.length > TITLE_MAX ? 'text-red-400' : 'text-text-muted'}`}>{title.length}/{TITLE_MAX} characters</p>
            </div>

            <div className="space-y-1.5">
              <textarea value={content} onChange={(event) => setContent(event.target.value.slice(0, CONTENT_MAX_CHARS))} placeholder="Share your perspective, experience, or insight..." rows={16} className="w-full bg-transparent border-0 px-0 py-2 text-sm sm:text-base leading-7 resize-none focus:outline-none placeholder:text-text-muted/45" />
              <div className="flex justify-between gap-3 text-[10px] font-mono">
                <span className="text-text-muted">Short article: {CONTENT_MIN_WORDS}–{CONTENT_MAX_WORDS} words</span>
                <span className={wordCount > CONTENT_MAX_WORDS ? 'text-red-400' : wordCount >= CONTENT_MIN_WORDS ? 'text-accent' : 'text-text-muted'}>{wordCount} words</span>
              </div>
            </div>

            <button onClick={handleSubmit} disabled={!canSubmit} className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-gold disabled:opacity-40 disabled:cursor-not-allowed text-bg font-serif text-lg font-bold py-4 rounded-2xl transition shadow-lg shadow-accent/15">
              <Upload className="w-4 h-4" /> {saving ? 'Publishing...' : existing ? 'Update Article' : 'Publish Article'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
