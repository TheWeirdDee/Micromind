const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;

function authHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function handle<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export async function checkIsAdmin(token: string): Promise<boolean> {
  const res = await fetch(`${agentUrl}/api/admin/check`, { headers: authHeaders(token) });
  const body = await handle<{ isAdmin: boolean }>(res);
  return body.isAdmin;
}

export interface AdminChallenge {
  id: string;
  title: string;
  prompt: string;
  submissions_open_at: string;
  submissions_close_at: string;
  voting_close_at: string;
  winner_story_id: string | null;
  prize_description?: string | null;
  winner_title: string | null;
  submission_count: number;
  total_votes: number;
  created_at: string;
}

export async function fetchAdminChallenges(token: string): Promise<AdminChallenge[]> {
  const res = await fetch(`${agentUrl}/api/admin/stories/challenges`, { headers: authHeaders(token) });
  const body = await handle<{ challenges: AdminChallenge[] }>(res);
  return body.challenges;
}

export interface OpenChallengeInput {
  title: string;
  prompt: string;
  submissionsOpenAt: string;
  submissionsCloseAt: string;
  votingCloseAt: string;
  prizeDescription: string;
}

export async function openChallenge(token: string, input: OpenChallengeInput): Promise<void> {
  const res = await fetch(`${agentUrl}/api/admin/stories/challenges/open`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  await handle(res);
}

export async function finalizeChallenge(token: string, challengeId: string): Promise<{ finalized: number }> {
  const res = await fetch(`${agentUrl}/api/admin/stories/challenges/finalize`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ challengeId }),
  });
  return handle(res);
}

export interface AdminEntry {
  user_id: string;
  email: string;
  created_at: string;
}

export async function fetchAdmins(token: string): Promise<AdminEntry[]> {
  const res = await fetch(`${agentUrl}/api/admin/admins`, { headers: authHeaders(token) });
  const body = await handle<{ admins: AdminEntry[] }>(res);
  return body.admins;
}

export async function addAdmin(token: string, email: string): Promise<void> {
  const res = await fetch(`${agentUrl}/api/admin/admins`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ email }),
  });
  await handle(res);
}

export async function removeAdmin(token: string, userId: string): Promise<void> {
  const res = await fetch(`${agentUrl}/api/admin/admins/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  await handle(res);
}

// ─── Staking ─────────────────────────────────────────────────────────────

export interface StakingStatus {
  stakeAmount: string;
  challengeDuration: string;
  requiredCheckins: string;
  rewardAmount: string;
  totalStaked: string;
  rewardPoolBalance: string;
  freeRewardPool: string;
  reservedRewards: string;
  relayerPaused: boolean;
  relayerAddress: string;
  relayerCeloBalance: string;
  relayerUsdmBalance: string;
  isOwner: boolean;
}

export async function fetchStakingStatus(token: string): Promise<StakingStatus> {
  const res = await fetch(`${agentUrl}/api/admin/staking/status`, { headers: authHeaders(token) });
  return handle(res);
}

export async function setStakingPaused(token: string, paused: boolean): Promise<void> {
  const res = await fetch(`${agentUrl}/api/admin/staking/pause`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify({ paused }),
  });
  await handle(res);
}

export async function fundStakingRewardPool(token: string, amountWei: string): Promise<void> {
  const res = await fetch(`${agentUrl}/api/admin/staking/fund-pool`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify({ amountWei }),
  });
  await handle(res);
}

export async function withdrawStakingExcess(token: string, amountWei: string): Promise<void> {
  const res = await fetch(`${agentUrl}/api/admin/staking/withdraw-excess`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify({ amountWei }),
  });
  await handle(res);
}

export async function setStakingParams(token: string, params: {
  stakeAmountWei: string; challengeDuration: string; requiredCheckins: string; rewardAmountWei: string;
}): Promise<void> {
  const res = await fetch(`${agentUrl}/api/admin/staking/set-params`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(params),
  });
  await handle(res);
}

// ─── Letters ─────────────────────────────────────────────────────────────

export interface FailedLetter {
  id: string;
  recipient_email: string;
  sender_name: string;
  status: string;
  attempts: number;
  release_date: string;
  created_at: string;
}

export interface LetterStats {
  counts: { pending: number; processing: number; sent: number; failed: number };
  failed: FailedLetter[];
}

export async function fetchLetterStats(token: string): Promise<LetterStats> {
  const res = await fetch(`${agentUrl}/api/admin/letters/stats`, { headers: authHeaders(token) });
  return handle(res);
}

export async function retryAllFailedLetters(token: string): Promise<{ retried: number }> {
  const res = await fetch(`${agentUrl}/api/admin/letters/retry-all-failed`, {
    method: 'POST', headers: authHeaders(token),
  });
  return handle(res);
}

// ─── Story Moderation ────────────────────────────────────────────────────

export interface AdminStory {
  id: string;
  challenge_id: string;
  user_id: string;
  title: string;
  content: string;
  vote_count: number;
  status: 'published' | 'hidden';
  created_at: string;
  author_username?: string;
}

export async function fetchChallengeSubmissions(token: string, challengeId: string): Promise<AdminStory[]> {
  const res = await fetch(`${agentUrl}/api/admin/stories/challenges/${challengeId}/submissions`, { headers: authHeaders(token) });
  const body = await handle<{ stories: AdminStory[] }>(res);
  return body.stories;
}

export async function moderateStory(token: string, storyId: string, status: 'published' | 'hidden'): Promise<void> {
  const res = await fetch(`${agentUrl}/api/admin/stories/${storyId}/moderate`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify({ status }),
  });
  await handle(res);
}

// ─── Platform Overview ───────────────────────────────────────────────────

export interface PlatformOverview {
  profileCount: number;
  entryCount: number;
  storyCount: number;
}

export async function fetchOverview(token: string): Promise<PlatformOverview> {
  const res = await fetch(`${agentUrl}/api/admin/overview`, { headers: authHeaders(token) });
  return handle(res);
}
// Support monitoring
export interface SupportConversation { id:string; user_id:string|null; visitor_id:string; name:string|null; email:string; status:'open'|'ticketed'|'closed'; page_url:string|null; created_at:string; updated_at:string }
export interface SupportMessage { id:number; conversation_id:string; role:'user'|'assistant'|'system'; content:string; created_at:string; attachment_path:string|null; attachment_mime:string|null; attachment_name:string|null; attachment_ai_consent:boolean; attachment_url:string|null }
export interface SupportTicket { id:string; conversation_id:string; user_id:string|null; name:string|null; email:string; subject:string; summary:string; status:'open'|'in_progress'|'resolved'|'closed'; priority:'low'|'normal'|'high'|'urgent'; created_at:string; updated_at:string }
export async function fetchSupportDashboard(token:string):Promise<{conversations:SupportConversation[];tickets:SupportTicket[]}>{const res=await fetch(`${agentUrl}/api/admin/support`,{headers:authHeaders(token)});return handle(res)}
export async function fetchSupportMessages(token:string,conversationId:string):Promise<SupportMessage[]>{const res=await fetch(`${agentUrl}/api/admin/support/conversations/${conversationId}/messages`,{headers:authHeaders(token)});const body=await handle<{messages:SupportMessage[]}>(res);return body.messages}
export async function updateSupportTicket(token:string,ticketId:string,status:SupportTicket['status']):Promise<void>{const res=await fetch(`${agentUrl}/api/admin/support/tickets/${ticketId}`,{method:'PATCH',headers:authHeaders(token),body:JSON.stringify({status})});await handle(res)}
