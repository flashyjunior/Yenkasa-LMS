declare module 'react-draft-wysiwyg' {
  import * as React from 'react';
  import { EditorState } from 'draft-js';
  export interface EditorProps {
    editorState: EditorState;
    onEditorStateChange: (editorState: EditorState) => void;
    toolbar?: any;
    editorStyle?: React.CSSProperties;
    placeholder?: string;
    [key: string]: any;
  }
  export class Editor extends React.Component<EditorProps> {}
  export default Editor;
}