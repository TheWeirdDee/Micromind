import { supabase } from '@/lib/supabase';

export interface StoryChallenge {
  id: string;
  title: string;
  prompt: string;
  submissions_open_at: string;
  submissions_close_at: string;
  voting_close_at: string;
  winner_story_id: string | null;
  created_at: string;
}

export interface Story {
  id: string;
  challenge_id: string;
  user_id: string;
  title: string;
  content: string;
  image_url: string | null;
  vote_count: number;
  status: 'published' | 'hidden';
  created_at: string;
  updated_at: string;
  author_username?: string;
}

export type ChallengePhase = 'submissions' | 'voting' | 'ended' | 'upcoming';

export function getChallengePhase(challenge: StoryChallenge): ChallengePhase {
  const now = Date.now();
  const opens = new Date(challenge.submissions_open_at).getTime();
  const closes = new Date(challenge.submissions_close_at).getTime();
  const votingCloses = new Date(challenge.voting_close_at).getTime();

  if (now < opens) return 'upcoming';
  if (now < closes) return 'submissions';
  if (now < votingCloses) return 'voting';
  return 'ended';
}

/** The most recent challenge whose submissions/voting window hasn't fully closed yet. */
export async function getActiveChallenge(): Promise<StoryChallenge | null> {
  const { data, error } = await supabase
    .from('story_challenges')
    .select('*')
    .gt('voting_close_at', new Date().toISOString())
    .order('submissions_open_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getPastChallenges(limit = 10): Promise<StoryChallenge[]> {
  const { data, error } = await supabase
    .from('story_challenges')
    .select('*')
    .lte('voting_close_at', new Date().toISOString())
    .order('submissions_open_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Stories for a challenge, ranked by vote count, joined with the author's public username. */
export async function getStoriesForChallenge(challengeId: string): Promise<Story[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('status', 'published')
    .order('vote_count', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  const stories = (data ?? []) as Story[];
  const userIds = [...new Set(stories.map((story) => story.user_id))];
  if (userIds.length === 0) return stories;

  // public_profiles is a privacy-safe view, not a table related by a foreign
  // key, so PostgREST cannot embed it in the stories query. Fetch names in a
  // second query and join them client-side instead.
  const { data: profiles, error: profileError } = await supabase
    .from('public_profiles')
    .select('id, username')
    .in('id', userIds);
  if (profileError) throw new Error(profileError.message);

  const usernameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
  return stories.map((story) => ({ ...story, author_username: usernameById.get(story.user_id) }));
}

export async function getMySubmission(challengeId: string, userId: string): Promise<Story | null> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function submitStory(challengeId: string, title: string, content: string, userId: string, imageUrl: string | null): Promise<Story> {
  const { data, error } = await supabase
    .from('stories')
    .insert({ challenge_id: challengeId, user_id: userId, title, content, image_url: imageUrl })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateStory(storyId: string, title: string, content: string, imageUrl: string | null): Promise<void> {
  const { error } = await supabase
    .from('stories')
    .update({ title, content, image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('id', storyId);

  if (error) throw new Error(error.message);
}

/** The story (if any) the current user voted for in this challenge. */
export async function getMyVote(challengeId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('story_votes')
    .select('story_id')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.story_id ?? null;
}

/** Cast (or move) this challenge's single vote to `storyId`. */
export async function castVote(challengeId: string, storyId: string, userId: string): Promise<void> {
  const existing = await getMyVote(challengeId, userId);
  if (existing === storyId) return;

  if (existing) {
    const { error: deleteError } = await supabase
      .from('story_votes')
      .delete()
      .eq('challenge_id', challengeId)
      .eq('user_id', userId);
    if (deleteError) throw new Error(deleteError.message);
  }

  const { error } = await supabase
    .from('story_votes')
    .insert({ challenge_id: challengeId, story_id: storyId, user_id: userId });
  if (error) throw new Error(error.message);
}

export async function retractVote(challengeId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('story_votes')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}
const ARTICLE_IMAGE_BUCKET = 'article-images';

export async function uploadArticleImage(file: File, userId: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('The image must be 5 MB or smaller.');
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(ARTICLE_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from(ARTICLE_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deleteArticleImage(publicUrl: string, userId: string): Promise<void> {
  const marker = `/${ARTICLE_IMAGE_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index < 0) return;
  const path = decodeURIComponent(publicUrl.slice(index + marker.length));
  if (!path.startsWith(`${userId}/`)) return;
  const { error } = await supabase.storage.from(ARTICLE_IMAGE_BUCKET).remove([path]);
  if (error) console.warn('Failed to remove replaced article image', error);
}
