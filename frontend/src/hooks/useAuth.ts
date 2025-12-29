import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/types/whiteboard';
import { saveUser, loadUser, clearUser } from '@/lib/db';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser().then((savedUser) => {
      if (savedUser) {
        setUser(savedUser);
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, name: string) => {
    const newUser: User = {
      id: uuidv4(),
      email,
      name,
    };
    await saveUser(newUser);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    await clearUser();
    setUser(null);
  }, []);

  return {
    user,
    isLoading,
    isLoggedIn: !!user,
    login,
    logout,
  };
}
