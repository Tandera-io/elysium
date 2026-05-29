import type { JSX } from 'react';

export interface DialogueChoice {
  label: string;
  next: string | null;
}

export interface DialogueNode {
  id: string;
  text: string;
  mood: string;
  choices: DialogueChoice[];
}

export declare const DORINHA_DIALOGUE_TREE: Record<string, DialogueNode>;

export declare function getEntryNode(activity: string): string;

export declare function DorinhaDialogueBox(): JSX.Element | null;
