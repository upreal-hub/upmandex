export type PersonUserOption = {
  id: string;
  twitchLogin: string;
  displayName: string;
  avatar: string | null;
};

export type ManagedPerson = {
  id: string;
  displayName: string;
  userId: string | null;
  isPublic: boolean;
  user: PersonUserOption | null;
  createdUpmansCount: number;
  representedUpmansCount: number;
};
