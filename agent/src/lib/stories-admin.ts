import { supabase } from './supabase';

export interface OpenChallengeFields {
  title: string;
  prompt: string;
  submissionsOpenAt: string;
  submissionsCloseAt: string;
  votingCloseAt: string;
}

export interface OpenChallengeResult {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}

export async function openStoryChallenge(fields: OpenChallengeFields): Promise<OpenChallengeResult> {
  if (!supabase) return { ok: false, status: 500, body: { error: 'Supabase client not initialized' } };

  const { title, prompt, submissionsOpenAt, submissionsCloseAt, votingCloseAt } = fields;
  if (!title || !prompt || !submissionsOpenAt || !submissionsCloseAt || !votingCloseAt) {
    return { ok: false, status: 400, body: { error: 'Missing required challenge fields' } };
  }

  const openAt = new Date(submissionsOpenAt);
  const closeAt = new Date(submissionsCloseAt);
  const voteCloseAt = new Date(votingCloseAt);
  if (isNaN(openAt.getTime()) || isNaN(closeAt.getTime()) || isNaN(voteCloseAt.getTime())) {
    return { ok: false, status: 400, body: { error: 'Invalid date value' } };
  }
  if (!(closeAt > openAt) || !(voteCloseAt > closeAt)) {
    return { ok: false, status: 400, body: { error: 'Dates must satisfy: open < submissions close < voting close' } };
  }

  const { data, error } = await supabase
    .from('story_challenges')
    .insert({
      title,
      prompt,
      submissions_open_at: openAt.toISOString(),
      submissions_close_at: closeAt.toISOString(),
      voting_close_at: voteCloseAt.toISOString(),
    })
    .select()
    .single();

  if (error) return { ok: false, status: 500, body: { error: error.message } };
  return { ok: true, status: 200, body: { success: true, challenge: data } };
}

export interface FinalizeResult {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}

/** Finalizes a specific challenge if given, otherwise every past-due unfinalized one. */
export async function finalizeStoryChallenges(challengeId?: string): Promise<FinalizeResult> {
  if (!supabase) return { ok: false, status: 500, body: { error: 'Supabase client not initialized' } };

  let query = supabase
    .from('story_challenges')
    .select('id')
    .is('winner_story_id', null)
    .lte('voting_close_at', new Date().toISOString());

  if (challengeId) query = query.eq('id', challengeId);

  const { data: pending, error: fetchError } = await query;
  if (fetchError) return { ok: false, status: 500, body: { error: fetchError.message } };

  if (!pending || pending.length === 0) {
    return { ok: true, status: 200, body: { success: true, finalized: 0 } };
  }

  let finalized = 0;
  for (const challenge of pending) {
    const { data: topStory, error: topError } = await supabase
      .from('stories')
      .select('id')
      .eq('challenge_id', challenge.id)
      .eq('status', 'published')
      .order('vote_count', { ascending: false })
      .order('created_at', { ascending: true }) // tie-break: earliest submission
      .limit(1)
      .maybeSingle();

    if (topError) {
      console.error(`[STORIES] Failed to pick winner for challenge ${challenge.id}:`, topError.message);
      continue;
    }
    if (!topStory) continue; // no eligible submissions — leave unfinalized

    const { error: updateError } = await supabase
      .from('story_challenges')
      .update({ winner_story_id: topStory.id })
      .eq('id', challenge.id)
      .is('winner_story_id', null); // compare-and-swap: don't clobber a concurrent finalize

    if (updateError) {
      console.error(`[STORIES] Failed to set winner for challenge ${challenge.id}:`, updateError.message);
      continue;
    }
    finalized++;
  }

  return { ok: true, status: 200, body: { success: true, finalized } };
}

export interface ChallengeWithStats {
  id: string;
  title: string;
  prompt: string;
  submissions_open_at: string;
  submissions_close_at: string;
  voting_close_at: string;
  winner_story_id: string | null;
  created_at: string;
  submission_count: number;
  total_votes: number;
  winner_title: string | null;
}

/** For the admin dashboard's monitoring table. */
export async function listStoryChallengesWithStats(): Promise<ChallengeWithStats[]> {
  if (!supabase) return [];

  const { data: challenges, error } = await supabase
    .from('story_challenges')
    .select('*')
    .order('submissions_open_at', { ascending: false });

  if (error || !challenges) return [];

  const { data: stories } = await supabase
    .from('stories')
    .select('id, challenge_id, title, vote_count');

  return challenges.map((c) => {
    const rows = (stories ?? []).filter((s) => s.challenge_id === c.id);
    const winner = c.winner_story_id ? rows.find((s) => s.id === c.winner_story_id) : null;
    return {
      ...c,
      submission_count: rows.length,
      total_votes: rows.reduce((sum, s) => sum + (s.vote_count ?? 0), 0),
      winner_title: winner?.title ?? null,
    };
  });
}
