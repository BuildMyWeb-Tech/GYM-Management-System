// app/store/layout.jsx
import StoreLayout from '@/components/store/StoreLayout';

export const metadata = {
  title: 'GymDesk. - Gym Dashboard',
  description: 'GymDesk. - Gym Dashboard',
};

// No more SignedIn/SignedOut split.
// StoreLayout handles BOTH Clerk owners AND employee JWT internally.
export default function RootStoreLayout({ children }) {
  return <StoreLayout>{children}</StoreLayout>;
}
