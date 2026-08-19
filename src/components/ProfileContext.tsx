'use client';

import { createContext, useContext, useState } from 'react';

type Profile = 'sameer' | 'snehal' | 'soham' | 'combined';

interface ProfileContextType {
    profile: Profile;
    setProfile: (p: Profile) => void;
}

const ProfileContext = createContext<ProfileContextType>({
    profile: 'combined',
    setProfile: () => { },
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<Profile>('combined');
    return (
        <ProfileContext.Provider value={{ profile, setProfile }}>
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfile() {
    return useContext(ProfileContext);
}
