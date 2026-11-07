import React, { createContext, useContext, useState } from 'react';
import { MoodType } from '../types/index.js';

interface MoodContextType {
  currentMood: MoodType;
  setMood: (mood: MoodType) => void;
}

const MoodContext = createContext<MoodContextType | undefined>(undefined);

export const MoodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentMood, setMood] = useState<MoodType>('for_you');

  return (
    <MoodContext.Provider value={{ currentMood, setMood }}>
      {children}
    </MoodContext.Provider>
  );
};

export const useMood = () => {
  const context = useContext(MoodContext);
  if (!context) throw new Error('useMood must be used within a MoodProvider');
  return context;
};
