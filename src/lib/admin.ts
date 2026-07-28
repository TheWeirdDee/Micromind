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
