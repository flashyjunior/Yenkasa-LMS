declare module 'html-to-draftjs' {
  import { ContentBlock, DraftEntityMap } from 'draft-js';
  export default function htmlToDraft(
    html: string
  ): { contentBlocks: ContentBlock[]; entityMap: DraftEntityMap };
}