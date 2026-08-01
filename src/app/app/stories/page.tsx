'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Feather, Trophy, Heart, ArrowLeft, Clock, Sparkles, Share2, Check, Gift, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  getActiveChallenge,
  getPastChallenges,
  getStoriesForChallenge,
  getMySubmission,
  getMyVote,
  castVote,
  getChallengePhase,
  type StoryChallenge,
  type Story,
} from '@/lib/stories';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 95, damping: 14 } },
} as const;

function articleCopy(value: string): string {
  return value.replace(/\bshort story\b/gi, 'short article').replace(/\bstories\b/gi, 'articles').replace(/\bstory\b/gi, 'article');
}

function readingStats(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return words + ' words · ' + Math.max(1, Math.ceil(words / 200)) + ' min read';
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function StoriesPage() {
  const { user } = useAuth();

  const [challenge, setChallenge] = useState<StoryChallenge | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [mySubmission, setMySubmission] = useState<Story | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [pastChallenges, setPastChallenges] = useState<StoryChallenge[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [voting, setVoting] = useState<string | null>(null);
  const [shared, setShared] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [active, past] = await Promise.all([getActiveChallenge(), getPastChallenges(5)]);
      setChallenge(active);
      setPastChallenges(past);

      if (active) {
        const list = await getStoriesForChallenge(active.id);
        setStories(list);
        if (user) {
          const [submission, vote] = await Promise.all([
            getMySubmission(active.id, user.id),
            getMyVote(active.id, user.id),
          ]);
          setMySubmission(submission);
          setMyVote(vote);
        }
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load article challenge');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleVote = async (storyId: string) => {
    if (!user || !challenge) return;
    setVoting(storyId);
    setError(null);
    try {
      await castVote(challenge.id, storyId, user.id);
      setMyVote(storyId);
    } catch (e) {
      setError((e as Error).message || 'Failed to cast vote');
    } finally {
      setVoting(null);
    }
  };

  const handleShare = async (story: Story) => {
    const url = `${window.location.origin}/app/stories?article=${encodeURIComponent(story.id)}`;
    const shareData = { title: story.title, text: `Read “${story.title}” on MicroMind`, url };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(url);
      setShared(story.id);
      window.setTimeout(() => setShared((current) => current === story.id ? null : current), 2200);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      try { await navigator.clipboard.writeText(url); setShared(story.id); } catch { setError('Could not share this article. Copy the page address and try again.'); }
    }
  };

  useEffect(() => {
    if (!stories.length) return;
    const articleId = new URLSearchParams(window.location.search).get('article');
    if (!articleId || !stories.some((story) => story.id === articleId)) return;
    const timer = window.setTimeout(() => {
      setExpanded(articleId);
      document.getElementById(`article-${articleId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [stories]);
  const phase = challenge ? getChallengePhase(challenge) : null;
  const winnerStory = challenge?.winner_story_id
    ? stories.find((s) => s.id === challenge.winner_story_id)
    : null;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 pb-24">
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <Link href="/app/tools" className="text-text-muted hover:text-text-primary transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted mb-1">Community</p>
          <h1 className="text-2xl font-serif">Short Article Challenge</h1>
        </div>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 text-sm text-red-400 font-mono">
          {error}
        </motion.div>
      )}

      {loading ? (
        <motion.div variants={itemVariants} className="text-center py-12 text-text-muted font-mono text-sm">
          Loading challenge...
        </motion.div>
      ) : !challenge ? (
        <motion.div variants={itemVariants} className="bg-surface border border-border rounded-3xl p-8 text-center space-y-2">
          <Feather className="w-8 h-8 text-accent mx-auto" />
          <h3 className="font-serif text-lg">No active challenge right now</h3>
          <p className="text-xs font-mono text-text-muted">Check back soon — a new monthly prompt is on the way.</p>
        </motion.div>
      ) : (
        <>
          <motion.div variants={itemVariants} className="bg-surface border border-border rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/25">
                {phase === 'submissions' && 'Submissions Open'}
                {phase === 'voting' && 'Voting Open'}
                {phase === 'ended' && 'Challenge Ended'}
                {phase === 'upcoming' && 'Opens Soon'}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
                <Clock className="w-3.5 h-3.5" />
                {phase === 'submissions' && `Submit by ${formatDeadline(challenge.submissions_close_at)}`}
                {phase === 'voting' && `Voting ends ${formatDeadline(challenge.voting_close_at)}`}
                {phase === 'ended' && `Ended ${formatDeadline(challenge.voting_close_at)}`}
              </span>
            </div>
            <h2 className="font-serif text-xl font-bold">{challenge.title}</h2>
            <p className="text-sm text-text-muted leading-relaxed">{articleCopy(challenge.prompt)}</p>

            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="rounded-2xl border border-border bg-bg/40 p-4 flex gap-3">
                <Gift className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div><p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">What the winner receives</p><p className="text-xs leading-relaxed mt-1">{challenge.prize_description || 'Community Winner recognition and featured placement. No cash or token prize has been announced for this challenge.'}</p></div>
              </div>
              <div className="rounded-2xl border border-border bg-bg/40 p-4 flex gap-3">
                <Trophy className="w-4 h-4 text-accent-gold shrink-0 mt-0.5" />
                <div><p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">How to win</p><p className="text-xs leading-relaxed mt-1">The eligible published article with the most community votes wins. If votes are tied, the earlier submission wins.</p></div>
              </div>
              <div className="rounded-2xl border border-border bg-bg/40 p-4 flex gap-3 sm:col-span-2">
                <ListChecks className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                <div><p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Eligibility and voting rules</p><p className="text-xs leading-relaxed mt-1">Submit one original 100–1,000 word short article with a 3–80 character title before submissions close. Each signed-in user has one vote, cannot vote for their own article, and may vote only during the voting window. Hidden or disqualified submissions cannot win.</p></div>
              </div>
            </div>

            {phase === 'submissions' && user && (
              <Link
                href="/app/stories/submit"
                className="inline-flex items-center gap-2 bg-accent hover:bg-accent-gold text-bg font-serif font-bold text-sm px-5 py-3 rounded-2xl transition shadow-lg shadow-accent/15"
              >
                <Feather className="w-4 h-4" />
                {mySubmission ? 'Edit your article' : 'Write your article'}
              </Link>
            )}
          </motion.div>

          {winnerStory && (
            <motion.div variants={itemVariants} className="bg-accent/10 border border-accent/25 rounded-3xl p-6 space-y-2 text-center">
              <Trophy className="w-7 h-7 text-accent mx-auto" />
              <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Winning Article</p>
              <h3 className="font-serif text-lg font-bold">{winnerStory.title}</h3>
              <p className="text-xs font-mono text-text-muted">by {winnerStory.author_username ?? 'anonymous'}</p>
            </motion.div>
          )}

          <motion.div variants={containerVariants} className="space-y-3">
            {stories.length === 0 ? (
              <motion.div variants={itemVariants} className="text-center py-8 text-text-muted font-mono text-xs">
                No submissions yet — be the first to write one.
              </motion.div>
            ) : (
              stories.map((story) => {
                const isExpanded = expanded === story.id;
                const isMine = story.user_id === user?.id;
                const isMyVote = myVote === story.id;
                const canVote = phase === 'voting' && !isMine && user;

                return (
                  <motion.div
                    key={story.id}
                    variants={itemVariants}
                    id={`article-${story.id}`}
                    className={`bg-surface border rounded-2xl p-5 space-y-2 transition ${
                      isMyVote ? 'border-accent/40' : 'border-border'
                    }`}
                  >
                    {story.image_url && (
                      <div className="-mx-5 -mt-5 mb-4 h-44 sm:h-56 lg:mx-auto lg:mt-0 lg:h-64 lg:max-w-3xl lg:rounded-xl bg-contain bg-no-repeat bg-center bg-bg border-b lg:border border-border" style={{ backgroundImage: `url(${story.image_url})` }} role="img" aria-label={`${story.title} cover`} />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-serif text-base font-bold">{story.title}</h4>
                        <p className="text-[11px] font-mono text-text-muted">
                          by {story.author_username ?? 'anonymous'}{isMine && ' (you)'}
                        </p>
                        <p className="text-[10px] font-mono text-text-muted/70 mt-0.5">{readingStats(story.content)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => void handleShare(story)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-mono text-text-muted hover:text-accent hover:border-accent/40 transition" aria-label={`Share ${story.title}`}>
                          {shared === story.id ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">{shared === story.id ? 'Copied' : 'Share'}</span>
                        </button>
                        <button
                          onClick={() => canVote && handleVote(story.id)}
                          disabled={!canVote || voting === story.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition ${
                            isMyVote
                              ? 'bg-accent text-bg border-accent'
                              : canVote
                              ? 'border-border hover:border-accent/40 text-text-muted hover:text-accent cursor-pointer'
                              : 'border-border/40 text-text-muted/50 cursor-not-allowed'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isMyVote ? 'fill-bg' : ''}`} />
                          {story.vote_count}
                        </button>
                      </div>
                    </div>

                    <p className={`text-sm text-text-muted leading-relaxed whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
                      {story.content}
                    </p>
                    {story.content.length > 220 && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : story.id)}
                        className="text-[11px] font-mono text-accent hover:underline"
                      >
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </>
      )}

      {pastChallenges.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3 pt-4 border-t border-border/40">
          <h3 className="text-sm font-mono uppercase tracking-widest text-text-muted flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Past Challenges
          </h3>
          {pastChallenges.map((c) => (
            <div key={c.id} className="bg-surface/60 border border-border/60 rounded-xl p-3 text-xs font-mono text-text-muted flex justify-between">
              <span>{c.title}</span>
              <span>{formatDeadline(c.submissions_open_at)} – {formatDeadline(c.voting_close_at)}</span>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
