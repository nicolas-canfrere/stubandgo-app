// Run by `make e2e` before Playwright: fails fast, with a clear message, when a stack is down.
// Plain Node (type stripping): imports need their `.ts` extension.
import { API_URL, DEMO_EVENT, FRONT_URL, MAILPIT_URL } from './stack.ts';

const START_API =
  "lancez la stack de l'API et `app:demo:load` (dans ../stubandgo : make up, " +
  'docker compose exec php bin/console doctrine:migrations:migrate -n, ' +
  'docker compose exec php bin/console app:demo:load)';

async function fetchOrNull(url: string): Promise<Response | null> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(5000) });
  } catch {
    return null;
  }
}

async function problems(): Promise<string[]> {
  const health = await fetchOrNull(`${API_URL}/health`);
  if (health === null || !health.ok) {
    return [`${API_URL}/health ne répond pas 200 : ${START_API}.`];
  }

  const found: string[] = [];
  const events = await fetchOrNull(`${API_URL}/api/events`);
  const titles: unknown = events?.ok ? await events.json() : null;
  if (!Array.isArray(titles) || !titles.some((event) => event?.title === DEMO_EVENT)) {
    found.push(`GET ${API_URL}/api/events ne contient pas « ${DEMO_EVENT} » : ${START_API}.`);
  }
  if ((await fetchOrNull(`${MAILPIT_URL}/api/v1/messages`))?.ok !== true) {
    found.push(`Mailpit ne répond pas sur ${MAILPIT_URL} : ${START_API}.`);
  }
  if ((await fetchOrNull(FRONT_URL))?.ok !== true) {
    found.push(`Le front ne répond pas sur ${FRONT_URL} : lancez-le avec make up.`);
  }

  return found;
}

const found = await problems();
for (const problem of found) {
  console.error(problem);
}
process.exitCode = found.length === 0 ? 0 : 1;
