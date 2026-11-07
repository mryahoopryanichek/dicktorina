// Своя точка входа Remotion для хуков: npx remotion render src/hooks/entry.ts HooksPreview out/hooks/hooks-preview.mp4
import {registerRoot} from 'remotion';
import {HooksRoot} from './HooksRoot';

registerRoot(HooksRoot);
