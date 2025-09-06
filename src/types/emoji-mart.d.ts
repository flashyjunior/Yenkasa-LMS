declare module 'emoji-mart' {
  import * as React from 'react';
  export const Picker: React.FC<{ onEmojiSelect: (emoji: any) => void }>;
}