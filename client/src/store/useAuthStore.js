import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      
      // Set user data
      setUser: (userData) => {
        set({
          user: {
            id: userData.sub || userData.id,
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
            email_verified: userData.email_verified,
            ...userData
          },
          isAuthenticated: true
        });
      },
      
      // Clear user data (logout)
      clearUser: () => {
        set({
          user: null,
          isAuthenticated: false
        });
      },
      
      // Get current user
      getUser: () => get().user,
      
      // Check if user is authenticated
      isAuth: () => get().isAuthenticated,
      
      // Update specific user fields
      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              ...updates
            }
          });
        }
      }
    }),
    {
      name: "auth-store", // localStorage key
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
