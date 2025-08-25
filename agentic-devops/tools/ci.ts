import axios from 'axios';

export type CiRunParams = {
  pipeline: 'test' | 'build' | 'sast' | 'dast' | 'sbom';
  ref: string;
  repo: string; // owner/repo
};

export async function run(
  params: CiRunParams,
): Promise<{ ok: boolean; url?: string; summary?: string }> {
  const token = process.env.GITHUB_TOKEN;
  const workflowFile = process.env.GH_WORKFLOW_FILE || 'ci.yml';
  const isPlaceholder = !token || /your_token/i.test(token);

  if (!token || isPlaceholder) {
    const url = `https://github.com/${params.repo}/actions?query=branch%3A${encodeURIComponent(
      params.ref,
    )}`;
    return { ok: true, url, summary: `Simulated ${params.pipeline} on ${params.ref}` };
  }

  const [owner, repo] = params.repo.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`;
  try {
    await axios.post(
      url,
      {
        ref: params.ref,
        inputs: { pipeline: params.pipeline },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'agentic-devops',
        },
      },
    );
    const runUrl = `https://github.com/${owner}/${repo}/actions?query=branch%3A${encodeURIComponent(
      params.ref,
    )}`;
    return { ok: true, url: runUrl, summary: `Triggered ${workflowFile} on ${params.ref}` };
  } catch {
    return { ok: false };
  }
}
