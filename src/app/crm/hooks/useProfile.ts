import { useCrmAuth } from "../CrmAuthContext";

export function useProfile() {
  const { profile, profileLoading, refreshProfile } = useCrmAuth();
  return { profile, loading: profileLoading, refreshProfile };
}
