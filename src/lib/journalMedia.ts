// Encrypted image upload/fetch for journal entries, and voice-note transcription.
// Images: compressed client-side, then AES-GCM encrypted with the same journalKey
// used for entry text, then uploaded to the private `journal-images` Storage bucket.
// The `image` column on journal_entries stores only a small JSON envelope
// ({__enc:true, path, iv}) pointing at the encrypted object — never the bytes inline.

import { getJournalKey } from './journal';
import { compressImage } from './imageCompression';

interface ImageEnvelope {
  __enc: true;
  path: string;
  iv: string;
  mime?: string;
}

/**
 * Compresses, encrypts, and uploads an image for a journal entry.
 * Returns the JSON envelope string to store in the entry's `image` field.
 */
export async function uploadJournalImage(entryId: string, file: File): Promise<string> {
  const key = getJournalKey();
  if (!key) throw new Error('No encryption key available — please sign in again.');

  const { supabase } = await import('./supabase');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in required to attach an image.');

  const { encryptBytes } = await import('./crypto');
  const compressed = await compressImage(file, { maxDimension: 1600, quality: 0.72 });
  const buffer = await compressed.arrayBuffer();
  const { ciphertext, iv } = await encryptBytes(buffer, key);

  const path = `${session.user.id}/${entryId}.enc`;
  const { error } = await supabase.storage
    .from('journal-images')
    .upload(path, ciphertext, { contentType: 'application/octet-stream', upsert: true });
  if (error) throw error;

  const envelope: ImageEnvelope = { __enc: true, path, iv, mime: compressed.type };
  return JSON.stringify(envelope);
}

/** Downloads and decrypts a journal image, returning an object URL for display. Caller must revoke it when done. */
export async function fetchJournalImage(raw: string): Promise<string | null> {
  let parsed: Partial<ImageEnvelope>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed.__enc || !parsed.path || !parsed.iv) return null;

  const key = getJournalKey();
  if (!key) return null;

  const { supabase } = await import('./supabase');
  const { data, error } = await supabase.storage.from('journal-images').download(parsed.path);
  if (error || !data) return null;

  const { decryptBytes } = await import('./crypto');
  const ciphertext = await data.arrayBuffer();
  try {
    const plaintext = await decryptBytes(ciphertext, parsed.iv, key);
    const blob = new Blob([plaintext], { type: parsed.mime || 'image/jpeg' });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/** Deletes the encrypted image object backing a journal entry, if any. */
export async function deleteJournalImage(raw: string): Promise<void> {
  let parsed: Partial<ImageEnvelope>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!parsed.__enc || !parsed.path) return;
  const { supabase } = await import('./supabase');
  await supabase.storage.from('journal-images').remove([parsed.path]);
}

/** Sends a recorded voice note to the agent for transcription. Returns the transcribed text. */
export async function transcribeVoiceNote(blob: Blob): Promise<string> {
  const { supabase } = await import('./supabase');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in required to use voice dictation.');

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;
  if (!agentUrl) throw new Error('Voice dictation is not configured.');

  const formData = new FormData();
  formData.append('audio', blob, 'note.webm');

  const res = await fetch(`${agentUrl}/api/transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Transcription failed');
  }

  const { text } = await res.json();
  return text as string;
}
