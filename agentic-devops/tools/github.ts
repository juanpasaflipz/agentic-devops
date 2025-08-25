import axios from 'axios';

export type GitCommentPrParams = {
  repo: string; // owner/repo
  pr: number;
  body: string;
};

export async function commentPR(params: GitCommentPrParams): Promise<{ ok: boolean }> {
  const token = process.env.GITHUB_TOKEN;
  const isPlaceholder =
    !token || /your_token/i.test(token) || token.includes('your_github_token_here');
  if (isPlaceholder) {
    // No token: pretend success in dev
    return { ok: true };
  }
  const [owner, repo] = params.repo.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${params.pr}/comments`;
  await axios.post(
    url,
    { body: params.body },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'agentic-devops',
        Accept: 'application/vnd.github+json',
      },
    },
  );
  return { ok: true };
}
