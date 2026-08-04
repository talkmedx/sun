import { redirect } from 'next/navigation';

/** Default entry — auth shell will send staff to /expenses */
export default function Home() {
  redirect('/dashboard');
}
