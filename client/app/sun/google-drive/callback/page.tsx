import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function queryString(params: SearchParams) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      if (value[0]) qs.set(key, value[0]);
    } else if (typeof value === 'string') {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  return query ? `?${query}` : '';
}

export default async function GoogleDriveCallbackPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  redirect(`/api/v1/settings/google-drive/callback${queryString(params)}`);
}
